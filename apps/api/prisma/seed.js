// apps/api/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function hash(pwd) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pwd, salt);
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // ==========================================
  // 1) DEPARTAMENTOS
  // ==========================================
  
  const recepcionDept = await prisma.department.upsert({
    where: { slug: 'recepcion' },
    update: {},
    create: { nombre: 'Recepción', slug: 'recepcion' }
  });
  console.log('✅ Departamento: Recepción');

  const administracion = await prisma.department.upsert({
    where: { slug: 'administracion' },
    update: {},
    create: { nombre: 'Área Administrativa', slug: 'administracion' }
  });
  console.log('✅ Departamento: Área Administrativa');

  const areaTecnica = await prisma.department.upsert({
    where: { slug: 'area-tecnica' },
    update: {},
    create: { nombre: 'Área Técnica', slug: 'area-tecnica' }
  });
  console.log('✅ Departamento: Área Técnica');

  const direccion = await prisma.department.upsert({
    where: { slug: 'direccion' },
    update: {},
    create: { nombre: 'Dirección', slug: 'direccion' }
  });
  console.log('✅ Departamento: Dirección');

  const informatica = await prisma.department.upsert({
    where: { slug: 'informatica' },
    update: {},
    create: { nombre: 'Informática', slug: 'informatica' }
  });
  console.log('✅ Departamento: Informática');

  // ==========================================
  // 2) TIPOS DE TICKET
  // ==========================================

  await prisma.ticketType.upsert({
    where: { nombre: 'Pagos' },
    update: { departmentId: areaTecnica.id }, // Reasignado a Área Técnica
    create: { nombre: 'Pagos', departmentId: areaTecnica.id }
  });
  console.log('✅ TicketType: Pagos → Área Técnica');

  await prisma.ticketType.upsert({
    where: { nombre: 'Errores de pago' },
    update: { departmentId: areaTecnica.id }, // Reasignado a Área Técnica
    create: { nombre: 'Errores de pago', departmentId: areaTecnica.id }
  });
  console.log('✅ TicketType: Errores de pago → Área Técnica');

  await prisma.ticketType.upsert({
    where: { nombre: 'Pruebas' },
    update: { departmentId: administracion.id },
    create: { nombre: 'Pruebas', departmentId: administracion.id }
  });
  console.log('✅ TicketType: Pruebas → Administración');

  await prisma.ticketType.upsert({
    where: { nombre: 'Resultados' },
    update: { departmentId: administracion.id },
    create: { nombre: 'Resultados', departmentId: administracion.id }
  });
  console.log('✅ TicketType: Resultados → Administración');

  // ==========================================
  // 3) USUARIOS
  // ==========================================

  // Contraseñas (cambiar en producción)
  const pwdMaestro      = await hash('Maestro#2025');
  const pwdRecepcion    = await hash('Recepcion#2025');
  const pwdAdmin        = await hash('AdminDept#2025');
  const pwdAreaTecnica  = await hash('AreaTecnica#2025');
  const pwdDireccion    = await hash('Direccion#2025');
  const pwdInformatica  = await hash('Informatica#2025');

  // Usuario Maestro (antes admin)
  await prisma.user.upsert({
    where: { email: 'maestro@siu.local' },
    update: { rol: 'maestro' }, // Actualiza si ya existe con rol antiguo
    create: {
      nombre: 'Usuario',
      apellido: 'Maestro',
      cedula: 'M-00000001',
      email: 'maestro@siu.local',
      passwordHash: pwdMaestro,
      rol: 'maestro',
      twoFactorEnabled: true,
      twoFactorSecret: null,
      failedLoginCount: 0
    }
  });
  console.log('✅ Usuario: Usuario Maestro (maestro@siu.local)');

  // Recepción
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
      twoFactorEnabled: true,
      twoFactorSecret: null,
      failedLoginCount: 0
    }
  });
  console.log('✅ Usuario: Recepción (recepcion@siu.local)');

  // Área Administrativa
  await prisma.user.upsert({
    where: { email: 'admin.administracion@siu.local' },
    update: {},
    create: {
      nombre: 'Admin',
      apellido: 'Administración',
      cedula: 'D-ADM-0001',
      email: 'admin.administracion@siu.local',
      passwordHash: pwdAdmin,
      rol: 'departamento',
      departamentoId: administracion.id,
      twoFactorEnabled: true,
      twoFactorSecret: null
    }
  });
  console.log('✅ Usuario: Admin Administración (admin.administracion@siu.local)');

  // Área Técnica
  await prisma.user.upsert({
    where: { email: 'analista.areatecnica@siu.local' },
    update: {},
    create: {
      nombre: 'Analista',
      apellido: 'Área Técnica',
      cedula: 'D-TEC-0001',
      email: 'analista.areatecnica@siu.local',
      passwordHash: pwdAreaTecnica,
      rol: 'departamento',
      departamentoId: areaTecnica.id,
      twoFactorEnabled: true,
      twoFactorSecret: null
    }
  });
  console.log('✅ Usuario: Analista Área Técnica (analista.areatecnica@siu.local)');

  // Dirección
  await prisma.user.upsert({
    where: { email: 'coordinador.direccion@siu.local' },
    update: {},
    create: {
      nombre: 'Coordinador',
      apellido: 'Dirección',
      cedula: 'D-DIR-0001',
      email: 'coordinador.direccion@siu.local',
      passwordHash: pwdDireccion,
      rol: 'departamento',
      departamentoId: direccion.id,
      twoFactorEnabled: true,
      twoFactorSecret: null
    }
  });
  console.log('✅ Usuario: Coordinador Dirección (coordinador.direccion@siu.local)');

  // Informática
  await prisma.user.upsert({
    where: { email: 'soporte.informatica@siu.local' },
    update: {},
    create: {
      nombre: 'Soporte',
      apellido: 'Informática',
      cedula: 'D-INF-0001',
      email: 'soporte.informatica@siu.local',
      passwordHash: pwdInformatica,
      rol: 'departamento',
      departamentoId: informatica.id,
      twoFactorEnabled: true,
      twoFactorSecret: null
    }
  });
  console.log('✅ Usuario: Soporte Informática (soporte.informatica@siu.local)');

  console.log('\n🎉 Seed completado exitosamente');
  console.log('\n📋 CREDENCIALES DE ACCESO:');
  console.log('='.repeat(50));
  console.log('Usuario Maestro:');
  console.log('  Email: maestro@siu.local');
  console.log('  Pass:  Maestro#2025');
  console.log('');
  console.log('Recepción:');
  console.log('  Email: recepcion@siu.local');
  console.log('  Pass:  Recepcion#2025');
  console.log('');
  console.log('Área Administrativa:');
  console.log('  Email: admin.administracion@siu.local');
  console.log('  Pass:  AdminDept#2025');
  console.log('');
  console.log('Área Técnica:');
  console.log('  Email: analista.areatecnica@siu.local');
  console.log('  Pass:  AreaTecnica#2025');
  console.log('');
  console.log('Dirección:');
  console.log('  Email: coordinador.direccion@siu.local');
  console.log('  Pass:  Direccion#2025');
  console.log('');
  console.log('Informática:');
  console.log('  Email: soporte.informatica@siu.local');
  console.log('  Pass:  Informatica#2025');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });