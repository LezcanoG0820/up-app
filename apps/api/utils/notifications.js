// apps/api/utils/notifications.js
const { Audience } = require('@prisma/client')

/**
 * Crea una notificación en base de datos.
 */
async function createNotification (prisma, {
  type,
  message,
  ticketId = null,
  actorId = null,
  departmentId = null,
  audience = 'ALL'
}) {
  try {
    const data = {
      type,
      message: String(message),
      ticketId: ticketId ?? null,
      actorId: actorId ?? null,
      departmentId: departmentId ?? null,
      audience: audience || Audience.ALL
    }

    const notif = await prisma.notification.create({ data })
    return notif
  } catch (e) {
    console.error('createNotification error:', e)
    return null
  }
}

/**
 * Devuelve las notificaciones visibles para el usuario y cuántas no ha leído.
 */
async function listNotificationsForUser (prisma, user, { limit = 30 } = {}) {
  // Filtro por audiencia básica
  const where = {
    OR: [
      { audience: Audience.ALL },
      ...(user.rol === 'admin'
        ? [{ audience: Audience.ADMINS }]
        : []),
      ...(user.departamentoId
        ? [{ audience: Audience.DEPARTMENT, departmentId: user.departamentoId }]
        : [])
    ]
  }

  const rows = await prisma.notification.findMany({
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
    audience: n.audience,
    createdAt: n.createdAt,
    read: n.reads.length > 0
  }))

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount }
}

/**
 * Marca UNA notificación como leída para un usuario.
 */
async function markNotificationRead (prisma, user, notificationId) {
  try {
    await prisma.notificationRead.upsert({
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
  } catch (e) {
    console.error('markNotificationRead error:', e)
  }
}

/**
 * Marca TODAS las notificaciones visibles como leídas para un usuario.
 */
async function markAllNotificationsRead (prisma, user) {
  try {
    const { notifications } = await listNotificationsForUser(prisma, user, { limit: 200 })
    const ids = notifications.filter(n => !n.read).map(n => n.id)
    if (!ids.length) return

    await prisma.notificationRead.createMany({
      data: ids.map(id => ({
        userId: user.id,
        notificationId: id
      })),
      skipDuplicates: true
    })
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
