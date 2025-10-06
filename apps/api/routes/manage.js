// apps/api/routes/manage.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middlewares/auth');

const prisma = new PrismaClient();
const router = express.Router();

/* ========================
   Helpers
   ======================== */
async function addTicketLog({ ticketId, action, byUserId, details }) {
  // Usa el modelo/relaciones reales del schema: AuditLog + actor
  try {
    return await prisma.auditLog.create({
      data: {
        ticketId,
        actorId: byUserId ?? null,
        action, // 'CREATE_TICKET' | 'ADD_REPLY' | 'REASSIGN' | 'COMPLETE' | 'UPDATE_TICKET'
        details: details ? String(details) : null,
      }
    });
  } catch (e) {
    console.error('addTicketLog error:', e);
  }
}

/* ========================
   Datos estáticos (CRUs)
   ======================== */
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

/* ========================
   Datos estáticos (Facultades)
   ======================== */
const FACULTADES = [
  { slug: 'administracion-publica', nombre: 'Facultad de Administración Pública' },
  { slug: 'ciencias-agropecuarias', nombre: 'Facultad de Ciencias Agropecuarias' },
  { slug: 'arquitectura-diseno', nombre: 'Facultad de Arquitectura y Diseño' },
  { slug: 'ciencias-naturales-exactas-tecnologia', nombre: 'Facultad de Ciencias Naturales, Exactas y Tecnología' },
  { slug: 'derecho-ciencias-politicas', nombre: 'Facultad de Derecho y Ciencias Políticas' },
  { slug: 'humanidades', nombre: 'Facultad de Humanidades' },
  { slug: 'medicina-veterinaria', nombre: 'Facultad de Medicina Veterinaria' },
  { slug: 'medicina', nombre: 'Facultad de Medicina' },
  { slug: 'odontologia', nombre: 'Facultad de Odontología' },
  { slug: 'economia', nombre: 'Facultad de Economía' },
  { slug: 'administracion-empresas-contabilidad', nombre: 'Facultad de Administración de Empresas y Contabilidad' },
  { slug: 'comunicacion-social', nombre: 'Facultad de Comunicación Social' },
  { slug: 'ciencias-educacion', nombre: 'Facultad de Ciencias de la Educación' },
  { slug: 'farmacia', nombre: 'Facultad de Farmacia' },
  { slug: 'enfermeria', nombre: 'Facultad de Enfermería' },
  { slug: 'bellas-artes', nombre: 'Facultad de Bellas Artes' },
  { slug: 'informatica-electronica-comunicacion', nombre: 'Fac. de Informática, Electrónica y Comunicación' },
  { slug: 'psicologia', nombre: 'Facultad de Psicología' },
  { slug: 'ingenieria', nombre: 'Facultad de Ingeniería' },
];

/* ========================
   Endpoints auxiliares (públicos/privados)
   ======================== */

// CRUs para formulario de estudiantes (público)
router.get('/crus', async (_req, res) => res.json({ ok: true, crus: CRUS }));

// Facultades para registro/visualización (público)
router.get('/facultades', async (_req, res) => res.json({ ok: true, facultades: FACULTADES }));

// Listar departamentos (dropdown de reasignación) — requiere sesión
router.get(
  '/departments',
  requireAuth,
  requireRole('recepcion', 'departamento', 'admin'),
  async (_req, res) => {
    try {
      const list = await prisma.department.findMany({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, slug: true }
      });
      res.json({ ok: true, departments: list });
    } catch (err) {
      console.error('GET /departments error:', err);
      res.status(500).json({ ok: false, error: 'Error listando departamentos' });
    }
  }
);

/* ========================
   Bandeja Recepción / Admin
   ======================== */
