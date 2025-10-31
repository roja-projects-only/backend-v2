/**
 * Clear Data Script
 * 
 * ⚠️ IMPORTANT: This script clears customer and sale data but PRESERVES the walk-in customer record.
 * The walk-in customer (name: 'Walk-In Customer', location: 'WALK_IN') will never be deleted.
 * 
 * Usage: npx ts-node prisma/clear-data.ts
 * 
 * This is useful for:
 * - Resetting test data while maintaining walk-in customer availability
 * - Cleaning up old sales/customer records without affecting the system customer
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting selective data cleanup...');
  console.log('⚠️  Walk-In Customer will be PRESERVED');

  try {
    // Step 1: Find the walk-in customer ID so we can exclude it
    const walkInCustomer = await prisma.customer.findFirst({
      where: {
        name: 'Walk-In Customer',
        location: 'WALK_IN',
      },
    });

    if (!walkInCustomer) {
      console.warn('⚠️  Walk-In Customer not found. Creating it before cleanup...');
      const adminUser = await prisma.user.findFirst({
        where: { username: 'admin' },
      });

      if (!adminUser) {
        console.error('❌ Admin user not found. Cannot create walk-in customer.');
        process.exit(1);
      }

      const newWalkIn = await prisma.customer.create({
        data: {
          name: 'Walk-In Customer',
          location: 'WALK_IN',
          phone: null,
          customUnitPrice: null,
          createdById: adminUser.id,
        },
      });

      console.log('✅ Created Walk-In Customer:', newWalkIn.name);
    }

    const walkInId = walkInCustomer?.id || (await prisma.customer.findFirst({
      where: { name: 'Walk-In Customer', location: 'WALK_IN' },
    }))?.id;

    if (!walkInId) {
      throw new Error('Failed to ensure Walk-In Customer exists');
    }

    // Step 2: Delete all sales (cascade will handle related records)
    console.log('Deleting all sales...');
    const deletedSales = await prisma.sale.deleteMany({});
    console.log(`✅ Deleted ${deletedSales.count} sales`);

    // Step 3: Delete all customers EXCEPT walk-in
    console.log('Deleting customers (excluding Walk-In)...');
    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        id: { not: walkInId },
      },
    });
    console.log(`✅ Deleted ${deletedCustomers.count} customers`);
    console.log(`✅ Preserved Walk-In Customer (ID: ${walkInId})`);

    // Step 4: Verify walk-in customer still exists
    const verifyWalkIn = await prisma.customer.findUnique({
      where: { id: walkInId },
    });

    if (verifyWalkIn) {
      console.log('✅ Walk-In Customer verified intact:', verifyWalkIn.name);
    } else {
      console.error('❌ Walk-In Customer was deleted! This should not happen.');
      process.exit(1);
    }

    console.log('🎉 Cleanup completed successfully!');
    console.log('📊 Remaining records:');
    console.log(`   - Customers: ${(await prisma.customer.count())}`);
    console.log(`   - Sales: ${(await prisma.sale.count())}`);
    console.log(`   - Users: ${(await prisma.user.count())}`);
    console.log(`   - Settings: ${(await prisma.setting.count())}`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
