// apps/api/routes/manage.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { createNotification } = require('../utils/notifications');

const prisma = new PrismaClient();
const router = express.Router();

/* ========================
   Helpers
   ======================== */

async function hashOnce(pwd) {
  return bcrypt.hash(String(pwd || ''), 10);
}

async function addTicketLog({ ticketId, action, byUserId, details }) {
  try {
    return await prisma.auditLog.create({
      data: {
        ticketId,
        actorId: byUserId ?? null,
        action,
        details: details ? String(details) : null
      }
    });
  } catch (e) {
    console.error('addTicketLog error:', e);
  }
}

/* ========================
   Datos estáticos - CRUs, Extensiones, Programas y Campus (Facultades)
   ======================== */
const CRUS = [
  // === CENTROS REGIONALES UNIVERSITARIOS (con C.R.U. adelante) ===
  { slug: 'cru-chiriqui', nombre: 'C.R.U. CHIRIQUÍ' },
  { slug: 'cru-azuero', nombre: 'C.R.U. AZUERO' },
  { slug: 'cru-veraguas', nombre: 'C.R.U. VERAGUAS' },
  { slug: 'cru-colon', nombre: 'C.R.U. COLÓN' },
  { slug: 'cru-cocle', nombre: 'C.R.U. COCLÉ' },
  { slug: 'cru-los-santos', nombre: 'C.R.U. LOS SANTOS' },
  { slug: 'cru-bocas-del-toro', nombre: 'C.R.U. BOCAS DEL TORO' },
  { slug: 'cru-panama-oeste', nombre: 'C.R.U. PANAMÁ OESTE' },
  { slug: 'cru-san-miguelito', nombre: 'C.R.U. SAN MIGUELITO' },
  { slug: 'cru-darien', nombre: 'C.R.U. DARIÉN' },
  { slug: 'cru-panama-este', nombre: 'C.R.U. PANAMÁ ESTE' },
  
  // === EXTENSIONES UNIVERSITARIAS ===
  { slug: 'ext-aguadul', nombre: 'EXT.U. AGUADUL' },
  { slug: 'ext-sona', nombre: 'EXT. U. SONÁ' },
  { slug: 'ext-arraijan', nombre: 'E. ARRAIJÁN' },
  { slug: 'ext-torti', nombre: 'EXT.U. TORTÍ' },
  { slug: 'ext-ocu', nombre: 'EXT. OCU' },
  
  // === PROGRAMAS ANEXOS ===
  { slug: 'prog-ch-grande', nombre: 'P. CH. GRANDE' },
  { slug: 'prog-isla-colon', nombre: 'P. ISLA COLÓN' },
  { slug: 'prog-kankintu', nombre: 'P. KANKINTU' },
  { slug: 'prog-kuna-ust', nombre: 'P. KUNA Y. UST' },
  { slug: 'prog-kuna-car', nombre: 'P. KUNA Y. CAR' },
  { slug: 'prog-kuna-nar', nombre: 'P. KUNA Y. NAR' },
  { slug: 'prog-chame', nombre: 'P. CHAME' },
  { slug: 'prog-macaracas', nombre: 'P. MACARACAS' },
  { slug: 'prog-tonosi', nombre: 'P. TONOSÍ' },
  { slug: 'prog-n-de-dios', nombre: 'P. N. DE DIOS' },
  { slug: 'prog-bs-prado', nombre: 'P.N- B.S.PRADO' },
  { slug: 'prog-rio-indio', nombre: 'P. RÍO INDIO' },
  { slug: 'prog-cerr-puerco', nombre: 'P.CERR PUERCO' },
  { slug: 'prog-guabal', nombre: 'P. GUABAL' },
  { slug: 'prog-kusapin', nombre: 'P. KUSAPÍN' },
  { slug: 'prog-portobelo', nombre: 'P. PORTOBELO' },
  
  // === CAMPUS (FACULTADES) ===
  { slug: 'campus-medicina', nombre: 'MEDICINA' },
  { slug: 'campus-admon-empresas', nombre: 'ADMON. DE EMPRESAS Y CONTABILIDAD' },
  { slug: 'campus-derecho', nombre: 'DERECHO Y CIENCIAS POLÍTICAS' },
  { slug: 'campus-admon-publica', nombre: 'ADMINISTRACIÓN PÚBLICA' },
  { slug: 'campus-odontologia', nombre: 'ODONTOLOGÍA' },
  { slug: 'campus-ciencias-educacion', nombre: 'CIENCIAS DE LA EDUCACIÓN' },
  { slug: 'campus-humanidades', nombre: 'HUMANIDADES' },
  { slug: 'campus-ciencias-agropecuarias', nombre: 'CIENCIAS AGROPECUARIAS' },
  { slug: 'campus-psicologia', nombre: 'PSICOLOGÍA' },
  { slug: 'campus-enfermeria', nombre: 'ENFERMERÍA' },
  { slug: 'campus-medicina-veterinaria', nombre: 'MEDICINA VETERINARIA' },
  { slug: 'campus-informatica', nombre: 'INFORMÁTICA ELECTRÓNICA Y COMUNIC.' },
  { slug: 'campus-arquitectura', nombre: 'ARQUITECTURA Y DISEÑO' },
  { slug: 'campus-ciencias-naturales', nombre: 'CIENCIAS NATURALES, EXACTAS Y TEC.' },
  { slug: 'campus-bellas-artes', nombre: 'BELLAS ARTES' },
  { slug: 'campus-farmacia', nombre: 'FARMACIA' },
  { slug: 'campus-comunicacion-social', nombre: 'COMUNICACIÓN SOCIAL' },
  { slug: 'campus-ingenieria', nombre: 'INGENIERÍA' },
];

