import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('000000', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
      active: true,
    },
  });
  console.log('✅ Created admin user:', adminUser.username);

  // Create default settings
  const defaultSettings = [
    { key: 'unitPrice', value: '25.00', type: 'number' },
    { key: 'businessName', value: 'Yaris Ledger', type: 'string' },
    { key: 'enableCustomPricing', value: 'true', type: 'boolean' },
  ];

  for (const setting of defaultSettings) {
    const created = await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        updatedById: adminUser.id,
      },
    });
    console.log(`✅ Created setting: ${created.key} = ${created.value}`);
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
