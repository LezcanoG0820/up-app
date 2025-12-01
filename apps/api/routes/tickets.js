// apps/api/routes/tickets.js
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { requireAuth, requireRole } = require('../middlewares/auth')
const { createNotification } = require('../utils/notifications')

const prisma = new PrismaClient()
const router = express.Router()

/* ============================
   Helpers
   ============================ */

function generateToken () {
  const now = new Date()
  const y = now.getFullYear()
  const seq = Math.floor(Math.random() * 1_000_000)
  return `SIU-${y}-${String(seq).padStart(6, '0')}`
}

async function addTicketLog ({ ticketId, action, byUserId, details }) {
  try {
    return await prisma.auditLog.create({
      data: {
        ticketId,
        actorId: byUserId,
        action,
        details: details ? String(details) : null
      }
    })
  } catch (err) {
    console.error('addTicketLog error:', err)
  }
}

function mapTicketCategory (ticket) {
  if (!ticket) return ticket
  return {
    ...ticket,
    // Para mantener la compatibilidad con el frontend,
    // exponemos categoriaConsulta a partir de categoriaQueja
    categoriaConsulta: ticket.categoriaQueja
  }
}

/* ============================
   Endpoints
   ============================ */

// ---- Tipos de ticket (flujo legacy estudiante) ----
router.get('/ticket-types', requireAuth, async (_req, res) => {
  try {
    const tipos = await prisma.ticketType.findMany({
      select: { id: true, nombre: true, departmentId: true },
      orderBy: { nombre: 'asc' }
    })
    res.json({ ok: true, tipos })
  } catch (err) {
    console.error('GET /ticket-types error:', err)
    res.status(500).json({ ok: false, error: 'Error obteniendo tipos de ticket' })
  }
})

// ---- Crear ticket (estudiante, legacy con tipoId) ----
router.post(
  '/tickets',
  requireAuth,
  requireRole('estudiante'),
  async (req, res) => {
    try {
      const {
        tipoId,
        asunto,
        descripcion,
        cru,
        categoriaConsulta,
        categoriaQueja
      } = req.body || {}

      if (!tipoId || !asunto || !descripcion) {
        return res.status(400).json({ ok: false, error: 'Datos incompletos' })
      }

      const tipo = await prisma.ticketType.findUnique({
        where: { id: Number(tipoId) }
      })
      if (!tipo) {
        return res.status(400).json({ ok: false, error: 'Tipo de ticket inválido' })
      }

      const token = generateToken()
      const category = categoriaConsulta ?? categoriaQueja ?? null

      const ticket = await prisma.ticket.create({
        data: {
          token,
          estudianteId: req.sessionUser.id,
          departamentoActualId: tipo.departmentId,
          tipoId: tipo.id,
          asunto: String(asunto),
          descripcion: String(descripcion),
          cru: cru ?? null,
          categoriaQueja: category
        }
      })

      await addTicketLog({
        ticketId: ticket.id,
        action: 'CREATE_TICKET',
        byUserId: req.sessionUser.id,
        details: 'Ticket creado por estudiante'
      })

      await createNotification(prisma, {
        type: 'TICKET_CREATED',
        message: `Ticket ${ticket.token} creado`,
        ticketId: ticket.id,
        actorId: req.sessionUser.id,
        departmentId: ticket.departamentoActualId,
        audience: 'ALL'
      })

      res.json({ ok: true, ticket: mapTicketCategory(ticket) })
    } catch (err) {
      console.error('POST /tickets error:', err)
      res.status(500).json({ ok: false, error: 'Error al crear ticket' })
    }
  }
)