/* ========================
   Endpoints auxiliares (públicos/privados)
   ======================== */

// CRUs para formulario de estudiantes (público)
router.get('/crus', async (_req, res) => res.json({ ok: true, crus: CRUS }));

// Endpoint para obtener CRUs
router.get('/centros-regionales', (_req, res) => {
  res.json({ ok: true, centros: CRUS });
});

// Listar departamentos (dropdown de reasignación) — requiere sesión
router.get(
  '/departments',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
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
   Estudiantes (Recepción/Maestro)
   ======================== */

// Buscar estudiantes por cédula, nombre, apellido o email
router.get(
  '/students/search',
  requireAuth,
  requireRole('recepcion', 'maestro'),
  async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (!q) {
        return res.json({ ok: true, students: [] });
      }

      const students = await prisma.user.findMany({
        where: {
          rol: 'estudiante',
          OR: [
            { cedula:   { contains: q } },
            { nombre:   { contains: q } },
            { apellido: { contains: q } },
            { email:    { contains: q } },
            { cru:      { contains: q } },
          ]
        },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          cedula: true,
          email: true,
          cru: true,
        }
      });

      res.json({ ok: true, students });
    } catch (err) {
      console.error('GET /students/search error:', err);
      res.status(500).json({ ok: false, error: 'Error buscando estudiantes' });
    }
  }
);

// Crear estudiante nuevo desde recepción/maestro
router.post(
  '/students',
  requireAuth,
  requireRole('recepcion', 'maestro'),
  async (req, res) => {
    try {
      const { nombre, apellido, cedula, email, cru } = req.body || {};

      if (!nombre || !apellido || !cedula || !email) {
        return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });
      }

      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { cedula: { equals: String(cedula) } },
            { email:  { equals: String(email).toLowerCase() } },
          ]
        },
        select: { id: true }
      });

      if (existing) {
        return res.status(400).json({ ok: false, error: 'Ya existe un estudiante con esa cédula o email' });
      }

      const tempPassword = 'Temporal#2025';
      const passwordHash = await hashOnce(tempPassword);

      const student = await prisma.user.create({
        data: {
          nombre: String(nombre),
          apellido: String(apellido),
          cedula: String(cedula),
          email: String(email).toLowerCase(),
          passwordHash,
          rol: 'estudiante',
          cru: cru ? String(cru) : null,
          twoFactorEnabled: false,
          failedLoginCount: 0,
        },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          cedula: true,
          email: true,
          cru: true,
          rol: true,
        }
      });

      res.json({ ok: true, student });
    } catch (err) {
      console.error('POST /students error:', err);
      res.status(500).json({ ok: false, error: 'Error creando estudiante' });
    }
  }
);

/* ========================
   GESTIÓN DE USUARIOS (MAESTRO)
   ======================== */

