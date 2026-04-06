// backend/src/controllers/authController.js
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const Sesion  = require("../models/Sesion");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. ── TU ACCESO TEMPORAL PARA COCINA ──
    if (email === "cocina@mesasmart.com" && password === "cocina123") {
      const token = jwt.sign(
        { id: "temp-kitchen", role: "kitchen" },
        process.env.JWT_SECRET || "temp_secret",
        { expiresIn: "8h" }
      );
      return res.json({ token, role: "kitchen" });
    }

    // 2. ── LÓGICA DE TUS COMPAÑEROS (Base de Datos) ──
    // Usamos findByEmail como lo tienen ellos
    const usuario = await User.findByEmail(email); 
    if (!usuario) return res.status(401).json({ msg: "Credenciales incorrectas." });

    const valida = await bcrypt.compare(password, usuario.password);
    if (!valida) return res.status(401).json({ msg: "Credenciales incorrectas." });

    // Registro de sesión (IP y User-Agent)
    const ip  = req.headers["x-forwarded-for"] || req.ip || "desconocida";
    const jti = await Sesion.crear({
      usuario_id: usuario.id,
      ip,
      dispositivo: req.headers["user-agent"],
    });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, jti },
      process.env.JWT_SECRET || "temp_secret",
      { expiresIn: "8h" }
    );

    // Respuesta completa con datos de usuario
    return res.json({
      ok: true,
      token,
      role: usuario.rol, // Para tu frontend de cocina
      usuario: { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        correo: usuario.correo, 
        rol: usuario.rol, 
        numero: usuario.numero 
      },
    });

  } catch (error) {
    console.error("[login error]", error);
    return res.status(500).json({ msg: "Error interno del servidor." });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.usuario?.jti) await Sesion.cerrar(req.usuario.jti);
    res.json({ ok: true, msg: "Sesión cerrada." });
  } catch (err) {
    console.error("[logout error]", err);
    res.status(500).json({ msg: "Error al cerrar sesión." });
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await User.findById(req.usuario.id);
    if (!usuario) return res.status(404).json({ msg: "Usuario no encontrado." });
    res.json({ ok: true, usuario });
  } catch (err) {
    console.error("[me error]", err);
    res.status(500).json({ msg: "Error interno." });
  }
};