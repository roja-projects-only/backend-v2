import {
  PrismaClient,
  PaymentType,
  PaymentStatus,
  PaymentMethod,
  CollectionStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// Helper to get date X days ago
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(9, 0, 0, 0); // Set to 9 AM
  return date;
}

async function seedMonthData() {
  try {
    console.log("🌱 Seeding month data with sales and payments...");

    // Get admin user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("❌ No users found. Please create a user first.");
      process.exit(1);
    }

    const unitPrice = 23;

    // Create diverse customers across different locations
    const customersData = [
      {
        name: "Juan Dela Cruz",
        location: "BANAI" as const,
        phone: "09123456789",
        creditLimit: 3000,
      },
      {
        name: "Maria Santos",
        location: "UPPER_LOOB" as const,
        phone: "09987654321",
        creditLimit: 2500,
      },
      {
        name: "Pedro Garcia",
        location: "SAN_ISIDRO" as const,
        phone: "09555123456",
        creditLimit: 2000,
      },
      {
        name: "Ana Reyes",
        location: "LOWER_LOOB" as const,
        phone: "09111222333",
        creditLimit: 1500,
      },
      {
        name: "Jose Ramos",
        location: "PINATUBO" as const,
        phone: "09444555666",
        creditLimit: 2000,
      },
      {
        name: "Linda Cruz",
        location: "PLASTIKAN" as const,
        phone: "09777888999",
        creditLimit: 1800,
      },
      {
        name: "Carlos Mendoza",
        location: "ZUNIGA" as const,
        phone: "09222333444",
        creditLimit: 2200,
      },
      {
        name: "Rosa Flores",
        location: "URBAN" as const,
        phone: "09666777888",
        creditLimit: 1600,
      },
      {
        name: "Miguel Torres",
        location: "JOVIL_3" as const,
        phone: "09333444555",
        creditLimit: 1900,
      },
      {
        name: "Sofia Bautista",
        location: "DOUBE_L" as const,
        phone: "09888999000",
        creditLimit: 2100,
      },
    ];

    const customers = [];
    for (const data of customersData) {
      const customer = await prisma.customer.create({
        data: {
          ...data,
          createdById: user.id,
        },
      });
      customers.push(customer);
      console.log(`✅ Created customer: ${customer.name}`);
    }

    // Generate sales for the past 120 days (to create proper aging buckets)
    console.log("\n📊 Generating sales data...");

    let totalSales = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    for (let day = 120; day >= 0; day--) {
      const saleDate = daysAgo(day);

      // Each day, 3-5 random customers make purchases
      const numSales = Math.floor(Math.random() * 3) + 3;
      const shuffled = [...customers].sort(() => Math.random() - 0.5);
      const dailyCustomers = shuffled.slice(0, numSales);

      for (const customer of dailyCustomers) {
        // Random quantity between 3-10 containers
        const quantity = Math.floor(Math.random() * 8) + 3;
        const total = quantity * unitPrice;

        // 70% credit, 30% cash
        const paymentType =
          Math.random() < 0.7 ? PaymentType.CREDIT : PaymentType.CASH;

        const sale = await prisma.sale.create({
          data: {
            quantity,
            unitPrice,
            total,
            date: saleDate,
            paymentType,
            customerId: customer.id,
            userId: user.id,
            notes: paymentType === "CREDIT" ? "Credit sale" : "Cash payment",
          },
        });

        totalSales += total;

        if (paymentType === PaymentType.CREDIT) {
          // Determine payment status based on age
          let status: PaymentStatus;
          let paidAmount = 0;
          let dueDate = new Date(saleDate);
          dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

          if (day > 90) {
            // Very old sales (90-120 days ago): 80% paid, 15% overdue, 5% collection
            const rand = Math.random();
            if (rand < 0.8) {
              status = PaymentStatus.PAID;
              paidAmount = total;
              totalPaid += total;
            } else if (rand < 0.95) {
              status = PaymentStatus.OVERDUE;
              totalUnpaid += total;
            } else {
              status = PaymentStatus.COLLECTION;
              totalUnpaid += total;
            }
          } else if (day > 60) {
            // Old sales (60-90 days ago): 70% paid, 25% overdue, 5% unpaid
            const rand = Math.random();
            if (rand < 0.7) {
              status = PaymentStatus.PAID;
              paidAmount = total;
              totalPaid += total;
            } else if (rand < 0.95) {
              status = PaymentStatus.OVERDUE;
              totalUnpaid += total;
            } else {
              status = PaymentStatus.UNPAID;
              totalUnpaid += total;
            }
          } else if (day > 30) {
            // Medium-old sales (30-60 days ago): 60% paid, 30% overdue, 10% unpaid
            const rand = Math.random();
            if (rand < 0.6) {
              status = PaymentStatus.PAID;
              paidAmount = total;
              totalPaid += total;
            } else if (rand < 0.9) {
              status = PaymentStatus.OVERDUE;
              totalUnpaid += total;
            } else {
              status = PaymentStatus.UNPAID;
              totalUnpaid += total;
            }
          } else if (day > 14) {
            // Older sales (15-30 days ago): 50% paid, 40% unpaid, 10% overdue
            const rand = Math.random();
            if (rand < 0.5) {
              status = PaymentStatus.PAID;
              paidAmount = total;
              totalPaid += total;
            } else if (rand < 0.9) {
              status = PaymentStatus.UNPAID;
              totalUnpaid += total;
            } else {
              status = PaymentStatus.OVERDUE;
              totalUnpaid += total;
            }
          } else if (day > 7) {
            // Medium age (8-14 days ago): 40% paid, 50% unpaid, 10% overdue
            const rand = Math.random();
            if (rand < 0.4) {
              status = PaymentStatus.PAID;
              paidAmount = total;
              totalPaid += total;
            } else if (rand < 0.9) {
              status = PaymentStatus.UNPAID;
              totalUnpaid += total;
            } else {
              status = PaymentStatus.OVERDUE;
              totalUnpaid += total;
            }
          } else {
            // Recent sales (0-7 days ago): 20% paid, 80% unpaid
            const rand = Math.random();
            if (rand < 0.2) {
              status = PaymentStatus.PAID;
              paidAmount = total;
              totalPaid += total;
            } else {
              status = PaymentStatus.UNPAID;
              totalUnpaid += total;
            }
          }

          const payment = await prisma.payment.create({
            data: {
              amount: total,
              status,
              paidAmount,
              dueDate,
              saleId: sale.id,
              customerId: customer.id,
              recordedById: user.id,
              notes: status === "PAID" ? "Paid in full" : undefined,
            },
          });

          // If paid, create a payment transaction
          if (status === PaymentStatus.PAID) {
            const paymentDate = new Date(saleDate);
            paymentDate.setDate(
              paymentDate.getDate() + Math.floor(Math.random() * 5) + 1
            ); // Paid 1-5 days after sale

            await prisma.paymentTransaction.create({
              data: {
                amount: total,
                paymentMethod: PaymentMethod.CASH,
                notes: "Full payment",
                paymentId: payment.id,
                recordedById: user.id,
                createdAt: paymentDate,
              },
            });
          }
        } else {
          // Cash sale - no payment record needed
          totalPaid += total;
        }
      }
    }

    // Update customer outstanding balances
    console.log("\n💰 Calculating customer balances...");
    for (const customer of customers) {
      const unpaidPayments = await prisma.payment.findMany({
        where: {
          customerId: customer.id,
          status: { in: [PaymentStatus.UNPAID, PaymentStatus.OVERDUE] },
        },
      });

      const outstandingBalance = unpaidPayments.reduce(
        (sum, p) => sum + (p.amount - p.paidAmount),
        0
      );

      // Get last payment date
      const lastTransaction = await prisma.paymentTransaction.findFirst({
        where: {
          payment: { customerId: customer.id },
        },
        orderBy: { createdAt: "desc" },
      });

      // Determine collection status
      let collectionStatus: CollectionStatus = CollectionStatus.ACTIVE;
      if (outstandingBalance > customer.creditLimit! * 0.8) {
        collectionStatus = CollectionStatus.SUSPENDED;
      } else if (outstandingBalance > customer.creditLimit! * 0.5) {
        collectionStatus = CollectionStatus.OVERDUE;
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          outstandingBalance,
          lastPaymentDate: lastTransaction?.createdAt,
          collectionStatus,
        },
      });

      console.log(
        `  ${customer.name}: ₱${outstandingBalance.toFixed(2)} outstanding`
      );


    }

    console.log("\n📈 Summary:");
    console.log(`  Total Sales: ₱${totalSales.toFixed(2)}`);
    console.log(`  Total Paid: ₱${totalPaid.toFixed(2)}`);
    console.log(`  Total Unpaid: ₱${totalUnpaid.toFixed(2)}`);
    console.log(`  Customers: ${customers.length}`);

    const salesCount = await prisma.sale.count();
    const paymentsCount = await prisma.payment.count();
    const transactionsCount = await prisma.paymentTransaction.count();
    const overdueCount = await prisma.payment.count({
      where: { status: { in: ["OVERDUE", "COLLECTION"] } },
    });

    console.log(`  Sales Records: ${salesCount}`);
    console.log(`  Payment Records: ${paymentsCount}`);
    console.log(`  Payment Transactions: ${transactionsCount}`);
    console.log(`  Overdue Payments: ${overdueCount}`);

    console.log("\n🎉 120-day data seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding month data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMonthData().catch((error) => {
  console.error(error);
  process.exit(1);
});
