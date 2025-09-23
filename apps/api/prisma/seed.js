// apps/api/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function hash(pwd) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pwd, salt);
}

async function main() {
  // 1) Departamentos base
  const recepcionDept = await prisma.department.upsert({
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

  // 2) Tipos de ticket → enrutamiento por defecto
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

  // 3) Usuarios internos (admin, recepción y usuarios de departamentos)
  const pwdAdmin       = await hash('Admin#2025');        // cámbiala luego
  const pwdRecepcion   = await hash('Recepcion#2025');    // cámbiala luego
  const pwdAdminDept   = await hash('AdminDept#2025');    // cámbiala luego
  const pwdContabDept  = await hash('ContabDept#2025');   // cámbiala luego

  // Admin general (ve todo)
  await prisma.user.upsert({
    where: { email: 'admin@siu.local' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'General',
      cedula: 'A-00000001',
      email: 'admin@siu.local',
      passwordHash: pwdAdmin,
      rol: 'admin',
      twoFactorEnabled: true,   // 2FA obligatorio para admins
      twoFactorSecret: null,    // se configurará luego en la UI
      failedLoginCount: 0
    }
  });

  // Recepción (ve todos los tickets)
  await prisma.user.upsert({
    where: { email: 'recepcion@siu.local' },
    update: {},
    create: {
      nombre: 'Recepción',
      apellido: 'SIU',
      cedula: 'R-00000001',
      email: 'recepcion@siu.local',
      passwordHash: pwdRecepcion,
      rol: 'recepcion',
      departamentoId: recepcionDept.id,
      twoFactorEnabled: true,   // 2FA obligatorio para recepción
      twoFactorSecret: null,
      failedLoginCount: 0
    }
  });

  // Usuario de Departamento: Administración
  await prisma.user.upsert({
    where: { email: 'admin.administracion@siu.local' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Administración',
      cedula: 'D-ADM-0001',
      email: 'admin.administracion@siu.local',
      passwordHash: pwdAdminDept,
      rol: 'departamento',
      departamentoId: administracion.id,
      twoFactorEnabled: true,   // recomendado
      twoFactorSecret: null
    }
  });

  // Usuario de Departamento: Contabilidad
  await prisma.user.upsert({
    where: { email: 'analista.contabilidad@siu.local' },
    update: {},
    create: {
      nombre: 'Analista',
      apellido: 'Contabilidad',
      cedula: 'D-CNT-0001',
      email: 'analista.contabilidad@siu.local',
      passwordHash: pwdContabDept,
      rol: 'departamento',
      departamentoId: contabilidad.id,
      twoFactorEnabled: true,
      twoFactorSecret: null
    }
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
