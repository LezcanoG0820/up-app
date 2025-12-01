// apps/api/routes/notifications.js
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { requireAuth } = require('../middlewares/auth')
const {
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead
} = require('../utils/notifications')

const prisma = new PrismaClient()
const router = express.Router()

// GET /api/notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const { notifications, unreadCount } = await listNotificationsForUser(prisma, req.sessionUser, {
      limit: 30
    })
    res.json({ ok: true, notifications, unreadCount })
  } catch (e) {
    console.error('GET /notifications error:', e)
    res.status(500).json({ ok: false, error: 'Error obteniendo notificaciones' })
  }
})

// POST /api/notifications/:id/read
router.post('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ ok: false, error: 'ID inválido' })

    await markNotificationRead(prisma, req.sessionUser, id)
    res.json({ ok: true })
  } catch (e) {
    console.error('POST /notifications/:id/read error:', e)
    res.status(500).json({ ok: false, error: 'Error marcando como leída' })
  }
})

// POST /api/notifications/read-all
router.post('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await markAllNotificationsRead(prisma, req.sessionUser)
    res.json({ ok: true })
  } catch (e) {
    console.error('POST /notifications/read-all error:', e)
    res.status(500).json({ ok: false, error: 'Error marcando todas como leídas' })
  }
})

module.exports = router
