/**
 * Test Data Seed Script
 * 
 * Generates random sales data for 2 months (September-October 2025)
 * with customers across all locations.
 * 
 * Features:
 * - Creates 5-10 customers per location (except WALK_IN)
 * - Generates 15-30 random sales per customer across September-October 2025
 * - Ensures good daily coverage across all 61 days
 * - Realistic data patterns (varying quantities, custom pricing)
 * - Easy rollback via marker customer "TEST_DATA_MARKER"
 * 
 * Usage:
 *   npm run seed:test       # Create test data
 *   npm run seed:rollback   # Remove test data
 */

import { PrismaClient, Location } from '@prisma/client';

const prisma = new PrismaClient();

// Test data configuration
const MARKER_CUSTOMER_NAME = 'TEST_DATA_MARKER';
const CURRENT_YEAR = 2025;
const START_MONTH = 8; // September (0-indexed)
const END_MONTH = 9; // October (0-indexed)
const MIN_CUSTOMERS_PER_LOCATION = 5;
const MAX_CUSTOMERS_PER_LOCATION = 10;
const MIN_SALES_PER_CUSTOMER = 15; // ~25% of days covered per customer
const MAX_SALES_PER_CUSTOMER = 30; // ~50% of days covered per customer
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 10;
const BASE_UNIT_PRICE = 23.00;

// Sample customer names
const FIRST_NAMES = [
  'Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Miguel', 'Carmen', 
  'Luis', 'Elena', 'Carlos', 'Sofia', 'Fernando', 'Isabel', 'Ramon',
  'Gloria', 'Antonio', 'Teresa', 'Manuel', 'Patricia'
];

const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Lopez',
  'Gonzales', 'Rodriguez', 'Martinez', 'Hernandez', 'Diaz', 'Morales',
  'Ramos', 'Castillo', 'Torres', 'Rivera', 'Flores', 'Valdez', 'Santiago'
];

// Utility functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber(): string {
  const prefix = randomElement(['0917', '0918', '0919', '0920', '0921', '0922', '0923', '0926', '0927', '0928']);
  const suffix = randomInt(1000000, 9999999);
  return `${prefix}${suffix}`;
}

function generateCustomerName(): string {
  return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
}

function generateRandomDate(year: number, startMonth: number, endMonth: number): Date {
  // Randomly select a month within the range
  const month = randomInt(startMonth, endMonth);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = randomInt(1, daysInMonth);
  const hour = randomInt(6, 20); // Business hours 6 AM - 8 PM
  const minute = randomInt(0, 59);
  
  return new Date(year, month, day, hour, minute, 0);
}

function shouldApplyCustomPrice(): boolean {
  return Math.random() < 0.3; // 30% chance of custom pricing
}

function generateCustomPrice(): number {
  const variation = randomFloat(-5, 5);
  return parseFloat((BASE_UNIT_PRICE + variation).toFixed(2));
}

async function getAdminUser() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  
  if (!admin) {
    throw new Error('No admin user found. Please run the main seed first (npm run seed)');
  }
  
  return admin;
}

async function createMarkerCustomer(adminId: string) {
  const marker = await prisma.customer.create({
    data: {
      name: MARKER_CUSTOMER_NAME,
      location: Location.WALK_IN,
      phone: null,
      customUnitPrice: null,
      active: false, // Hidden marker
      createdById: adminId,
      notes: `Test data marker created at ${new Date().toISOString()}`,
    }
  });
  
  return marker;
}

