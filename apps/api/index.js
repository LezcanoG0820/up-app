const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 4000;

// Middleware para JSON
app.use(express.json());

// Configuración de sesión
app.use(session({
  secret: 'supersecreto-pon-un-valor-fuerte', // cámbialo en producción
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

// Middleware: cargar usuario en req.sessionUser si existe sesión
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
app.get('/ping', (req, res) => res.send('pong'));

app.get('/db-check', async (req, res) => {
  const count = await prisma.department.count();
  res.json({ ok: true, departments: count });
});

// Rutas de auth
app.use('/auth', authRoutes);

// Rutas de tickets
app.use('/api', ticketRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
