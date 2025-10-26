import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearData() {
  try {
    console.log('Starting data cleanup...');
    console.log('⚠️  This will delete all data EXCEPT users');
    console.log('');

    // Delete in order respecting foreign key constraints
    
    console.log('Deleting reminder notes...');
    const reminderNotes = await prisma.reminderNote.deleteMany({});
    console.log(`✓ Deleted ${reminderNotes.count} reminder notes`);

    console.log('Deleting payment transactions...');
    const paymentTransactions = await prisma.paymentTransaction.deleteMany({});
    console.log(`✓ Deleted ${paymentTransactions.count} payment transactions`);

    console.log('Deleting payments...');
    const payments = await prisma.payment.deleteMany({});
    console.log(`✓ Deleted ${payments.count} payments`);

    console.log('Deleting sales...');
    const sales = await prisma.sale.deleteMany({});
    console.log(`✓ Deleted ${sales.count} sales`);

    console.log('Deleting customers...');
    const customers = await prisma.customer.deleteMany({});
    console.log(`✓ Deleted ${customers.count} customers`);

    console.log('Deleting audit logs...');
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`✓ Deleted ${auditLogs.count} audit logs`);

    console.log('Deleting sessions...');
    const sessions = await prisma.session.deleteMany({});
    console.log(`✓ Deleted ${sessions.count} sessions`);

    console.log('Deleting settings...');
    const settings = await prisma.setting.deleteMany({});
    console.log(`✓ Deleted ${settings.count} settings`);

    console.log('');
    console.log('✅ Data cleanup completed successfully!');
    console.log('');
    console.log('Preserved:');
    const userCount = await prisma.user.count();
    console.log(`  - ${userCount} users`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
