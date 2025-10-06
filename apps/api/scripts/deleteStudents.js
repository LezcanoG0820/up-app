// apps/api/scripts/deleteStudents.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main () {
  console.log('> Buscando estudiantes…')
  const students = await prisma.user.findMany({
    where: { rol: 'estudiante' },
    select: { id: true }
  })

  if (!students.length) {
    console.log('No hay estudiantes para borrar.')
    return
  }

  const studentIds = students.map(s => s.id)

  console.log(`> Estudiantes encontrados: ${studentIds.length}`)

  // 1) Tickets de esos estudiantes
  const tickets = await prisma.ticket.findMany({
    where: { estudianteId: { in: studentIds } },
    select: { id: true }
  })
  const ticketIds = tickets.map(t => t.id)
  console.log(`> Tickets de esos estudiantes: ${ticketIds.length}`)

  // 2) Borrar adjuntos de esos tickets
  if (ticketIds.length) {
    const delAtt = await prisma.ticketAttachment.deleteMany({
      where: { ticketId: { in: ticketIds } }
    })
    console.log(`> Adjuntos borrados: ${delAtt.count}`)
  }

  // 3) Borrar mensajes (por ticket o por autor estudiante)
  const delMsgs = await prisma.ticketMessage.deleteMany({
    where: {
      OR: [
        { ticketId: { in: ticketIds } },
        { autorUserId: { in: studentIds } }
      ]
    }
  })
  console.log(`> Mensajes borrados: ${delMsgs.count}`)

  // 4) Borrar logs de auditoría (por ticket o actor estudiante)
  const delLogs = await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { ticketId: { in: ticketIds } },
        { actorId: { in: studentIds } }
      ]
    }
  })
  console.log(`> Audit logs borrados: ${delLogs.count}`)

  // 5) Borrar tickets
  if (ticketIds.length) {
    const delT = await prisma.ticket.deleteMany({
      where: { id: { in: ticketIds } }
    })
    console.log(`> Tickets borrados: ${delT.count}`)
  }

  // 6) Borrar usuarios (rol estudiante)
  const delU = await prisma.user.deleteMany({
    where: { rol: 'estudiante' }
  })
  console.log(`> Estudiantes borrados: ${delU.count}`)

  console.log('✓ Limpieza completa.')
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
