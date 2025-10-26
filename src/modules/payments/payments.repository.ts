import { prisma } from '../../config/database';
import { 
  CreatePaymentDTO, 
  UpdatePaymentDTO, 
  PaymentFilters,
  OutstandingBalance,
  AgingReportData,
  CreatePaymentTransactionDTO,
  UpdatePaymentTransactionDTO,
  PaymentTransactionWithBalance
} from './payments.types';
import { PaymentStatus } from '@prisma/client';

export class PaymentsRepository {
  // Find all payments with filters
  async findAll(filters: PaymentFilters, skip: number, limit: number) {
    const where: any = {};

    // Customer filter
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Payment method filter
    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    // Date range filters
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        where.createdAt.lte = endDate;
      }
    }

    // Overdue filter
    if (filters.overdue) {
      where.status = PaymentStatus.OVERDUE;
      where.dueDate = {
        lt: new Date(),
      };
    }

    return prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        sale: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            total: true,
            date: true,
            paymentType: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Count payments with filters
  async count(filters: PaymentFilters) {
    const where: any = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (filters.overdue) {
      where.status = PaymentStatus.OVERDUE;
      where.dueDate = {
        lt: new Date(),
      };
    }

    return prisma.payment.count({ where });
  }

  // Find payment by ID
  async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        sale: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            total: true,
            date: true,
            paymentType: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        transactions: {
          include: {
            recordedBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  // Create payment
  async create(data: CreatePaymentDTO, recordedById: string) {
    return prisma.payment.create({
      data: {
        ...data,
        recordedById,
      },
      include: {
        sale: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            total: true,
            date: true,
            paymentType: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Update payment
  async update(id: string, data: UpdatePaymentDTO) {
    return prisma.payment.update({
      where: { id },
      data,
      include: {
        sale: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            total: true,
            date: true,
            paymentType: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Delete payment
  async delete(id: string) {
    return prisma.payment.delete({
      where: { id },
    });
  }

  // Get customer payment history
  async getCustomerPaymentHistory(customerId: string, skip: number = 0, limit: number = 50) {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { customerId },
        skip,
        take: limit,
        include: {
          sale: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              total: true,
              date: true,
              paymentType: true,
            },
          },
          recordedBy: {
            select: {
              id: true,
              username: true,
            },
          },
          transactions: {
            include: {
              recordedBy: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.payment.count({
        where: { customerId },
      }),
    ]);

    return { payments, total };
  }

  // Calculate customer outstanding balance
  async calculateOutstandingBalance(customerId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        customerId,
        status: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
        },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalOwed = result._sum.amount || 0;
    const totalPaid = result._sum.paidAmount || 0;
    return Math.max(0, totalOwed - totalPaid);
  }

  // Get all customers with outstanding balances
  async getCustomersWithOutstandingBalances(): Promise<OutstandingBalance[]> {
    const customers = await prisma.customer.findMany({
      where: {
        payments: {
          some: {
            status: {
              in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
            },
          },
        },
      },
      include: {
        payments: {
          where: {
            status: {
              in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
            },
          },
          orderBy: {
            dueDate: 'asc', // Order by due date to get oldest overdue first
          },
        },
      },
    });

    return customers.map(customer => {
      const totalOwed = customer.payments.reduce((sum, payment) => 
        sum + (payment.amount - payment.paidAmount), 0
      );
      
      const oldestPayment = customer.payments[0];
      // Use due date for aging calculation, fall back to created date if no due date
      const oldestDebtDate = oldestPayment?.dueDate || oldestPayment?.createdAt || null;
      const daysPastDue = oldestDebtDate 
        ? Math.floor((new Date().getTime() - oldestDebtDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        customerId: customer.id,
        customerName: customer.name,
        location: customer.location,
        totalOwed,
        oldestDebtDate,
        daysPastDue,
        creditLimit: customer.creditLimit,
        collectionStatus: customer.collectionStatus,
        lastPaymentDate: customer.lastPaymentDate,
      };
    });
  }

  // Get aging report data
  async getAgingReportData(): Promise<AgingReportData[]> {
    const customers = await prisma.customer.findMany({
      where: {
        payments: {
          some: {
            status: {
              in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
            },
          },
        },
      },
      include: {
        payments: {
          where: {
            status: {
              in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
            },
          },
        },
      },
    });

    return customers.map(customer => {
      const now = new Date();
      let current = 0;
      let days31to60 = 0;
      let days61to90 = 0;
      let over90Days = 0;

      customer.payments.forEach(payment => {
        const outstandingAmount = payment.amount - payment.paidAmount;
        // Calculate days past due from the due date, not creation date
        const dueDate = payment.dueDate || payment.createdAt;
        const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysPastDue <= 30) {
          current += outstandingAmount;
        } else if (daysPastDue <= 60) {
          days31to60 += outstandingAmount;
        } else if (daysPastDue <= 90) {
          days61to90 += outstandingAmount;
        } else {
          over90Days += outstandingAmount;
        }
      });

      const totalOwed = current + days31to60 + days61to90 + over90Days;

      return {
        customerId: customer.id,
        customerName: customer.name,
        location: customer.location,
        current,
        days31to60,
        days61to90,
        over90Days,
        totalOwed,
        collectionStatus: customer.collectionStatus,
      };
    });
  }

  // Get overdue payments
  async getOverduePayments(daysPastDue: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysPastDue);

    return prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL],
        },
        createdAt: {
          lt: cutoffDate,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
          },
        },
        sale: {
          select: {
            id: true,
            date: true,
            total: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Update customer outstanding balance (helper method)
  async updateCustomerOutstandingBalance(customerId: string) {
    const outstandingBalance = await this.calculateOutstandingBalance(customerId);
    
    await prisma.customer.update({
      where: { id: customerId },
      data: { outstandingBalance },
    });

    return outstandingBalance;
  }

  // Get payment summary/KPIs
  async getPaymentSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total outstanding
    const outstandingResult = await prisma.payment.aggregate({
      where: {
        status: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
        },
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalOutstanding = (outstandingResult._sum.amount || 0) - (outstandingResult._sum.paidAmount || 0);

    // Overdue payments
    const overdueResult = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.OVERDUE,
      },
      _sum: {
        amount: true,
        paidAmount: true,
      },
    });

    const totalOverdue = (overdueResult._sum.amount || 0) - (overdueResult._sum.paidAmount || 0);

    // Customers with debt
    const customersWithDebt = await prisma.customer.count({
      where: {
        outstandingBalance: {
          gt: 0,
        },
      },
    });

    // Overdue customers
    const overdueCustomers = await prisma.customer.count({
      where: {
        collectionStatus: 'OVERDUE',
      },
    });

    // Payment transactions received today
    const transactionsToday = await prisma.paymentTransaction.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      totalOutstanding,
      totalOverdue,
      customersWithDebt,
      overdueCustomers,
      averageDebtAge: 0, // Will be calculated in service layer
      totalPaymentsToday: transactionsToday._sum.amount || 0,
      paymentsReceivedToday: transactionsToday._count || 0,
    };
  }
}

// PaymentTransaction Repository
export class PaymentTransactionRepository {
  // Create payment transaction
  async create(data: CreatePaymentTransactionDTO, recordedById: string) {
    return prisma.paymentTransaction.create({
      data: {
        ...data,
        recordedById,
      },
      include: {
        payment: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Get all transactions for a payment
  async findByPaymentId(paymentId: string) {
    return prisma.paymentTransaction.findMany({
      where: { paymentId },
      include: {
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Get transaction by ID
  async findById(id: string) {
    return prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Update transaction notes
  async update(id: string, data: UpdatePaymentTransactionDTO) {
    return prisma.paymentTransaction.update({
      where: { id },
      data,
      include: {
        payment: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Delete transaction (admin only)
  async delete(id: string) {
    return prisma.paymentTransaction.delete({
      where: { id },
    });
  }

  // Calculate running balance after each transaction
  async getTransactionsWithRunningBalance(paymentId: string): Promise<PaymentTransactionWithBalance[]> {
    // Get payment details
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        amount: true,
        status: true,
        paidAmount: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!payment) {
      return [];
    }

    // Get all transactions for this payment
    const transactions = await prisma.paymentTransaction.findMany({
      where: { paymentId },
      include: {
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Calculate running balance for each transaction
    let cumulativePaid = 0;
    const transactionsWithBalance: PaymentTransactionWithBalance[] = transactions.map(transaction => {
      cumulativePaid += transaction.amount;
      const runningBalance = payment.amount - cumulativePaid;

      return {
        ...transaction,
        payment: {
          id: paymentId,
          amount: payment.amount,
          status: payment.status,
          paidAmount: payment.paidAmount,
          customerId: payment.customerId,
          customer: payment.customer,
        },
        runningBalance: Math.max(0, runningBalance),
      };
    });

    return transactionsWithBalance;
  }

  // Get transactions filtered by date range
  async findByDateRange(startDate: Date, endDate: Date) {
    return prisma.paymentTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            sale: {
              select: {
                id: true,
                date: true,
                total: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Count transactions for a payment
  async countByPaymentId(paymentId: string): Promise<number> {
    return prisma.paymentTransaction.count({
      where: { paymentId },
    });
  }

  // Sum of all transactions for a payment
  async sumByPaymentId(paymentId: string): Promise<number> {
    const result = await prisma.paymentTransaction.aggregate({
      where: { paymentId },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }
}

export const paymentTransactionRepository = new PaymentTransactionRepository();

export const paymentsRepository = new PaymentsRepository();