// ---- Crear ticket por recepción/admin (nuevo flujo con departmentId, compatible con tipoId legacy) ----
router.post(
  '/tickets/by-reception',
  requireAuth,
  requireRole('recepcion', 'admin'),
  async (req, res) => {
    try {
      const {
        studentId,
        tipoId,        // legacy (se respeta si viene)
        departmentId,  // nuevo flujo (selección directa)
        asunto,
        descripcion,
        cru,
        categoriaConsulta,
        categoriaQueja
      } = req.body || {}

      if (!studentId || !asunto || !descripcion) {
        return res.status(400).json({ ok: false, error: 'Datos incompletos' })
      }

      if (!tipoId && !departmentId) {
        return res.status(400).json({
          ok: false,
          error: 'Debe especificar tipoId o departmentId'
        })
      }

      const estudiante = await prisma.user.findUnique({
        where: { id: Number(studentId) }
      })
      if (!estudiante || estudiante.rol !== 'estudiante') {
        return res.status(400).json({ ok: false, error: 'Estudiante inválido' })
      }

      let tipo
      let departamentoActualId

      if (tipoId) {
        // ---- Flujo legacy: usar tipoId directamente ----
        tipo = await prisma.ticketType.findUnique({
          where: { id: Number(tipoId) }
        })
        if (!tipo) {
          return res.status(400).json({ ok: false, error: 'Tipo de ticket inválido' })
        }
        departamentoActualId = tipo.departmentId
      } else {
        // ---- Nuevo flujo: seleccionar departamento y mapear/crear TicketType ----
        const departamento = await prisma.department.findUnique({
          where: { id: Number(departmentId) }
        })
        if (!departamento) {
          return res.status(400).json({ ok: false, error: 'Departamento inválido' })
        }

        // Buscar un TicketType existente asignado al departamento
        tipo = await prisma.ticketType.findFirst({
          where: { departmentId: departamento.id },
          orderBy: { id: 'asc' }
        })

        // Si no existe ninguno, creamos uno genérico
        if (!tipo) {
          tipo = await prisma.ticketType.create({
            data: {
              nombre: `General - ${departamento.nombre}`,
              departmentId: departamento.id
            }
          })
        }

        departamentoActualId = departamento.id
      }

      const token = generateToken()
      const category = categoriaConsulta ?? categoriaQueja ?? null

      const ticket = await prisma.ticket.create({
        data: {
          token,
          estudianteId: estudiante.id,
          departamentoActualId,
          tipoId: tipo.id,
          asunto: String(asunto),
          descripcion: String(descripcion),
          cru: cru ?? null,
          categoriaQueja: category
        },
        include: {
          estudiante: true,
          departamentoActual: true,
          tipo: true
        }
      })

      await addTicketLog({
        ticketId: ticket.id,
        action: 'CREATE_TICKET',
        byUserId: req.sessionUser.id,
        details: 'Ticket creado desde recepción/admin'
      })

      await createNotification(prisma, {
        type: 'TICKET_CREATED',
        message: `Ticket ${ticket.token} creado para ${estudiante.nombre} ${estudiante.apellido}`,
        ticketId: ticket.id,
        actorId: req.sessionUser.id,
        departmentId: ticket.departamentoActualId,
        audience: 'ALL'
      })

      res.json({ ok: true, ticket: mapTicketCategory(ticket) })
    } catch (err) {
      console.error('POST /tickets/by-reception error:', err)
      res.status(500).json({ ok: false, error: 'Error al crear ticket desde recepción' })
    }
  }
)

// ---- Tickets del estudiante autenticado ----
router.get('/my/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const rows = await prisma.ticket.findMany({
      where: { estudianteId: req.sessionUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tipo: { select: { id: true, nombre: true } },
        departamentoActual: { select: { id: true, nombre: true } }
      }
    })

    const tickets = rows.map(mapTicketCategory)
    res.json({ ok: true, tickets })
  } catch (err) {
    console.error('GET /my/tickets error:', err)
    res.status(500).json({ ok: false, error: 'Error listando tickets del estudiante' })
  }
})

// ---- Detalle de ticket para estudiante ----
router.get('/my/tickets/:id', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const ticket = await prisma.ticket.findFirst({
      where: { id, estudianteId: req.sessionUser.id },
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
                rol: true
              }
            }
          }
        }
      }
    })

    if (!ticket) {
      return res.status(404).json({ ok: false, error: 'Ticket no encontrado' })
    }

    res.json({ ok: true, ticket: mapTicketCategory(ticket) })
  } catch (err) {
    console.error('GET /my/tickets/:id error:', err)
    res.status(500).json({ ok: false, error: 'Error obteniendo ticket' })
  }
})

// ---- Listado global para admin ----
router.get('/admin/tickets', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { q } = req.query || {}
    const where = {}

    if (q) {
      where.OR = [
        { token: { contains: String(q) } },
        { estudiante: { cedula: { contains: String(q) } } }
      ]
    }

    const rows = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        estudiante: true,
        tipo: true,
        departamentoActual: true
      }
    })

    const tickets = rows.map(mapTicketCategory)
    res.json({ ok: true, tickets })
  } catch (err) {
    console.error('GET /admin/tickets error:', err)
    res.status(500).json({ ok: false, error: 'Error listando tickets' })
  }
})

// ---- Listado para el departamento actual del usuario ----
router.get(
  '/dept/tickets',
  requireAuth,
  requireRole('departamento', 'admin'),
  async (req, res) => {
    try {
      const { q } = req.query || {}
      const where = {
        departamentoActualId: req.sessionUser.departamentoId ?? undefined
      }

      if (q) {
        where.OR = [
          { token: { contains: String(q) } },
          { estudiante: { cedula: { contains: String(q) } } }
        ]
      }

      const rows = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          estudiante: true,
          tipo: true,
          departamentoActual: true
        }
      })

      const tickets = rows.map(mapTicketCategory)
      res.json({ ok: true, tickets })
    } catch (err) {
      console.error('GET /dept/tickets error:', err)
      res.status(500).json({ ok: false, error: 'Error listando tickets del departamento' })
    }
  }
)

