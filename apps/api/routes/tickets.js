// apps/api/routes/tickets.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middlewares/auth');

const prisma = new PrismaClient();
const router = express.Router();

/* ============== helpers ============== */
function generateToken() {
  const now = new Date();
  const y = now.getFullYear();
  const seq = Math.floor(Math.random() * 1_000_000);
  return `SIU-${y}-${String(seq).padStart(6, '0')}`;
}
async function addTicketLog({ ticketId, action, byUserId, details }) {
  try {
    return await prisma.ticketLog.create({
      data: {
        ticketId,
        action,
        byUserId: byUserId ?? null,
        details: details ? String(details) : null,
      }
    });
  } catch (e) {
    console.error('addTicketLog error:', e);
  }
}

/* ============== endpoints ============== */

// Tipos de ticket (para select del formulario)
router.get('/ticket-types', requireAuth, async (_req, res) => {
  const tipos = await prisma.ticketType.findMany({
    select: { id: true, nombre: true, departmentId: true },
    orderBy: { nombre: 'asc' }
  });
  res.json({ ok: true, tipos });
});

// Crear ticket (estudiante)
router.post('/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const {
      tipoId,
      asunto,
      descripcion,
      cru,
      categoriaConsulta,   // nombre preferido
      categoriaQueja       // compatibilidad
    } = req.body || {};

    if (!tipoId || !asunto || !descripcion) {
      return res.status(400).json({ ok: false, error: 'Faltan campos' });
    }

    const tipo = await prisma.ticketType.findUnique({ where: { id: Number(tipoId) } });
    if (!tipo) return res.status(400).json({ ok: false, error: 'Tipo inválido' });

    const token = generateToken();
    const category = categoriaConsulta ?? categoriaQueja ?? null;

    const ticket = await prisma.ticket.create({
      data: {
        token,
        estudianteId: req.sessionUser.id,
        departamentoActualId: tipo.departmentId,
        tipoId: tipo.id,
        asunto: String(asunto),
        descripcion: String(descripcion),
        cru: cru ? String(cru) : null,
        categoriaQueja: category ? String(category) : null
      },
      include: {
        tipo: true,
        departamentoActual: true
      }
    });

    await addTicketLog({
      ticketId: ticket.id,
      action: 'created',
      byUserId: req.sessionUser.id,
      details: `Ticket creado por estudiante`
    });

    res.json({ ok: true, ticket: { ...ticket, categoriaConsulta: ticket.categoriaQueja } });
  } catch (err) {
    console.error('Error creando ticket:', err);
    res.status(500).json({ ok: false, error: 'Error al crear ticket' });
  }
});

// Mis tickets (estudiante)
router.get('/my/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
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
      categoriaQueja: true,
      tipo: { select: { nombre: true } },
      departamentoActual: { select: { nombre: true } }
    }
  });

  const tickets = rows.map(t => ({ ...t, categoriaConsulta: t.categoriaQueja }));
  res.json({ ok: true, tickets });
});

// === Detalle de MI ticket (estudiante) ===
router.get('/my/tickets/:id', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const t = await prisma.ticket.findFirst({
      where: { id, estudianteId: req.sessionUser.id }, // solo si me pertenece
      include: {
        tipo: true,
        departamentoActual: true,
        estudiante: { select: { id: true, nombre: true, apellido: true, email: true, cedula: true, facultad: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { autor: { select: { id: true, nombre: true, apellido: true, rol: true } } }
        },
        // El historial está en AuditLog; lo devolvemos de forma básica y legible
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, nombre: true, apellido: true, rol: true, email: true } } }
        }
      }
    });

    if (!t) return res.status(404).json({ ok: false, error: 'No existe o no te pertenece' });

    res.json({ ok: true, ticket: t });
  } catch (err) {
    console.error('GET /my/tickets/:id error:', err);
    res.status(500).json({ ok: false, error: 'Error obteniendo ticket' });
  }
});

module.exports = router;