// Listar todos los usuarios
router.get('/admin/users', requireAuth, requireRole('maestro'), async (req, res) => {
  try {
    const { rol, q } = req.query;
    
    const where = {};
    
    if (rol && ['maestro', 'recepcion', 'departamento', 'estudiante'].includes(rol)) {
      where.rol = rol;
    }
    
    if (q && typeof q === 'string' && q.trim()) {
      const qTrim = q.trim();
      where.OR = [
        { nombre: { contains: qTrim } },
        { apellido: { contains: qTrim } },
        { email: { contains: qTrim } },
        { cedula: { contains: qTrim } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        apellido: true,
        cedula: true,
        email: true,
        rol: true,
        cru: true,
        departamentoId: true,
        departamento: {
          select: {
            id: true,
            nombre: true,
            slug: true
          }
        },
        lastLoginAt: true,
        failedLoginCount: true
      }
    });

    res.json({ ok: true, users });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ ok: false, error: 'Error listando usuarios' });
  }
});

// Crear nuevo usuario (maestro, recepcion, departamento)
router.post('/admin/users', requireAuth, requireRole('maestro'), async (req, res) => {
  try {
    const { nombre, apellido, cedula, email, rol, departamentoId, cru } = req.body || {};

    if (!nombre || !apellido || !cedula || !email || !rol) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Faltan campos obligatorios: nombre, apellido, cédula, email, rol' 
      });
    }

    if (!['maestro', 'recepcion', 'departamento'].includes(rol)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Rol inválido. Utiliza "maestro", "recepcion" o "departamento"' 
      });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { cedula: String(cedula).trim() },
          { email: String(email).toLowerCase().trim() }
        ]
      },
      select: { id: true }
    });

    if (existing) {
      return res.status(409).json({ 
        ok: false, 
        error: 'Ya existe un usuario con esa cédula o email' 
      });
    }

    const tempPassword = `Temp-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
    const passwordHash = await hashOnce(tempPassword);

    const userData = {
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      cedula: String(cedula).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      rol,
      mustChangePassword: true,
      twoFactorEnabled: false,
      failedLoginCount: 0
    };

    if (rol === 'departamento' && departamentoId) {
      userData.departamentoId = Number(departamentoId);
    }

    if (cru) {
      userData.cru = String(cru).trim();
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        cedula: true,
        email: true,
        rol: true,
        cru: true,
        departamentoId: true,
        departamento: {
          select: {
            id: true,
            nombre: true,
            slug: true
          }
        }
      }
    });

    res.json({ 
      ok: true, 
      user,
      tempPassword
    });
  } catch (err) {
    console.error('POST /admin/users error:', err);
    res.status(500).json({ ok: false, error: 'Error creando usuario' });
  }
});

// Editar usuario existente
router.patch('/admin/users/:id', requireAuth, requireRole('maestro'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, apellido, cedula, email, rol, departamentoId, cru } = req.body || {};

    const existingUser = await prisma.user.findUnique({ 
      where: { id },
      select: { id: true, rol: true, departamentoId: true }
    });

    if (!existingUser) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    const updateData = {};

    if (nombre) updateData.nombre = String(nombre).trim();
    if (apellido) updateData.apellido = String(apellido).trim();
    if (cedula) updateData.cedula = String(cedula).trim();
    if (email) updateData.email = String(email).toLowerCase().trim();
    
    if (rol && ['maestro', 'recepcion', 'departamento', 'estudiante'].includes(rol)) {
      updateData.rol = rol;
      
      if (rol === 'departamento' && !departamentoId && !existingUser.departamentoId) {
        return res.status(400).json({ 
          ok: false, 
          error: 'El rol "departamento" requiere asignar un departamentoId' 
        });
      }
      
      if (rol !== 'departamento') {
        updateData.departamentoId = null;
      }
    }

    if (departamentoId !== undefined) {
      if (departamentoId === null || departamentoId === '') {
        updateData.departamentoId = null;
      } else {
        const dept = await prisma.department.findUnique({ 
          where: { id: Number(departamentoId) } 
        });
        
        if (!dept) {
          return res.status(400).json({ 
            ok: false, 
            error: 'El departamento especificado no existe' 
          });
        }
        
        updateData.departamentoId = Number(departamentoId);
      }
    }

    if (cru !== undefined) {
      updateData.cru = cru ? String(cru).trim() : null;
    }

    if (cedula || email) {
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(cedula ? [{ cedula: String(cedula).trim() }] : []),
            ...(email ? [{ email: String(email).toLowerCase().trim() }] : [])
          ]
        },
        select: { id: true }
      });

      if (conflict) {
        return res.status(409).json({ 
          ok: false, 
          error: 'Ya existe otro usuario con esa cédula o email' 
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        apellido: true,
        cedula: true,
        email: true,
        rol: true,
        cru: true,
        departamentoId: true,
        departamento: {
          select: {
            id: true,
            nombre: true,
            slug: true
          }
        }
      }
    });

    res.json({ ok: true, user });
  } catch (err) {
    console.error('PATCH /admin/users/:id error:', err);
    res.status(500).json({ ok: false, error: 'Error actualizando usuario' });
  }
});

// Eliminar usuario
router.delete('/admin/users/:id', requireAuth, requireRole('maestro'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ 
      where: { id },
      select: { id: true, rol: true, nombre: true, apellido: true }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }

    if (id === req.sessionUser.id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No puedes eliminar tu propia cuenta' 
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({ 
      ok: true, 
      message: `Usuario ${user.nombre} ${user.apellido} eliminado exitosamente` 
    });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err);
    
    if (err.code === 'P2003') {
      return res.status(400).json({ 
        ok: false, 
        error: 'No se puede eliminar este usuario porque tiene registros asociados (tickets, mensajes, etc.)' 
      });
    }
    
    res.status(500).json({ ok: false, error: 'Error eliminando usuario' });
  }
});

/* ========================
   Bandeja Recepción / Maestro
   ======================== */
router.get('/admin/tickets', requireAuth, requireRole('recepcion', 'maestro'), async (req, res) => {
  try {
    const { q, estado, date_from, date_to } = req.query;

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
              { token: { equals: qRaw } },
              { token: { contains: qRaw } },
              { token: { contains: qUpper } },
              { asunto: { contains: qRaw } },
              {
                estudiante: {
                  OR: [
                    { nombre:   { contains: qRaw } },
                    { apellido: { contains: qRaw } },
                    { email:    { contains: qRaw } },
                    { cedula:   { equals: qRaw } },
                    { cedula:   { contains: qRaw } },
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
        categoriaQueja: true,
        tipo: { select: { nombre: true } },
        departamentoActual: { select: { nombre: true, slug: true } },
        estudiante: {
          select: { nombre: true, apellido: true, email: true, cedula: true, cru: true },
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
   Export CSV
   ======================== */
router.get('/admin/tickets/export', requireAuth, requireRole('recepcion', 'maestro'), async (req, res) => {
  try {
    const { q, estado, date_from, date_to, nombre, apellido, cedula } = req.query;

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
      ...(qRaw ? {
            OR: [
              { token: { contains: qRaw } },
              { asunto: { contains: qRaw } },
              { estudiante: { cedula: { contains: qRaw } } },
            ],
          }
        : {}),
      ...(nombre   ? { estudiante: { nombre:   { contains: String(nombre) } } } : {}),
      ...(apellido ? { estudiante: { apellido: { contains: String(apellido) } } } : {}),
      ...(cedula   ? { estudiante: { cedula:   { contains: String(cedula) } } } : {}),
    };

    const rows = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        token: true,
        asunto: true,
        estado: true,
        createdAt: true,
        categoriaQueja: true,
        tipo: { select: { nombre: true } },
        departamentoActual: { select: { nombre: true } },
        estudiante: {
          select: { nombre: true, apellido: true, email: true, cedula: true, cru: true },
        },
      },
    });

    const header = [
      'Token',
      'Asunto',
      'Estado',
      'Fecha',
      'Sede/CRU',
      'CategoriaConsulta',
      'Tipo',
      'Departamento',
      'EstudianteNombre',
      'EstudianteApellido',
      'Cedula',
      'Email',
    ];
    const lines = [header.join(',')];

    for (const r of rows) {
      const line = [
        r.token,
        safeCsv(r.asunto),
        r.estado,
        new Date(r.createdAt).toISOString(),
        r.estudiante?.cru || '',
        r.categoriaQueja || '',
        r.tipo?.nombre || '',
        r.departamentoActual?.nombre || '',
        r.estudiante?.nombre || '',
        r.estudiante?.apellido || '',
        r.estudiante?.cedula || '',
        r.estudiante?.email || '',
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
   Bandeja Departamento
   ======================== */
router.get('/dept/tickets', requireAuth, requireRole('departamento', 'maestro'), async (req, res) => {
  try {
    const deptId = req.sessionUser?.departamentoId;
    if (!deptId) {
      return res.status(400).json({ ok: false, error: 'Usuario sin departamento asignado' });
    }

    const { q } = req.query;
    const qRaw   = typeof q === 'string' ? q.trim() : '';

    const where = {
      departamentoActualId: deptId,
      ...(qRaw ? {
            OR: [
              { token: { contains: qRaw } },
              { estudiante: { cedula: { contains: qRaw } } }
            ]
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
        categoriaQueja: true,
        tipo: { select: { nombre: true } },
        departamentoActual: { select: { nombre: true, slug: true } },
        estudiante: {
          select: { nombre: true, apellido: true, email: true, cedula: true, cru: true },
        },
      },
    });

    const tickets = rows.map((t) => ({ ...t, categoriaConsulta: t.categoriaQueja }));
    res.json({ ok: true, tickets });
  } catch (err) {
    console.error('GET /dept/tickets error:', err);
    res.status(500).json({ ok: false, error: 'Error listando tickets del departamento' });
  }
});

/* ========================
   Detalle de ticket
   ======================== */
router.get('/tickets/:id', requireAuth, requireRole('recepcion', 'departamento', 'maestro'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const t = await prisma.ticket.findUnique({
      where: { id },
      include: {
        estudiante: true,
        tipo: true,
        departamentoActual: true,
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
                email: true,
                rol: true
              }
            }
          }
        }
      }
    });

    if (!t) return res.status(404).json({ ok: false, error: 'Ticket no encontrado' });

    res.json({ ok: true, ticket: { ...t, categoriaConsulta: t.categoriaQueja } });
  } catch (err) {
    console.error('GET /tickets/:id error:', err);
    res.status(500).json({ ok: false, error: 'Error obteniendo ticket' });
  }
});

/* ========================
   Acciones sobre ticket
   ======================== */

router.post('/tickets/:id/messages', requireAuth, requireRole('recepcion', 'departamento', 'maestro'), async (req, res) => {
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
        contenidoHtml: String(contenidoHtml)
      }
    });

    await addTicketLog({
      ticketId: id,
      action: 'ADD_REPLY',
      byUserId: req.sessionUser.id,
      details: 'Respuesta agregada'
    });

    if (createNotification) {
      await createNotification(prisma, {
        type: 'TICKET_REPLIED',
        message: `Nuevo mensaje en ticket ${t.token}`,
        ticketId: t.id,
        actorId: req.sessionUser.id,
        departmentId: t.departamentoActualId
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /tickets/:id/messages error:', err);
    res.status(500).json({ ok: false, error: 'Error respondiendo' });
  }
});

router.post('/tickets/:id/reassign', requireAuth, requireRole('recepcion', 'maestro'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { departmentId, departmentSlug } = req.body || {};

    if (!departmentId && !departmentSlug) {
      return res.status(400).json({ ok: false, error: 'Debe indicar departmentId o departmentSlug' });
    }

    let target;
    if (departmentId) {
      target = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
    } else {
      target = await prisma.department.findUnique({ where: { slug: String(departmentSlug) } });
    }

    if (!target) return res.status(400).json({ ok: false, error: 'Departamento inválido' });

    const t = await prisma.ticket.update({
      where: { id },
      data: { departamentoActualId: target.id }
    });

    await addTicketLog({
      ticketId: id,
      action: 'REASSIGN',
      byUserId: req.sessionUser.id,
      details: `Reasignado a ${target.nombre} (${target.id})`,
    });

    if (createNotification) {
      await createNotification(prisma, {
        type: 'TICKET_REASSIGNED',
        message: `Ticket ${t.token} reasignado a ${target.nombre}`,
        ticketId: t.id,
        actorId: req.sessionUser.id,
        departmentId: target.id
      });
    }

    res.json({ ok: true, ticket: t });
  } catch (err) {
    console.error('POST /tickets/:id/reassign error:', err);
    res.status(500).json({ ok: false, error: 'Error reasignando' });
  }
});

router.post('/tickets/:id/complete', requireAuth, requireRole('recepcion', 'departamento', 'maestro'), async (req, res) => {
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

    if (createNotification) {
      await createNotification(prisma, {
        type: 'TICKET_COMPLETED',
        message: `Ticket ${t.token} marcado como completado`,
        ticketId: t.id,
        actorId: req.sessionUser.id,
        departmentId: t.departamentoActualId
      });
    }

    res.json({ ok: true, ticket: t });
  } catch (err) {
    console.error('POST /tickets/:id/complete error:', err);
    res.status(500).json({ ok: false, error: 'Error completando' });
  }
});

module.exports = router;