// apps/api/utils/notifications.js

/**
 * Crea una notificación en base de datos.
 */
async function createNotification (prisma, {
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

    const notif = await prisma.notification.create({ data })
    console.log('✅ Notificación creada:', notif.id, notif.type)
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
  try {
    // Criterio básico: notificaciones globales o de su departamento
    const where = {
      OR: [
        { departmentId: null }, // Notificaciones globales
        ...(user.departamentoId ? [{ departmentId: user.departamentoId }] : [])
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
    console.log('✅ Notificación marcada como leída:', notificationId)
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