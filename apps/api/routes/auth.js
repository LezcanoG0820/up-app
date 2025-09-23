const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ ok: false, error: 'Credenciales inválidas' });

    // Verificar bloqueo
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({
        ok: false,
        error: `Cuenta bloqueada hasta ${user.lockedUntil.toLocaleTimeString()}`
      });
    }

    // Verificar contraseña
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const fails = user.failedLoginCount + 1;
      const updateData = { failedLoginCount: fails };

      if (fails >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      return res.status(400).json({ ok: false, error: 'Credenciales inválidas' });
    }

    // Resetear contador
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    // Guardar sesión
    req.session.userId = user.id;
    res.json({ ok: true, message: 'Login exitoso', user: { id: user.id, rol: user.rol, email: user.email } });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ ok: false, error: 'Error en servidor' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Sesión cerrada' });
  });
});

module.exports = router;