router.get('/admin/tickets', requireAuth, requireRole('recepcion', 'admin'), async (req, res) => {
  try {
    const { q, estado, date_from, date_to } = req.query;

    // Normalizamos el query
    const qRaw   = typeof q === 'string' ? q.trim() : '';
    const qUpper = qRaw.toUpperCase();

    const where = {
      ...(estado ? { estado } : {}),
      ...(date_from || date_to
        ? {
            createdAt: {
              ...(date_from ? { gte: new Date(date_from) } : {}),
              ...(date_to ? { lte: new Date(date_to + 'T23:59:59') } : {}),
            },
          }
        : {}),
      ...(qRaw
        ? {
            OR: [
              // token: exacto o parcial, tratando el patrón en mayúsculas también (por si guardas SIU-AAAA-XXXXXX)
              { token: { equals: qRaw } },
              { token: { contains: qRaw } },
              { token: { contains: qUpper } },

              // asunto
              { asunto: { contains: qRaw } },

              // estudiante.* (incluye cédula)
              {
                estudiante: {
                  OR: [
                    { nombre:   { contains: qRaw } },
                    { apellido: { contains: qRaw } },
                    { email:    { contains: qRaw } },
                    { cedula:   { equals: qRaw } },
                    { cedula:   { contains: qRaw } },
                    { facultad: { contains: qRaw } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const rows = await prisma.ticket.findMany({
      where,
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
        departamentoActual: { select: { nombre: true, slug: true } },
        estudiante: {
          select: { nombre: true, apellido: true, email: true, cedula: true, facultad: true },
        },
      },
    });

    const tickets = rows.map((t) => ({ ...t, categoriaConsulta: t.categoriaQueja }));
    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('GET /admin/tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets' });
  }
});

/* ========================
   Export CSV (admin/recepción)
   ======================== */
router.get('/admin/tickets/export', requireAuth, requireRole('recepcion', 'admin'), async (req, res) => {
  try {
    const { q, estado, date_from, date_to, nombre, apellido, cedula, facultad } = req.query;

    const qRaw = typeof q === 'string' ? q.trim() : '';

    const where = {
      ...(estado ? { estado } : {}),
      ...(date_from || date_to
        ? {
            createdAt: {
              ...(date_from ? { gte: new Date(date_from) } : {}),
              ...(date_to ? { lte: new Date(date_to + 'T23:59:59') } : {}),
            },
          }
        : {}),
      ...(qRaw
        ? {
            OR: [
              { token:  { equals: qRaw } },
              { token:  { contains: qRaw } },
              { asunto: { contains: qRaw } },
              {
                estudiante: {
                  OR: [
                    { nombre:   { contains: qRaw } },
                    { apellido: { contains: qRaw } },
                    { email:    { contains: qRaw } },
                    { cedula:   { equals: qRaw } },
                    { cedula:   { contains: qRaw } },
                    { facultad: { contains: qRaw } },
                  ],
                },
              },
            ],
          }
        : {}),
      ...(nombre   ? { estudiante: { nombre:   { contains: String(nombre) } } } : {}),
      ...(apellido ? { estudiante: { apellido: { contains: String(apellido) } } } : {}),
      ...(cedula   ? { estudiante: { cedula:   { contains: String(cedula) } } } : {}),
      ...(facultad ? { estudiante: { facultad: { contains: String(facultad) } } } : {}),
    };

    const rows = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        token: true,
        asunto: true,
        estado: true,
        createdAt: true,
        cru: true,
        categoriaQueja: true,
        tipo: { select: { nombre: true } },
        departamentoActual: { select: { nombre: true } },
        estudiante: {
          select: { nombre: true, apellido: true, email: true, cedula: true, facultad: true },
        },
      },
    });

    const header = [
      'Token',
      'Asunto',
      'Estado',
      'Fecha',
      'CRU',
      'CategoriaConsulta',
      'Tipo',
      'Departamento',
      'EstudianteNombre',
      'EstudianteApellido',
      'Cedula',
      'Email',
      'Facultad',
    ];
    const lines = [header.join(',')];

    for (const r of rows) {
      const line = [
        r.token,
        safeCsv(r.asunto),
        r.estado,
        new Date(r.createdAt).toISOString(),
        r.cru || '',
        r.categoriaQueja || '',
        r.tipo?.nombre || '',
        r.departamentoActual?.nombre || '',
        r.estudiante?.nombre || '',
        r.estudiante?.apellido || '',
        r.estudiante?.cedula || '',
        r.estudiante?.email || '',
        r.estudiante?.facultad || '',
      ]
        .map(safeCsv)
        .join(',');
      lines.push(line);
    }

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ ok: false, error: 'Error exportando CSV' });
  }
});
function safeCsv(v) {
  const s = (v ?? '').toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ========================
   Bandeja Departamento (filtro por q = token o cédula)
   ======================== */
router.get('/dept/tickets', requireAuth, requireRole('departamento', 'admin'), async (req, res) => {
  try {
    const deptId = req.sessionUser?.departamentoId;
    if (!deptId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin departamento asignado' });
    }

    const { q } = req.query;
    const qRaw   = typeof q === 'string' ? q.trim() : '';
    const qUpper = qRaw.toUpperCase();

    const where = {
      departamentoActualId: deptId,
      ...(qRaw ? {
        OR: [
          { token: { equals: qRaw } },
          { token: { contains: qRaw } },
          { token: { contains: qUpper } },
          { estudiante: { cedula: { equals: qRaw } } },
          { estudiante: { cedula: { contains: qRaw } } },
        ]
      } : {})
    };

    const rows = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, token: true, asunto: true, estado: true, createdAt: true,
        cru: true, categoriaQueja: true,
        tipo: { select: { nombre: true } },
        estudiante: { select: { nombre: true, apellido: true, email: true, cedula: true, facultad: true } }
      }
    });

    const tickets = rows.map(t => ({ ...t, categoriaConsulta: t.categoriaQueja }));
    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('GET /dept/tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets' });
  }
});

