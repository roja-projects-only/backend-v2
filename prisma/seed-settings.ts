import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSettings() {
  try {
    console.log('🌱 Seeding settings...');

    // Get any user to associate with settings (required by schema)
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.error('❌ No users found. Please create a user first.');
      process.exit(1);
    }

    // Create default settings
    const defaultSettings = [
      { key: 'unitPrice', value: '23.00', type: 'number' },
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
          updatedById: user.id,
        },
      });
      console.log(`✅ Created setting: ${created.key} = ${created.value}`);
    }

    console.log('🎉 Settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding settings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSettings()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
