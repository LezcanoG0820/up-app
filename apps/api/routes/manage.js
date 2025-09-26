// apps/api/routes/manage.js
const express = require('express');
const { PrismaClient, Prisma } = require('@prisma/client'); // ← usa Prisma para enums
const { requireAuth, requireRole } = require('../middlewares/auth');

const prisma = new PrismaClient();
const router = express.Router();

/* Campos comunes para listar tickets */
const ticketListSelect = {
  id: true,
  token: true,
  asunto: true,
  descripcion: true,
  estado: true,
  createdAt: true,
  updatedAt: true,
  tipo: { select: { id: true, nombre: true } },
  departamentoActual: { select: { id: true, nombre: true, slug: true } },
  estudiante: { select: { id: true, nombre: true, apellido: true, email: true, cedula: true } }
};

/* 1) RECEPCIÓN/ADMIN: listar TODOS los tickets (filtros opcionales) */
router.get('/admin/tickets', requireAuth, requireRole('recepcion', 'admin'), async (req, res) => {
  try {
    const { estado, q } = req.query;

    const where = {};
    if (estado && Object.values(Prisma.Estado).includes(estado)) where.estado = estado; // ← enum correcto

    if (q) {
      where.OR = [
        { token: { contains: q, mode: 'insensitive' } },
        { asunto: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
        { estudiante: { nombre:   { contains: q, mode: 'insensitive' } } },
        { estudiante: { apellido: { contains: q, mode: 'insensitive' } } },
        { estudiante: { email:    { contains: q, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: ticketListSelect
    });

    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('GET /admin/tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets' });
  }
});

/* 2) DEPARTAMENTO: listar SOLO los tickets asignados a su departamento */
router.get('/dept/tickets', requireAuth, requireRole('departamento', 'admin'), async (req, res) => {
  try {
    if (req.sessionUser.rol !== 'admin' && !req.sessionUser.departamentoId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin departamento' });
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        departamentoActualId:
          req.sessionUser.rol === 'admin' ? undefined : req.sessionUser.departamentoId
      },
      orderBy: { createdAt: 'desc' },
      select: ticketListSelect
    });

    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('GET /dept/tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets del departamento' });
  }
});

/* 3) VER detalle de un ticket */
router.get('/tickets/:id', requireAuth, requireRole('recepcion', 'departamento', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        tipo: true,
        departamentoActual: true,
        estudiante: { select: { id: true, nombre: true, apellido: true, email: true, cedula: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { autor: { select: { id: true, nombre: true, apellido: true, rol: true } } }
        }
      }
    });
    if (!ticket) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });

    if (req.sessionUser.rol === 'departamento' &&
        ticket.departamentoActualId !== req.sessionUser.departamentoId) {
      return res.status(403).json({ ok: false, error: 'Sin permisos para este ticket' });
    }

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error('GET /tickets/:id error:', err);
    res.status(500).json({ ok: false, error: 'Error obteniendo ticket' });
  }
});

/* 4) RESPONDER ticket (mensaje) */
router.post('/tickets/:id/messages', requireAuth, requireRole('recepcion', 'departamento', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { contenidoHtml } = req.body || {};

    if (!contenidoHtml) return res.status(400).json({ ok: false, error: 'Falta contenidoHtml' });

    const t = await prisma.ticket.findUnique({ where: { id } });
    if (!t) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });

    if (req.sessionUser.rol === 'departamento' && t.departamentoActualId !== req.sessionUser.departamentoId) {
      return res.status(403).json({ ok: false, error: 'Sin permisos para responder este ticket' });
    }

    const msg = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        autorUserId: req.sessionUser.id,
        contenidoHtml: String(contenidoHtml)
      }
    });

    res.json({ ok: true, message: msg });
  } catch (err) {
    console.error('POST /tickets/:id/messages error:', err);
    res.status(500).json({ ok: false, error: 'Error creando mensaje' });
  }
});

/* 5) REASIGNAR ticket a otro departamento (recepción/admin) */
router.post('/tickets/:id/reassign', requireAuth, requireRole('recepcion', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { departmentSlug, departmentId } = req.body || {};

    const dept = departmentId
      ? await prisma.department.findUnique({ where: { id: Number(departmentId) } })
      : await prisma.department.findUnique({ where: { slug: String(departmentSlug) } });

    if (!dept) return res.status(400).json({ ok: false, error: 'Departamento destino inválido' });

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { departamentoActualId: dept.id, estado: 'en_progreso' },
      select: ticketListSelect
    });

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error('POST /tickets/:id/reassign error:', err);
    res.status(500).json({ ok: false, error: 'Error al reasignar ticket' });
  }
});

/* 6) MARCAR COMPLETADO */
router.post('/tickets/:id/complete', requireAuth, requireRole('recepcion', 'departamento', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const t = await prisma.ticket.findUnique({ where: { id } });
    if (!t) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });

    if (req.sessionUser.rol === 'departamento' && t.departamentoActualId !== req.sessionUser.departamentoId) {
      return res.status(403).json({ ok: false, error: 'Sin permisos para completar este ticket' });
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { estado: 'completado' }
    });

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error('POST /tickets/:id/complete error:', err);
    res.status(500).json({ ok: false, error: 'Error al completar ticket' });
  }
});

// Lista estática de CRUs/Extensiones (puedes editarla luego)
const CRUS = [
  { slug: 'cru-colon', nombre: 'C.R.U. de Colón' },
  { slug: 'cru-panama-este', nombre: 'C.R.U. Panamá Este' },
  { slug: 'cru-panama-oeste', nombre: 'C.R.U. Panamá Oeste' },
  { slug: 'cru-san-miguelito', nombre: 'C.R.U. de San Miguelito' },
  { slug: 'cru-azuero', nombre: 'C.R.U. de Azuero' },
  { slug: 'cru-los-santos', nombre: 'C.R.U. de Los Santos' },
  { slug: 'cru-cocle', nombre: 'C.R.U. de Coclé' },
  { slug: 'cru-veraguas', nombre: 'C.R.U. de Veraguas' },
  { slug: 'cru-bocas-del-toro', nombre: 'C.R.U. de Bocas del Toro' },
  { slug: 'cru-darien', nombre: 'C.R.U. de Darién' },
  { slug: 'ext-aguadulce', nombre: 'Ext. de Aguadulce' },
  { slug: 'ext-ocu', nombre: 'Ext. de Ocú' },
  { slug: 'ext-sona', nombre: 'Ext. de Soná' },
  { slug: 'ext-torti', nombre: 'Ext. de Tortí' },
  { slug: 'anexo-guna-yala', nombre: 'Programa anexo Guna Yala' },
];

router.get('/crus', async (_req, res) => {
  res.json({ ok: true, crus: CRUS });
});


module.exports = router;