/* ========================
   Detalle Ticket (con historial)
   ======================== */
router.get('/tickets/:id', requireAuth, requireRole('recepcion', 'departamento', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const t = await prisma.ticket.findUnique({
      where: { id },
      include: {
        tipo: true,
        departamentoActual: true,
        estudiante: {
          select: { id: true, nombre: true, apellido: true, email: true, rol: true, cedula: true, facultad: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { autor: { select: { id: true, nombre: true, apellido: true, rol: true } } },
        },
        auditLogs: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, nombre: true, apellido: true, email: true, rol: true } } },
        },
      },
    });
    if (!t) return res.status(404).json({ ok: false, error: 'No existe' });

    res.json({ ok: true, ticket: { ...t, categoriaConsulta: t.categoriaQueja } });
  } catch (err) {
    console.error('GET /tickets/:id error:', err);
    res.status(500).json({ ok: false, error: 'Error obteniendo ticket' });
  }
});

/* ========================
   Acciones sobre ticket
   ======================== */

// Responder (texto enriquecido simple HTML)
router.post('/tickets/:id/messages', requireAuth, requireRole('recepcion', 'departamento', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { contenidoHtml } = req.body || {};
    if (!contenidoHtml) return res.status(400).json({ ok: false, error: 'Falta contenidoHtml' });

    const t = await prisma.ticket.findUnique({ where: { id } });
    if (!t) return res.status(404).json({ ok: false, error: 'Ticket no existe' });

    await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        autorUserId: req.sessionUser.id,
        contenidoHtml: String(contenidoHtml),
      },
    });

    await addTicketLog({
      ticketId: id,
      action: 'ADD_REPLY',
      byUserId: req.sessionUser.id,
      details: `Respuesta agregada`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /tickets/:id/messages error:', err);
    res.status(500).json({ ok: false, error: 'Error respondiendo' });
  }
});

// Reasignar
router.post('/tickets/:id/reassign', requireAuth, requireRole('recepcion', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { departmentId, departmentSlug } = req.body || {};

    let target = null;
    if (departmentId) {
      target = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
    } else if (departmentSlug) {
      target = await prisma.department.findUnique({ where: { slug: String(departmentSlug) } });
    }
    if (!target) return res.status(400).json({ ok: false, error: 'Departamento destino inválido' });

    const t = await prisma.ticket.update({
      where: { id },
      data: { departamentoActualId: target.id },
    });

    await addTicketLog({
      ticketId: id,
      action: 'REASSIGN',
      byUserId: req.sessionUser.id,
      details: `Reasignado a ${target.nombre} (${target.id})`,
    });

    res.json({ ok: true, ticket: t });
  } catch (err) {
    console.error('POST /tickets/:id/reassign error:', err);
    res.status(500).json({ ok: false, error: 'Error reasignando' });
  }
});

// Completar
router.post('/tickets/:id/complete', requireAuth, requireRole('recepcion', 'departamento', 'admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const t = await prisma.ticket.update({
      where: { id },
      data: { estado: 'completado' }
    });

    await addTicketLog({
      ticketId: id,
      action: 'COMPLETE',
      byUserId: req.sessionUser.id,
      details: `Marcado como completado`
    });

    res.json({ ok: true, ticket: t });
  } catch (err) {
    console.error('POST /tickets/:id/complete error:', err);
    res.status(500).json({ ok: false, error: 'Error completando' });
  }
});

module.exports = router;
