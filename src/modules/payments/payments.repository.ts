import { prisma } from '../../config/database';
import { 
  CreatePaymentDTO, 
  UpdatePaymentDTO, 
  PaymentFilters,
  OutstandingBalance,
  AgingReportData
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
    return prisma.payment.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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
            createdAt: 'asc',
          },
        },
      },
    });

    return customers.map(customer => {
      const totalOwed = customer.payments.reduce((sum, payment) => 
        sum + (payment.amount - payment.paidAmount), 0
      );
      
      const oldestPayment = customer.payments[0];
      const oldestDebtDate = oldestPayment?.createdAt || null;
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
        const daysPastDue = Math.floor((now.getTime() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24));

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

    // Payments received today
    const paymentsToday = await prisma.payment.aggregate({
      where: {
        paidAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        paidAmount: true,
      },
      _count: true,
    });

    return {
      totalOutstanding,
      totalOverdue,
      customersWithDebt,
      overdueCustomers,
      averageDebtAge: 0, // Will be calculated in service layer
      totalPaymentsToday: paymentsToday._sum.paidAmount || 0,
      paymentsReceivedToday: paymentsToday._count || 0,
    };
  }
}

export const paymentsRepository = new PaymentsRepository();