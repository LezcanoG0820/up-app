// apps/api/routes/notifications.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middlewares/auth');
const { whereForUser } = require('../utils/notifications');

const prisma = new PrismaClient();
const router = express.Router();

/**
 * GET /api/notifications/unread-count
 * Devuelve el número de notificaciones NO leídas para el usuario actual.
 */
router.get('/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const user = req.sessionUser;
    const whereBase = whereForUser(user);

    if (user.rol === 'estudiante') {
      return res.json({ ok: true, count: 0 });
    }

    // Notifs visibles para el usuario MENOS las que ya tienen NotificationRead
    const count = await prisma.notification.count({
      where: {
        ...whereBase,
        reads: {
          none: { userId: user.id }
        }
      }
    });

    res.json({ ok: true, count });
  } catch (e) {
    console.error('GET /notifications/unread-count error:', e);
    res.status(500).json({ ok: false, error: 'Error obteniendo contador' });
  }
});

/**
 * GET /api/notifications
 * Lista notificaciones (paginado simple) visibles para el usuario actual.
 * Query: ?limit=20&cursor=<id>
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const user = req.sessionUser;
    const whereBase = whereForUser(user);

    if (user.rol === 'estudiante') {
      return res.json({ ok: true, notifications: [], nextCursor: null });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    const cursor = req.query.cursor ? { id: Number(req.query.cursor) } : undefined;

    const rows = await prisma.notification.findMany({
      where: whereBase,
      orderBy: { id: 'desc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor } : {}),
      select: {
        id: true,
        type: true,
        message: true,
        ticketId: true,
        actorId: true,
        departmentId: true,
        createdAt: true,
        reads: {
          where: { userId: user.id },
          select: { userId: true }
        }
      }
    });

    const nextCursor = rows.length === limit ? rows[rows.length - 1].id : null;
    res.json({ ok: true, notifications: rows, nextCursor });
  } catch (e) {
    console.error('GET /notifications error:', e);
    res.status(500).json({ ok: false, error: 'Error listando notificaciones' });
  }
});

/**
 * POST /api/notifications/mark-read
 * Marca como leídas una lista de notificaciones por id.
 * Body: { ids: number[] }  (si falta, no hace nada)
 */
router.post('/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    const user = req.sessionUser;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];

    if (!ids.length) return res.json({ ok: true, updated: 0 });

    // Evitar duplicados (PK compuesta (userId, notificationId))
    let updated = 0;
    for (const nid of ids) {
      try {
        await prisma.notificationRead.upsert({
          where: { userId_notificationId: { userId: user.id, notificationId: nid } },
          update: {},
          create: { userId: user.id, notificationId: nid }
        });
        updated += 1;
      } catch {}
    }

    res.json({ ok: true, updated });
  } catch (e) {
    console.error('POST /notifications/mark-read error:', e);
    res.status(500).json({ ok: false, error: 'Error marcando leídas' });
  }
});

module.exports = router;
