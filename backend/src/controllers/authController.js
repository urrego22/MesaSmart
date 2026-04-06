const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ── MOVIDO AQUÍ DENTRO: Usuario temporal para desarrollo ──
    if (email === "cocina@mesasmart.com" && password === "cocina123") {
      const token = jwt.sign(
        { id: "temp-kitchen", role: "kitchen" },
        process.env.JWT_SECRET || "temp_secret",
        { expiresIn: "8h" }
      );
      return res.json({ token, role: "kitchen" });
    }
    // ─────────────────────────────────────────────────────────

    // Si no es el usuario temporal, buscamos en la base de datos
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Usuario no existe" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ msg: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({ token, role: user.role });

  } catch (error) {
    console.error(error); // Es buena práctica ver el error real en la consola
    res.status(500).json({ msg: "Error del servidor" });
  }
};