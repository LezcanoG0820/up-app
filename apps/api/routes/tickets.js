// apps/api/routes/tickets.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { createNotification } = require('../utils/notifications');

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
    // Tu modelo real es AuditLog + AuditAction
    // action debe ser uno de: 'CREATE_TICKET', 'ADD_REPLY', 'REASSIGN', 'COMPLETE', 'UPDATE_TICKET', etc.
    return await prisma.auditLog.create({
      data: {
        ticketId,
        actorId: byUserId ?? null,
        action,
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
  try {
    const tipos = await prisma.ticketType.findMany({
      select: { id: true, nombre: true, departmentId: true },
      orderBy: { nombre: 'asc' }
    });
    res.json({ ok: true, tipos });
  } catch (err) {
    console.error('GET /ticket-types error:', err);
    res.status(500).json({ ok: false, error: 'Error obteniendo tipos de ticket' });
  }
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

    const tipo = await prisma.ticketType.findUnique({
      where: { id: Number(tipoId) }
    });
    if (!tipo) {
      return res.status(400).json({ ok: false, error: 'Tipo inválido' });
    }

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
      action: 'CREATE_TICKET',
      byUserId: req.sessionUser.id,
      details: 'Ticket creado por estudiante'
    });

    // Notificación cuando el estudiante crea un ticket
    await createNotification(prisma, {
      type: 'TICKET_CREATED',
      message: `Ticket ${ticket.token} creado`,
      ticketId: ticket.id,
      actorId: req.sessionUser.id,
      departmentId: ticket.departamentoActualId,
      audience: 'ALL'
    });

    res.json({
      ok: true,
      ticket: {
        ...ticket,
        categoriaConsulta: ticket.categoriaQueja
      }
    });
  } catch (err) {
    console.error('POST /tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error al crear ticket' });
  }
});

// Crear ticket por recepción/admin en nombre de un estudiante
router.post(
  '/tickets/by-reception',
  requireAuth,
  requireRole('recepcion', 'admin'),
  async (req, res) => {
    try {
      const {
        studentId,
        tipoId,
        asunto,
        descripcion,
        cru,
        categoriaConsulta,
        categoriaQueja
      } = req.body || {};

      if (!studentId || !tipoId || !asunto || !descripcion) {
        return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
      }

      const estudiante = await prisma.user.findUnique({
        where: { id: Number(studentId) }
      });

      if (!estudiante || estudiante.rol !== 'estudiante') {
        return res.status(400).json({ ok: false, error: 'Estudiante inválido' });
      }

      const tipo = await prisma.ticketType.findUnique({
        where: { id: Number(tipoId) }
      });
      if (!tipo) {
        return res.status(400).json({ ok: false, error: 'Tipo de ticket inválido' });
      }

      const token = generateToken();
      const category = categoriaConsulta ?? categoriaQueja ?? null;

      const ticket = await prisma.ticket.create({
        data: {
          token,
          estudianteId: estudiante.id,
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
        action: 'CREATE_TICKET',
        byUserId: req.sessionUser.id,
        details: `Ticket creado por recepción/admin en nombre del estudiante ${estudiante.cedula}`
      });

      // Notificación cuando recepción o admin crean ticket
      await createNotification(prisma, {
        type: 'TICKET_CREATED',
        message: `Ticket ${ticket.token} creado para ${estudiante.nombre} ${estudiante.apellido}`,
        ticketId: ticket.id,
        actorId: req.sessionUser.id,
        departmentId: ticket.departamentoActualId,
        audience: 'ALL'
      });

      res.json({
        ok: true,
        ticket: {
          ...ticket,
          categoriaConsulta: ticket.categoriaQueja
        }
      });
    } catch (err) {
      console.error('POST /tickets/by-reception error:', err);
      res.status(500).json({ ok: false, error: 'Error al crear ticket desde recepción' });
    }
  }
);

// Mis tickets (estudiante)
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
        categoriaQueja: true,
        tipo: { select: { nombre: true } },
        departamentoActual: { select: { nombre: true } }
      }
    });

    const tickets = rows.map(t => ({
      ...t,
      categoriaConsulta: t.categoriaQueja
    }));

    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('GET /my/tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets del estudiante' });
  }
});

// Detalle de MI ticket (estudiante)
router.get('/my/tickets/:id', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const t = await prisma.ticket.findFirst({
      where: {
        id,
        estudianteId: req.sessionUser.id
      },
      include: {
        tipo: true,
        departamentoActual: true,
        estudiante: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            cedula: true,
            facultad: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            autor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                rol: true
              }
            }
          }
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                rol: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!t) {
      return res.status(404).json({ ok: false, error: 'No existe o no te pertenece' });
    }

    res.json({ ok: true, ticket: t });
  } catch (err) {
    console.error('GET /my/tickets/:id error:', err);
    res.status(500).json({ ok: false, error: 'Error obteniendo ticket' });
  }
});

// Responder (texto enriquecido simple HTML) para recepción/departamento/admin
router.post(
  '/tickets/:id/messages',
  requireAuth,
  requireRole('recepcion', 'departamento', 'admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { contenidoHtml } = req.body || {};

      if (!contenidoHtml) {
        return res.status(400).json({ ok: false, error: 'Falta contenidoHtml' });
      }

      const t = await prisma.ticket.findUnique({
        where: { id }
      });
      if (!t) {
        return res.status(404).json({ ok: false, error: 'Ticket no existe' });
      }

      await prisma.ticketMessage.create({
        data: {
          ticketId: id,
          autorUserId: req.sessionUser.id,
          contenidoHtml: String(contenidoHtml)
        }
      });

      await addTicketLog({
        ticketId: id,
        action: 'ADD_REPLY',
        byUserId: req.sessionUser.id,
        details: 'Respuesta agregada'
      });

      // Notificación de respuesta
      await createNotification(prisma, {
        type: 'TICKET_REPLIED',
        message: `Nueva respuesta en ${t.token}`,
        ticketId: t.id,
        actorId: req.sessionUser.id,
        departmentId: t.departamentoActualId,
        audience: 'ALL'
      });

      res.json({ ok: true });
    } catch (err) {
      console.error('POST /tickets/:id/messages error:', err);
      res.status(500).json({ ok: false, error: 'Error respondiendo' });
    }
  }
);

module.exports = router;
