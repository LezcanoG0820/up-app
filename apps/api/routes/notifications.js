// apps/api/routes/notifications.js
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { requireAuth } = require('../middlewares/auth')

const router = express.Router()
const prisma = new PrismaClient()

/**
 * GET /notifications
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, unreadOnly = 'false' } = req.query
    const userId = req.sessionUser.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departamentoId: true, rol: true }
    })

    const whereConditions = {
      OR: []
    }

    if (user.departamentoId) {
      whereConditions.OR.push({ departmentId: user.departamentoId })
    }

    if (user.rol === 'estudiante') {
      const userTickets = await prisma.ticket.findMany({
        where: { estudianteId: userId },
        select: { id: true }
      })
      const ticketIds = userTickets.map(t => t.id)
      
      if (ticketIds.length > 0) {
        whereConditions.OR.push({ 
          ticketId: { in: ticketIds },
          type: { in: ['TICKET_REPLIED', 'TICKET_COMPLETED'] }
        })
      }
    }

    if (user.rol === 'recepcion' || user.rol === 'maestro') {
      whereConditions.OR.push({ departmentId: null })
    }

    if (whereConditions.OR.length === 0) {
      return res.json({ ok: true, notifications: [] })
    }

    const notifications = await prisma.notification.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        reads: {
          where: { userId }
        },
        actor: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        }
      }
    })

    const transformedNotifications = notifications.map(notif => ({
      id: notif.id,
      type: notif.type,
      message: notif.message,
      ticketId: notif.ticketId,
      actorId: notif.actorId,
      actor: notif.actor,
      departmentId: notif.departmentId,
      createdAt: notif.createdAt,
      read: notif.reads.length > 0
    }))

    const finalNotifications = unreadOnly === 'true'
      ? transformedNotifications.filter(n => !n.read)
      : transformedNotifications

    res.json({ ok: true, notifications: finalNotifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ ok: false, error: 'Error al obtener notificaciones' })
  }
})

/**
 * GET /notifications/unread-count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const userId = req.sessionUser.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departamentoId: true, rol: true }
    })

    const whereConditions = {
      OR: []
    }

    if (user.departamentoId) {
      whereConditions.OR.push({ departmentId: user.departamentoId })
    }

    if (user.rol === 'estudiante') {
      const userTickets = await prisma.ticket.findMany({
        where: { estudianteId: userId },
        select: { id: true }
      })
      const ticketIds = userTickets.map(t => t.id)
      
      if (ticketIds.length > 0) {
        whereConditions.OR.push({ 
          ticketId: { in: ticketIds },
          type: { in: ['TICKET_REPLIED', 'TICKET_COMPLETED'] }
        })
      }
    }

    if (user.rol === 'recepcion' || user.rol === 'maestro') {
      whereConditions.OR.push({ departmentId: null })
    }

    if (whereConditions.OR.length === 0) {
      return res.json({ ok: true, count: 0 })
    }

    const count = await prisma.notification.count({
      where: {
        AND: [
          whereConditions,
          {
            reads: {
              none: {
                userId
              }
            }
          }
        ]
      }
    })

    res.json({ ok: true, count })
  } catch (error) {
    console.error('Error counting unread notifications:', error)
    res.status(500).json({ ok: false, error: 'Error al contar notificaciones' })
  }
})

/**
 * PATCH /notifications/:id/read
 */
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id)
    const userId = req.sessionUser.id

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      return res.status(404).json({ ok: false, error: 'Notificación no encontrada' })
    }

    const read = await prisma.notificationRead.upsert({
      where: {
        userId_notificationId: {
          userId,
          notificationId
        }
      },
      create: {
        userId,
        notificationId
      },
      update: {}
    })

    res.json({ ok: true, read })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    res.status(500).json({ ok: false, error: 'Error al marcar notificación' })
  }
})

/**
 * PATCH /notifications/read-all
 */
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.sessionUser.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departamentoId: true, rol: true }
    })

    const whereConditions = {
      OR: []
    }

    if (user.departamentoId) {
      whereConditions.OR.push({ departmentId: user.departamentoId })
    }

    if (user.rol === 'estudiante') {
      const userTickets = await prisma.ticket.findMany({
        where: { estudianteId: userId },
        select: { id: true }
      })
      const ticketIds = userTickets.map(t => t.id)
      
      if (ticketIds.length > 0) {
        whereConditions.OR.push({ 
          ticketId: { in: ticketIds },
          type: { in: ['TICKET_REPLIED', 'TICKET_COMPLETED'] }
        })
      }
    }

    if (user.rol === 'recepcion' || user.rol === 'maestro') {
      whereConditions.OR.push({ departmentId: null })
    }

    if (whereConditions.OR.length === 0) {
      return res.json({ ok: true, count: 0 })
    }

    const unreadNotifications = await prisma.notification.findMany({
      where: {
        AND: [
          whereConditions,
          {
            reads: {
              none: { userId }
            }
          }
        ]
      },
      select: { id: true }
    })

    const readRecords = unreadNotifications.map(notif => ({
      userId,
      notificationId: notif.id
    }))

    if (readRecords.length > 0) {
      await prisma.notificationRead.createMany({
        data: readRecords,
        skipDuplicates: true
      })
    }

    res.json({ ok: true, count: readRecords.length })
  } catch (error) {
    console.error('Error marking all as read:', error)
    res.status(500).json({ ok: false, error: 'Error al marcar notificaciones' })
  }
})

module.exports = router