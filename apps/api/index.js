// apps/api/index.js
const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const manageRoutes = require('./routes/manage'); // <- corregido

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 4000;

// Middleware para JSON
app.use(express.json());

// Configuración de sesión (antes de montar rutas protegidas)
app.use(session({
  secret: 'supersecreto-pon-un-valor-fuerte', // cámbialo en producción
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

// Cargar usuario de sesión en cada request (antes de rutas)
app.use(async (req, _res, next) => {
  if (req.session?.userId) {
    try {
      req.sessionUser = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });
    } catch (err) {
      console.error('Error cargando usuario de sesión:', err);
    }
  }
  next();
});

// Endpoints básicos
app.get('/ping', (_req, res) => res.send('pong'));
app.get('/db-check', async (_req, res) => {
  const count = await prisma.department.count();
  res.json({ ok: true, departments: count });
});

// Rutas
app.use('/auth', authRoutes);
app.use('/api', ticketRoutes);
app.use('/api', manageRoutes); // <- ahora después de sesión

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
