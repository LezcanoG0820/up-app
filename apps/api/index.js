const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 4000;

// Endpoint de prueba simple
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Endpoint para verificar la conexión a la base de datos
app.get('/db-check', async (req, res) => {
  try {
    const count = await prisma.department.count();
    res.json({ ok: true, departments: count });
  } catch (err) {
    console.error('Error en /db-check:', err);
    res.status(500).json({ ok: false, error: 'DB error' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
