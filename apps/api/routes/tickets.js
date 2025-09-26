// apps/api/routes/tickets.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middlewares/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Utilidad: generar token legible tipo "SIU-2025-000123"
function generateToken() {
  const now = new Date();
  const y = now.getFullYear();
  const seq = Math.floor(Math.random() * 1000000); // simple por ahora
  return `SIU-${y}-${String(seq).padStart(6, '0')}`;
}

/* =========================================================
   1) Listar tipos de ticket (para popular el <select>)
   ========================================================= */
router.get('/ticket-types', requireAuth, async (_req, res) => {
  const tipos = await prisma.ticketType.findMany({
    select: { id: true, nombre: true, departmentId: true }
  });
  res.json({ ok: true, tipos });
});

/* =========================================================
   2) Crear ticket (estudiante autenticado)
   - Ahora acepta: cru y categoriaConsulta (alias de categoriaQueja)
   ========================================================= */
router.post('/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const {
      tipoId,
      asunto,
      descripcion,
      cru,                    // CRU/Extensión opcional
      categoriaConsulta,      // NUEVO nombre preferido
      categoriaQueja          // compatibilidad (si llega con el nombre antiguo)
    } = req.body || {};

    if (!tipoId || !asunto || !descripcion) {
      return res.status(400).json({ ok: false, error: 'Faltan campos' });
    }

    // Buscar tipo y su departamento asignado
    const tipo = await prisma.ticketType.findUnique({ where: { id: Number(tipoId) } });
    if (!tipo) return res.status(400).json({ ok: false, error: 'Tipo inválido' });

    const token = generateToken();

    // Usamos "categoriaConsulta" como nombre externo,
    // guardamos en BD en el campo existente "categoriaQueja"
    const categoria = categoriaConsulta ?? categoriaQueja ?? null;

    const ticket = await prisma.ticket.create({
      data: {
        token,
        estudianteId: req.sessionUser.id,
        departamentoActualId: tipo.departmentId,
        tipoId: tipo.id,
        asunto: String(asunto),
        descripcion: String(descripcion),
        cru: cru ? String(cru) : null,
        categoriaQueja: categoria ? String(categoria) : null
      },
      include: {
        tipo: true,
        departamentoActual: true
      }
    });

    // Añadimos alias en la respuesta para front-end (“consulta”)
    const respuesta = {
      ...ticket,
      categoriaConsulta: ticket.categoriaQueja
    };

    res.json({ ok: true, ticket: respuesta });
  } catch (err) {
    console.error('Error creando ticket:', err);
    res.status(500).json({ ok: false, error: 'Error al crear ticket' });
  }
});

/* =========================================================
   3) Mis tickets (estudiante)
   - Exponemos cru y categoriaConsulta en la respuesta
   ========================================================= */
router.get('/my/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const rows = await prisma.ticket.findMany({
      where: { estudianteId: req.sessionUser.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        asunto: true,
        estado: true,
        createdAt: true,
        cru: true,
        categoriaQueja: true, // almacenado en BD
        tipo: { select: { nombre: true } },
        departamentoActual: { select: { nombre: true } }
      }
    });

    // Alias de salida: categoriaConsulta
    const tickets = rows.map(t => ({
      ...t,
      categoriaConsulta: t.categoriaQueja
    }));

    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('Error listando mis tickets:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets' });
  }
});

module.exports = router;
