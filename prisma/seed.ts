import { PrismaClient, UserRole, PaymentType, PaymentStatus, PaymentMethod, CollectionStatus } from '@prisma/client';
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

  // Create Walk-In Customer
  // Check if walk-in customer already exists by name
  const existingWalkIn = await prisma.customer.findFirst({
    where: { 
      name: 'Walk-In Customer',
      location: 'WALK_IN'
    }
  });

  let walkInCustomer;
  if (!existingWalkIn) {
    walkInCustomer = await prisma.customer.create({
      data: {
        name: 'Walk-In Customer',
        location: 'WALK_IN',
        phone: null,
        customUnitPrice: null,
        createdById: adminUser.id,
      },
    });
    console.log('✅ Created Walk-In Customer:', walkInCustomer.name);
  } else {
    walkInCustomer = existingWalkIn;
    console.log('✅ Walk-In Customer already exists');
  }

  // Create sample customers with credit transactions
  const sampleCustomers = [
    {
      name: 'Juan Dela Cruz',
      location: 'BANAI' as const,
      phone: '09123456789',
      creditLimit: 2000,
    },
    {
      name: 'Maria Santos',
      location: 'UPPER_LOOB' as const,
      phone: '09987654321',
      creditLimit: 1500,
    },
    {
      name: 'Pedro Garcia',
      location: 'SAN_ISIDRO' as const,
      phone: '09555123456',
      creditLimit: 1000,
    },
  ];

  for (const customerData of sampleCustomers) {
    const existingCustomer = await prisma.customer.findFirst({
      where: { 
        name: customerData.name,
        location: customerData.location
      }
    });

    if (!existingCustomer) {
      const customer = await prisma.customer.create({
        data: {
          name: customerData.name,
          location: customerData.location,
          phone: customerData.phone,
          creditLimit: customerData.creditLimit,
          createdById: adminUser.id,
        },
      });

      // Create sample credit sales for each customer
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);
      
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);

      // Recent credit sale (3 days ago)
      const recentSale = await prisma.sale.create({
        data: {
          quantity: 5,
          unitPrice: 25,
          total: 125,
          date: threeDaysAgo,
          paymentType: PaymentType.CREDIT,
          customerId: customer.id,
          userId: adminUser.id,
          notes: 'Credit sale - customer will pay next week',
        },
      });

      // Create payment record for the credit sale
      await prisma.payment.create({
        data: {
          amount: 125,
          status: PaymentStatus.UNPAID,
          saleId: recentSale.id,
          customerId: customer.id,
          recordedById: adminUser.id,
          dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });

      // Older credit sale (1 week ago) - partially paid
      const olderSale = await prisma.sale.create({
        data: {
          quantity: 8,
          unitPrice: 25,
          total: 200,
          date: oneWeekAgo,
          paymentType: PaymentType.CREDIT,
          customerId: customer.id,
          userId: adminUser.id,
          notes: 'Credit sale - large order',
        },
      });

      // Create payment record for the older sale (partially paid)
      const partialPayment = await prisma.payment.create({
        data: {
          amount: 200,
          status: PaymentStatus.PARTIAL,
          paymentMethod: PaymentMethod.CASH,
          paidAmount: 100,
          paidAt: new Date(oneWeekAgo.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days after sale
          saleId: olderSale.id,
          customerId: customer.id,
          recordedById: adminUser.id,
          dueDate: oneWeekAgo,
          notes: 'Partial payment received - ₱100 of ₱200',
        },
      });

      // Update customer's outstanding balance
      const outstandingBalance = 125 + (200 - 100); // Recent sale + remaining from older sale
      await prisma.customer.update({
        where: { id: customer.id },
        data: { 
          outstandingBalance,
          lastPaymentDate: partialPayment.paidAt,
        },
      });

      // Add a reminder note for customers with outstanding balance
      if (outstandingBalance > 0) {
        await prisma.reminderNote.create({
          data: {
            note: `Customer has outstanding balance of ₱${outstandingBalance}. Friendly reminder sent.`,
            reminderDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            customerId: customer.id,
            createdById: adminUser.id,
          },
        });
      }

      console.log(`✅ Created sample customer with credit transactions: ${customer.name} (Outstanding: ₱${outstandingBalance})`);
    }
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
