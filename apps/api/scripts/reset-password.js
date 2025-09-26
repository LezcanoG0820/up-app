// apps/api/scripts/reset-password.js
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [,, emailArg, plainArg] = process.argv;
  if (!emailArg || !plainArg) {
    console.error('Uso: node scripts/reset-password.js <email> "<NuevaClave>"');
    process.exit(1);
  }
  const email = String(emailArg).trim().toLowerCase();
  const plain = String(plainArg);

  const hash = await bcrypt.hash(plain, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash: hash, failedLoginCount: 0, lockedUntil: null }
  });

  console.log(`OK: password actualizado para ${user.email}`);
}

main()
  .catch(e => { console.error('Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
