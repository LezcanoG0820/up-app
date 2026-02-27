// apps/api/routes/tickets.js
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { requireAuth, requireRole } = require('../middlewares/auth')
const { createNotification } = require('../utils/notifications')

const prisma = new PrismaClient()
const router = express.Router()

/* ========================
   Helpers
   ======================== */

function generateToken () {
  const prefix = 'SIU'
  const year = new Date().getFullYear()
  const random = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
  return `${prefix}-${year}-${random}`
}

function mapTicketCategory (t) {
  return { ...t, categoriaConsulta: t.categoriaQueja }
}

async function addTicketLog ({ ticketId, action, byUserId, details }) {
  try {
    return await prisma.auditLog.create({
      data: {
        ticketId,
        actorId: byUserId ?? null,
        action,
        details: details ? String(details) : null
      }
    })
  } catch (e) {
    console.error('addTicketLog error:', e)
  }
}

/* ========================
   Crear ticket (estudiante)
   ======================== */

router.post('/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const { tipoId, asunto, descripcion, categoriaConsulta, categoriaQueja } = req.body || {}  // ❌ ELIMINADO: cru

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
        // cru: cru ?? null,  ❌ ELIMINADO
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
})

/* ========================
   Crear ticket por recepción/maestro
   ======================== */

router.post(
  '/tickets/by-reception',
  requireAuth,
  requireRole('recepcion', 'maestro'),
  async (req, res) => {
    try {
      const {
        studentId,
        tipoId,
        departmentId,
        asunto,
        descripcion,
        // cru,  ❌ ELIMINADO
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
        tipo = await prisma.ticketType.findUnique({
          where: { id: Number(tipoId) }
        })
        if (!tipo) {
          return res.status(400).json({ ok: false, error: 'Tipo de ticket inválido' })
        }
        departamentoActualId = tipo.departmentId
      } else {
        const departamento = await prisma.department.findUnique({
          where: { id: Number(departmentId) }
        })
        if (!departamento) {
          return res.status(400).json({ ok: false, error: 'Departamento inválido' })
        }

        tipo = await prisma.ticketType.findFirst({
          where: { departmentId: departamento.id },
          orderBy: { id: 'asc' }
        })

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
          // cru: cru ?? null,  ❌ ELIMINADO
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
        details: 'Ticket creado desde recepción/maestro'
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

/* ========================
   Tickets del estudiante
   ======================== */

router.get('/my/tickets', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const rows = await prisma.ticket.findMany({
      where: { estudianteId: req.sessionUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        tipo: { select: { id: true, nombre: true } },
        departamentoActual: { select: { id: true, nombre: true, slug: true } }
      }
    })

    const tickets = rows.map(mapTicketCategory)
    res.json({ ok: true, tickets })
  } catch (err) {
    console.error('GET /my/tickets error:', err)
    res.status(500).json({ ok: false, error: 'Error listando tickets' })
  }
})

/* ========================
   Detalle de ticket (estudiante)
   ======================== */

router.get('/my/tickets/:id', requireAuth, requireRole('estudiante'), async (req, res) => {
  try {
    const id = Number(req.params.id)

    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        estudianteId: req.sessionUser.id
      },
      include: {
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

/* ========================
   Bandeja Departamento
   ======================== */

router.get(
  '/dept/tickets',
  requireAuth,
  requireRole('departamento', 'maestro'),
  async (req, res) => {
    try {
      const deptId = req.sessionUser?.departamentoId
      if (!deptId) {
        return res.status(400).json({ ok: false, error: 'Usuario sin departamento asignado' })
      }

      const { q } = req.query
      const where = {
        departamentoActualId: deptId
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

/* ========================
   Detalle de ticket
   ======================== */

router.get(
  '/tickets/:id',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
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

/* ========================
   Responder ticket
   ======================== */

router.post(
  '/tickets/:id/messages',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
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

/* ========================
   Reasignar ticket
   ======================== */

router.post(
  '/tickets/:id/reassign',
  requireAuth,
  requireRole('recepcion', 'maestro'),
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

/* ========================
   Completar ticket
   ======================== */

router.post(
  '/tickets/:id/complete',
  requireAuth,
  requireRole('recepcion', 'departamento', 'maestro'),
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