// ---- Detalle de ticket para recepción/departamento/admin ----
router.get(
  '/tickets/:id',
  requireAuth,
  requireRole('recepcion', 'departamento', 'admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)

      const ticket = await prisma.ticket.findUnique({
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
                  rol: true
                }
              }
            }
          }
        }
      })

      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket no encontrado' })
      }

      res.json({ ok: true, ticket: mapTicketCategory(ticket) })
    } catch (err) {
      console.error('GET /tickets/:id error:', err)
      res.status(500).json({ ok: false, error: 'Error obteniendo ticket' })
    }
  }
)

// ---- Responder ticket ----
router.post(
  '/tickets/:id/messages',
  requireAuth,
  requireRole('recepcion', 'departamento', 'admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)
      const { contenidoHtml } = req.body || {}

      if (!contenidoHtml) {
        return res.status(400).json({ ok: false, error: 'Contenido requerido' })
      }

      const ticket = await prisma.ticket.findUnique({ where: { id } })
      if (!ticket) {
        return res.status(404).json({ ok: false, error: 'Ticket no encontrado' })
      }

      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          autorUserId: req.sessionUser.id,
          contenidoHtml: String(contenidoHtml)
        }
      })

      await addTicketLog({
        ticketId: ticket.id,
        action: 'ADD_REPLY',
        byUserId: req.sessionUser.id,
        details: 'Respuesta agregada'
      })

      await createNotification(prisma, {
        type: 'TICKET_REPLIED',
        message: `Nuevo mensaje en ticket ${ticket.token}`,
        ticketId: ticket.id,
        actorId: req.sessionUser.id,
        departmentId: ticket.departamentoActualId,
        audience: 'ALL'
      })

      res.json({ ok: true })
    } catch (err) {
      console.error('POST /tickets/:id/messages error:', err)
      res.status(500).json({ ok: false, error: 'Error respondiendo' })
    }
  }
)

// ---- Reasignar ticket ----
router.post(
  '/tickets/:id/reassign',
  requireAuth,
  requireRole('recepcion', 'admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)
      const { departmentId, departmentSlug } = req.body || {}

      if (!departmentId && !departmentSlug) {
        return res.status(400).json({ ok: false, error: 'Debe indicar departmentId o departmentSlug' })
      }

      const current = await prisma.ticket.findUnique({ where: { id } })
      if (!current) {
        return res.status(404).json({ ok: false, error: 'Ticket no encontrado' })
      }

      let departamento

      if (departmentId) {
        departamento = await prisma.department.findUnique({
          where: { id: Number(departmentId) }
        })
      } else if (departmentSlug) {
        departamento = await prisma.department.findUnique({
          where: { slug: String(departmentSlug) }
        })
      }

      if (!departamento) {
        return res.status(400).json({ ok: false, error: 'Departamento inválido' })
      }

      const updated = await prisma.ticket.update({
        where: { id },
        data: {
          departamentoActualId: departamento.id
        }
      })

      await addTicketLog({
        ticketId: updated.id,
        action: 'REASSIGN',
        byUserId: req.sessionUser.id,
        details: `Ticket reasignado al departamento ${departamento.nombre}`
      })

      await createNotification(prisma, {
        type: 'TICKET_REASSIGNED',
        message: `Ticket ${updated.token} reasignado a ${departamento.nombre}`,
        ticketId: updated.id,
        actorId: req.sessionUser.id,
        departmentId: updated.departamentoActualId,
        audience: 'ALL'
      })

      res.json({ ok: true })
    } catch (err) {
      console.error('POST /tickets/:id/reassign error:', err)
      res.status(500).json({ ok: false, error: 'Error reasignando ticket' })
    }
  }
)

// ---- Completar ticket ----
router.post(
  '/tickets/:id/complete',
  requireAuth,
  requireRole('recepcion', 'departamento', 'admin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)

      const ticket = await prisma.ticket.update({
        where: { id },
        data: { estado: 'completado' }
      })

      await addTicketLog({
        ticketId: ticket.id,
        action: 'COMPLETE',
        byUserId: req.sessionUser.id,
        details: 'Ticket marcado como completado'
      })

      await createNotification(prisma, {
        type: 'TICKET_COMPLETED',
        message: `Ticket ${ticket.token} completado`,
        ticketId: ticket.id,
        actorId: req.sessionUser.id,
        departmentId: ticket.departamentoActualId,
        audience: 'ALL'
      })

      res.json({ ok: true })
    } catch (err) {
      console.error('POST /tickets/:id/complete error:', err)
      res.status(500).json({ ok: false, error: 'Error completando ticket' })
    }
  }
)

module.exports = router
