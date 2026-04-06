const express = require("express");
const cors = require("cors");
require("./config/mysqlDb"); // Tu conexión con prefijos cocina_
const db = require("./config/db"); // Conexión que usan tus compañeros

// ── IMPORTACIÓN DE RUTAS (Sin duplicados) ──────────────────────────────────
const authRoutes    = require("./routes/authRoutes");
const userRoutes    = require("./routes/admin/userRoutes");
const mesaRoutes    = require("./routes/admin/mesaRoutes");
const pedidoRoutes  = require("./routes/admin/pedidoRoutes");
const cajaRoutes    = require("./routes/admin/cajaRoutes");
const metricaRoutes = require("./routes/admin/metricaRoutes");
const egresoRoutes  = require("./routes/admin/egresoRoutes");
const sesionRoutes  = require("./routes/admin/sesionRoutes");

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ── RUTAS DE LA API ────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/mesas",    mesaRoutes);
app.use("/api/pedidos",  pedidoRoutes);
app.use("/api/caja",     cajaRoutes);
app.use("/api/metricas", metricaRoutes);
app.use("/api/egresos",  egresoRoutes);
app.use("/api/sesiones", sesionRoutes);

// ── ENDPOINTS DIRECTOS (Menú y Quejas) ─────────────────────────────────────

// GET /api/menu - Catálogo para el cliente
app.get("/api/menu", async (req, res) => {
  try {
    const [productos] = await db.promise().query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.imagen, p.tiene_termino,
             c.nombre AS categoria, sc.nombre AS subcategoria
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN subcategorias sc ON sc.id = p.subcategoria_id
      ORDER BY c.nombre, p.nombre
    `);

    if (!productos.length) return res.json([]);
    const ids = productos.map(p => p.id);

    const [opciones] = await db.promise().query(`
      SELECT po.producto_id, o.id, o.nombre, o.tipo, o.precio
      FROM productos_opciones po
      JOIN opciones o ON o.id = po.opcion_id
      WHERE po.producto_id IN (?)
    `, [ids]);

    const opcionesPorProducto = {};
    const adicionesPorProducto = {};

    opciones.forEach(o => {
      if (o.tipo === "acompanamiento") {
        if (!opcionesPorProducto[o.producto_id]) opcionesPorProducto[o.producto_id] = [];
        opcionesPorProducto[o.producto_id].push({ id: o.id, nombre: o.nombre, precio: o.precio });
      } else if (o.tipo === "adiccion") {
        if (!adicionesPorProducto[o.producto_id]) adicionesPorProducto[o.producto_id] = [];
        adicionesPorProducto[o.producto_id].push({ id: o.id, nombre: o.nombre, precio: o.precio });
      }
    });

    const resultado = productos.map(p => ({
      ...p,
      opciones: opcionesPorProducto[p.id] || [],
      adiciones: adicionesPorProducto[p.id] || [],
    }));

    res.json(resultado);
  } catch (err) {
    console.error("Error GET /api/menu:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Rutas de Quejas
app.post("/api/quejas", async (req, res) => {
  const { mesa, mensaje } = req.body;
  if (!mensaje?.trim()) return res.status(400).json({ error: "Mensaje requerido" });
  try {
    await db.promise().query("INSERT INTO quejas (mesa, mensaje) VALUES (?, ?)", [mesa || "Sin mesa", mensaje.trim()]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Error al guardar queja" }); }
});

app.get("/api/quejas", async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM quejas ORDER BY fecha DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: "Error al obtener quejas" }); }
});

// Ping de control
app.get("/api/ping", (_, res) => res.json({ ok: true, msg: "MesaSmart API activa" }));

module.exports = app;