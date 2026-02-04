// apps/api/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middlewares/auth');
const prisma = new PrismaClient();

const router = express.Router();

/* ---------- Helpers ---------- */
function isValidEmail(email = '') {
  return typeof email === 'string' && /\S+@\S+\.\S+/.test(email);
}
function isStrongPassword(pwd = '') {
  // Mínimo 10 caracteres, 1 mayúscula, 1 minúscula, 1 número
  return typeof pwd === 'string'
    && pwd.length >= 10
    && /[A-Z]/.test(pwd)
    && /[a-z]/.test(pwd)
    && /\d/.test(pwd);
}
function normEmail(e = '') {
  return String(e || '').trim().toLowerCase();
}

/* ---------- Registro (solo estudiantes) ---------- */
router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, cedula, email, password, facultad } = req.body || {};

    // Validaciones básicas
    if (!nombre || !apellido || !cedula || !email || !password || !facultad) {
      return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Email inválido' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        ok: false,
        error: 'Contraseña débil (min 10, mayúscula, minúscula y número)'
      });
    }

    const emailN = normEmail(email);
    const cedulaN = String(cedula).trim();

    // Unicidad (email y cédula)
    const conflict = await prisma.user.findFirst({
      where: { OR: [{ email: emailN }, { cedula: cedulaN }] },
      select: { id: true, email: true, cedula: true }
    });
    if (conflict) {
      return res.status(409).json({ ok: false, error: 'Email o cédula ya registrados' });
    }

    // Hash de contraseña
    const passwordHash = await bcrypt.hash(String(password), 10);

    // Crear usuario estudiante
    const user = await prisma.user.create({
      data: {
        nombre: String(nombre).trim(),
        apellido: String(apellido).trim(),
        cedula: cedulaN,
        facultad: String(facultad).trim(),
        email: emailN,
        passwordHash,
        rol: 'estudiante',
        twoFactorEnabled: false
      },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, cedula: true, facultad: true }
    });

    req.session.userId = user.id; // auto-login

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ ok: false, error: 'Error en servidor' });
  }
});

/* ---------- Login (email O cédula) ---------- */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    const pwd = String(password || '');

    if (!identifier || !pwd) {
      return res.status(400).json({ ok: false, error: 'Faltan credenciales' });
    }

    const identifierClean = String(identifier).trim();

    // Detectar si es email o cédula
    const isEmail = isValidEmail(identifierClean);
    const searchCondition = isEmail
      ? { email: normEmail(identifierClean) }
      : { cedula: identifierClean };

    const user = await prisma.user.findUnique({ where: searchCondition });
    
    if (!user || !user.passwordHash) {
      return res.status(400).json({ ok: false, error: 'Credenciales inválidas' });
    }

    // ¿Bloqueado por intentos?
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({
        ok: false,
        error: `Cuenta bloqueada hasta ${user.lockedUntil.toLocaleTimeString()}`
      });
    }

    // Verificar contraseña
    const valid = await bcrypt.compare(pwd, user.passwordHash);
    if (!valid) {
      const fails = user.failedLoginCount + 1;
      const updateData = { failedLoginCount: fails };
      if (fails >= 5) updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return res.status(400).json({ ok: false, error: 'Credenciales inválidas' });
    }

    // Reset fallos y marcar login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
    });

    // Guardar sesión
    req.session.userId = user.id;

    res.json({
      ok: true,
      message: 'Login exitoso',
      user: { 
        id: user.id, 
        rol: user.rol, 
        email: user.email, 
        nombre: user.nombre, 
        apellido: user.apellido, 
        cedula: user.cedula, 
        facultad: user.facultad,
        departamentoId: user.departamentoId
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ ok: false, error: 'Error en servidor' });
  }
});

/* ---------- Sesión actual ---------- */
router.get('/me', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({ ok: true, user: null });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { 
        id: true, 
        nombre: true, 
        apellido: true, 
        email: true, 
        rol: true, 
        cedula: true, 
        facultad: true,
        departamentoId: true,
        mustChangePassword: true
      }
    });
    res.json({ ok: true, user });
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ ok: false, error: 'Error en servidor' });
  }
});

/* ---------- Logout ---------- */
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true, message: 'Sesión cerrada' }));
});

/* ---------- Cambiar contraseña ---------- */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: 'Faltan campos requeridos' });
    }

    // Validar contraseña nueva
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        ok: false,
        error: 'Contraseña débil (min 10, mayúscula, minúscula y número)'
      });
    }

    // Obtener usuario actual
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, passwordHash: true }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ ok: false, error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false
      }
    });

    res.json({ ok: true, message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    console.error('Error en cambio de contraseña:', err);
    res.status(500).json({ ok: false, error: 'Error en servidor' });
  }
});

module.exports = router;