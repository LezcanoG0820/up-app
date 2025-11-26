// apps/api/utils/notifications.js
// Utilidad mínima para crear notificaciones SIN romper nada existente.

async function createNotification(prisma, {
  type,           // 'TICKET_CREATED' | 'TICKET_REPLIED' | 'TICKET_REASSIGNED' | 'TICKET_COMPLETED'
  message,        // texto breve visible en la campana
  ticketId = null,
  actorId = null,
  departmentId = null
}) {
  try {
    const notif = await prisma.notification.create({
      data: {
        type,
        message: String(message),
        ticketId: ticketId ?? null,
        actorId: actorId ?? null,
        departmentId: departmentId ?? null
      }
    });
    return notif;
  } catch (e) {
    console.error('createNotification error:', e);
    return null;
  }
}

/**
 * Filtro de audiencia simple:
 * - admin y recepcion: ven TODAS.
 * - departamento: ve null (globales) + las de su departmentId.
 * - estudiante: por ahora no ve notificaciones (count 0, lista vacía).
 */
function whereForUser(user) {
  if (!user) return { id: -1 }; // nadie
  if (user.rol === 'admin' || user.rol === 'recepcion') {
    return {}; // todas
  }
  if (user.rol === 'departamento') {
    const deptId = user.departamentoId || -1;
    return {
      OR: [
        { departmentId: null },
        { departmentId: deptId }
      ]
    };
  }
  // estudiante
  return { id: -1 };
}

module.exports = { createNotification, whereForUser };
