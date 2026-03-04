// apps/api/utils/notifications.js
const { PrismaClient } = require('@prisma/client')
const { sendNotificationToUser } = require('../websocket/wsNotifications')

const prisma = new PrismaClient()

async function createNotification (prismaInstance, {
  type,
  message,
  ticketId = null,
  actorId = null,
  departmentId = null
}) {
  try {
    const data = {
      type,
      message: String(message),
      ticketId: ticketId ?? null,
      actorId: actorId ?? null,
      departmentId: departmentId ?? null
    }

    const notif = await prismaInstance.notification.create({ 
      data,
      include: {
        actor: {
          select: { id: true, nombre: true, apellido: true }
        }
      }
    })
    
    console.log('✅ Notificación creada en BD:', notif.id, notif.type)
    await sendNotificationToRelevantUsers(notif)
    return notif
  } catch (e) {
    console.error('createNotification error:', e)
    return null
  }
}

async function sendNotificationToRelevantUsers(notification) {
  try {
    let targetUserIds = []

    if (notification.departmentId) {
      const deptUsers = await prisma.user.findMany({
        where: { 
          departamentoId: notification.departmentId,
          rol: { in: ['departamento', 'maestro'] }
        },
        select: { id: true }
      })
      targetUserIds = deptUsers.map(u => u.id)
    }

    if (notification.ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: notification.ticketId },
        select: { estudianteId: true }
      })
      if (ticket && !targetUserIds.includes(ticket.estudianteId)) {
        targetUserIds.push(ticket.estudianteId)
      }
    }

    const receptionUsers = await prisma.user.findMany({
      where: { 
        rol: { in: ['recepcion', 'maestro'] }
      },
      select: { id: true }
    })
    receptionUsers.forEach(u => {
      if (!targetUserIds.includes(u.id)) {
        targetUserIds.push(u.id)
      }
    })

    const notificationData = {
      id: notification.id,
      type: notification.type,
      message: notification.message,
      ticketId: notification.ticketId,
      createdAt: notification.createdAt,
      read: false
    }

    targetUserIds.forEach(userId => {
      const sent = sendNotificationToUser(userId, notificationData)
      if (sent) {
        console.log(`📨 Notificación enviada por WS a usuario ${userId}`)
      }
    })

  } catch (e) {
    console.error('Error enviando notificación por WebSocket:', e)
  }
}

async function listNotificationsForUser (prismaInstance, user, { limit = 30 } = {}) {
  try {
    const where = {
      OR: [
        { departmentId: null },
        ...(user.departamentoId ? [{ departmentId: user.departamentoId }] : [])
      ]
    }

    const rows = await prismaInstance.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: {
          select: { id: true, nombre: true, apellido: true, rol: true, email: true }
        },
        reads: {
          where: { userId: user.id },
          select: { userId: true, readAt: true }
        }
      }
    })

    const notifications = rows.map(n => ({
      id: n.id,
      type: n.type,
      message: n.message,
      ticketId: n.ticketId,
      actor: n.actor,
      departmentId: n.departmentId,
      createdAt: n.createdAt,
      read: n.reads.length > 0
    }))

    const unreadCount = notifications.filter(n => !n.read).length
    return { notifications, unreadCount }
  } catch (e) {
    console.error('listNotificationsForUser error:', e)
    return { notifications: [], unreadCount: 0 }
  }
}

async function markNotificationRead (prismaInstance, user, notificationId) {
  try {
    await prismaInstance.notificationRead.upsert({
      where: {
        userId_notificationId: {
          userId: user.id,
          notificationId
        }
      },
      update: {},
      create: {
        userId: user.id,
        notificationId
      }
    })
    console.log('✅ Notificación marcada como leída:', notificationId)
  } catch (e) {
    console.error('markNotificationRead error:', e)
  }
}

async function markAllNotificationsRead (prismaInstance, user) {
  try {
    const { notifications } = await listNotificationsForUser(prismaInstance, user, { limit: 200 })
    const ids = notifications.filter(n => !n.read).map(n => n.id)
    if (!ids.length) return

    await prismaInstance.notificationRead.createMany({
      data: ids.map(id => ({
        userId: user.id,
        notificationId: id
      })),
      skipDuplicates: true
    })
    console.log('✅ Todas las notificaciones marcadas como leídas')
  } catch (e) {
    console.error('markAllNotificationsRead error:', e)
  }
}

module.exports = {
  createNotification,
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead
}