async function seedTestData() {
  console.log('🌱 Starting test data seed for September-October 2025...\n');
  
  const admin = await getAdminUser();
  console.log(`✅ Found admin user: ${admin.username}\n`);
  
  // Check if test data already exists
  const existingMarker = await prisma.customer.findFirst({
    where: { name: MARKER_CUSTOMER_NAME }
  });
  
  if (existingMarker) {
    console.log('⚠️  Test data already exists!');
    console.log('   Run "npm run seed:rollback" first to remove existing test data.\n');
    return;
  }
  
  // Create marker customer for easy cleanup
  const marker = await createMarkerCustomer(admin.id);
  console.log(`✅ Created marker customer (ID: ${marker.id})\n`);
  
  // Get all locations except WALK_IN (which has the marker)
  const locations = Object.values(Location).filter(loc => loc !== Location.WALK_IN);
  
  let totalCustomers = 0;
  let totalSales = 0;
  
  // Create customers and sales for each location
  for (const location of locations) {
    const numCustomers = randomInt(MIN_CUSTOMERS_PER_LOCATION, MAX_CUSTOMERS_PER_LOCATION);
    console.log(`📍 ${location}: Creating ${numCustomers} customers...`);
    
    for (let i = 0; i < numCustomers; i++) {
      const customerName = generateCustomerName();
      const hasCustomPrice = shouldApplyCustomPrice();
      const customPrice = hasCustomPrice ? generateCustomPrice() : null;
      
      const customer = await prisma.customer.create({
        data: {
          name: customerName,
          location: location,
          phone: Math.random() < 0.8 ? generatePhoneNumber() : null, // 80% have phone
          customUnitPrice: customPrice,
          createdById: admin.id,
          notes: hasCustomPrice ? `Custom price: ₱${customPrice}/gal` : null,
        }
      });
      
      totalCustomers++;
      
      // Generate random sales for this customer across September-October
      const numSales = randomInt(MIN_SALES_PER_CUSTOMER, MAX_SALES_PER_CUSTOMER);
      const salesDates: Date[] = [];
      
      // Generate unique dates for each sale
      for (let j = 0; j < numSales; j++) {
        let saleDate: Date;
        let attempts = 0;
        
        // Ensure unique dates per customer
        do {
          saleDate = generateRandomDate(CURRENT_YEAR, START_MONTH, END_MONTH);
          attempts++;
        } while (
          salesDates.some(d => d.toDateString() === saleDate.toDateString()) &&
          attempts < 50
        );
        
        salesDates.push(saleDate);
        
        const quantity = randomInt(MIN_QUANTITY, MAX_QUANTITY);
        const unitPrice = customPrice || BASE_UNIT_PRICE;
        const total = parseFloat((quantity * unitPrice).toFixed(2));
        
        await prisma.sale.create({
          data: {
            customerId: customer.id,
            userId: admin.id,
            quantity: quantity,
            unitPrice: unitPrice,
            total: total,
            date: saleDate,
            notes: Math.random() < 0.2 ? 'Test data entry' : null,
          }
        });
        
        totalSales++;
      }
    }
    
    console.log(`   ✓ Created ${numCustomers} customers with sales\n`);
  }
  
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 Test data seed completed!\n');
  console.log(`📊 Summary:`);
  console.log(`   • Customers created: ${totalCustomers}`);
  console.log(`   • Sales created: ${totalSales}`);
  console.log(`   • Date range: September 1 - October 31, 2025`);
  console.log(`   • Locations covered: ${locations.length}`);
  console.log('\n💡 To remove this test data, run: npm run seed:rollback\n');
  console.log('═══════════════════════════════════════════════');
}

async function rollbackTestData() {
  console.log('🔄 Rolling back test data...\n');
  
  // Find the marker customer
  const marker = await prisma.customer.findFirst({
    where: { name: MARKER_CUSTOMER_NAME }
  });
  
  if (!marker) {
    console.log('⚠️  No test data found to rollback.\n');
    return;
  }
  
  console.log(`✅ Found marker customer (ID: ${marker.id})`);
  console.log(`   Created at: ${marker.createdAt}\n`);
  
  // Get all customers created after the marker (same createdAt or later)
  const testCustomers = await prisma.customer.findMany({
    where: {
      createdAt: {
        gte: marker.createdAt
      }
    },
    include: {
      _count: {
        select: { sales: true }
      }
    }
  });
  
  console.log(`📊 Found ${testCustomers.length} test customers with sales\n`);
  
  // Delete sales first (cascade will handle this, but explicit for logging)
  let totalSalesDeleted = 0;
  for (const customer of testCustomers) {
    const salesCount = customer._count.sales;
    if (salesCount > 0) {
      await prisma.sale.deleteMany({
        where: { customerId: customer.id }
      });
      totalSalesDeleted += salesCount;
    }
  }
  
  console.log(`✓ Deleted ${totalSalesDeleted} sales\n`);
  
  // Delete customers (including marker)
  const deletedCustomers = await prisma.customer.deleteMany({
    where: {
      createdAt: {
        gte: marker.createdAt
      }
    }
  });
  
  console.log(`✓ Deleted ${deletedCustomers.count} customers\n`);
  
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 Rollback completed!\n');
  console.log(`📊 Summary:`);
  console.log(`   • Customers removed: ${deletedCustomers.count}`);
  console.log(`   • Sales removed: ${totalSalesDeleted}`);
  console.log('\n💡 Run "npm run seed:test" to create new test data\n');
  console.log('═══════════════════════════════════════════════');
}

// Main execution
async function main() {
  const command = process.argv[2] || 'seed';
  
  if (command === 'rollback') {
    await rollbackTestData();
  } else {
    await seedTestData();
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
