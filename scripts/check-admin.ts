import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@aicodingblog.com' },
  });

  if (!admin) {
    console.log('❌ Admin user not found');
    return;
  }

  console.log('✅ Admin user found:');
  console.log('- ID:', admin.id);
  console.log('- Email:', admin.email);
  console.log('- Name:', admin.name);
  console.log('- Role:', admin.role);
  console.log('- Password Hash:', admin.passwordHash ? `Set (${admin.passwordHash.length} chars)` : '❌ NULL');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
