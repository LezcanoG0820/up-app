// C:\Users\guill\OneDrive\Documents\GitHub\up-app\apps\api\prisma\seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Departamentos base
  const recepcion = await prisma.department.upsert({
    where: { slug: 'recepcion' },
    update: {},
    create: { nombre: 'Recepción', slug: 'recepcion' }
  });
  const administracion = await prisma.department.upsert({
    where: { slug: 'administracion' },
    update: {},
    create: { nombre: 'Administración', slug: 'administracion' }
  });
  const contabilidad = await prisma.department.upsert({
    where: { slug: 'contabilidad' },
    update: {},
    create: { nombre: 'Contabilidad', slug: 'contabilidad' }
  });

  // Tipos de ticket
  await prisma.ticketType.upsert({
    where: { nombre: 'Pagos' },
    update: {},
    create: { nombre: 'Pagos', departmentId: contabilidad.id }
  });
  await prisma.ticketType.upsert({
    where: { nombre: 'Errores de pago' },
    update: {},
    create: { nombre: 'Errores de pago', departmentId: contabilidad.id }
  });
  await prisma.ticketType.upsert({
    where: { nombre: 'Pruebas' },
    update: {},
    create: { nombre: 'Pruebas', departmentId: administracion.id }
  });
  await prisma.ticketType.upsert({
    where: { nombre: 'Resultados' },
    update: {},
    create: { nombre: 'Resultados', departmentId: administracion.id }
  });

  console.log('Seed completado ✅');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
