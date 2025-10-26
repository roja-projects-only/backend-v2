import { paymentsRepository, paymentTransactionRepository } from './payments.repository';
import { 
  CreatePaymentDTO, 
  UpdatePaymentDTO, 
  PaymentFilters,
  PaymentSummary,
  CreatePaymentTransactionDTO,
  UpdatePaymentTransactionDTO
} from './payments.types';
import { PaymentStatus, PaymentMethod, CollectionStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { prisma } from '../../config/database';

export class PaymentsService {
  // Get all payments with pagination
  async getAllPayments(filters: PaymentFilters, skip: number, limit: number) {
    const payments = await paymentsRepository.findAll(filters, skip, limit);
    const total = await paymentsRepository.count(filters);

    return { payments, total };
  }

  // Get payment by ID
  async getPaymentById(id: string) {
    const payment = await paymentsRepository.findById(id);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    return payment;
  }

  // Get payments by IDs
  async getPaymentsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    
    return prisma.payment.findMany({
      where: {
        id: { in: ids },
      },
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
            quantity: true,
            unitPrice: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  // Create credit payment (when sale is marked as credit)
  async createCreditPayment(saleId: string, amount: number, customerId: string, userId: string, dueDate?: Date) {
    // Verify sale exists and is not already paid
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { payment: true },
    });

    if (!sale) {
      throw new NotFoundError('Sale');
    }

    if (sale.payment) {
      throw new ValidationError('Payment already exists for this sale');
    }

    // Check customer credit limit
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Calculate new outstanding balance
    const currentOutstanding = await paymentsRepository.calculateOutstandingBalance(customerId);
    const newOutstanding = currentOutstanding + amount;

    // Check credit limit
    if (customer.creditLimit && newOutstanding > customer.creditLimit) {
      throw new ValidationError(`Credit limit exceeded. Current: ₱${currentOutstanding}, Limit: ₱${customer.creditLimit}, Requested: ₱${amount}`);
    }

    // Create payment record
    const paymentData: CreatePaymentDTO = {
      amount,
      saleId,
      customerId,
      dueDate,
    };

    const payment = await paymentsRepository.create(paymentData, userId);

    // Update customer outstanding balance
    await paymentsRepository.updateCustomerOutstandingBalance(customerId);

    // Update collection status if needed
    await this.updateCustomerCollectionStatus(customerId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        changes: { paymentData } as any,
      },
    });

    return payment;
  }

  // Record payment received (cash payment) - Creates PaymentTransaction
  async recordPayment(paymentId: string, amount: number, paymentMethod: PaymentMethod, userId: string, notes?: string) {
    const payment = await paymentsRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new ValidationError('Payment is already fully paid');
    }

    // Calculate remaining amount
    const remainingAmount = payment.amount - payment.paidAmount;

    if (amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    if (amount > remainingAmount) {
      throw new ValidationError(`Payment amount (₱${amount}) exceeds remaining balance (₱${remainingAmount})`);
    }

    // Create payment transaction record
    const transactionData: CreatePaymentTransactionDTO = {
      paymentId,
      amount,
      paymentMethod,
      notes,
    };

    const transaction = await paymentTransactionRepository.create(transactionData, userId);

    // Calculate new paid amount from all transactions
    const totalPaid = await paymentTransactionRepository.sumByPaymentId(paymentId);
    let newStatus: PaymentStatus = PaymentStatus.PARTIAL;

    if (totalPaid >= payment.amount) {
      newStatus = PaymentStatus.PAID;
    }

    // Update payment with new totals
    const updateData: UpdatePaymentDTO = {
      paidAmount: totalPaid,
      status: newStatus,
    };

    const updatedPayment = await paymentsRepository.update(paymentId, updateData);

    // Update customer outstanding balance
    await paymentsRepository.updateCustomerOutstandingBalance(payment.customerId);

    // Update customer last payment date
    await prisma.customer.update({
      where: { id: payment.customerId },
      data: { lastPaymentDate: new Date() },
    });

    // Update collection status
    await this.updateCustomerCollectionStatus(payment.customerId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'PaymentTransaction',
        entityId: transaction.id,
        changes: {
          paymentId,
          amount,
          paymentMethod,
          notes,
          newPaidAmount: totalPaid,
          newStatus,
        } as any,
      },
    });

    return updatedPayment;
  }

  // Calculate outstanding balance for customer
  async calculateOutstandingBalance(customerId: string): Promise<number> {
    return paymentsRepository.calculateOutstandingBalance(customerId);
  }

  // Get customer payment history
  async getCustomerPaymentHistory(customerId: string, skip: number = 0, limit: number = 50) {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return paymentsRepository.getCustomerPaymentHistory(customerId, skip, limit);
  }

  // Get customers with outstanding balances
  async getCustomersWithOutstandingBalances() {
    return paymentsRepository.getCustomersWithOutstandingBalances();
  }

  // Get aging report
  async getAgingReport() {
    return paymentsRepository.getAgingReportData();
  }

  // Get overdue payments
  async getOverduePayments(daysPastDue: number = 30) {
    return paymentsRepository.getOverduePayments(daysPastDue);
  }

  // Validate credit limit before sale
  async validateCreditLimit(customerId: string, additionalAmount: number): Promise<{ 
    allowed: boolean; 
    currentOutstanding: number; 
    creditLimit: number | null; 
    newTotal: number;
    warningThreshold: boolean;
  }> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const currentOutstanding = await this.calculateOutstandingBalance(customerId);
    const newTotal = currentOutstanding + additionalAmount;
    const creditLimit = customer.creditLimit;

    let allowed = true;
    let warningThreshold = false;

    if (creditLimit) {
      // Check if exceeds limit
      if (newTotal > creditLimit) {
        allowed = false;
      }
      // Check if approaching limit (80% threshold)
      else if (newTotal >= creditLimit * 0.8) {
        warningThreshold = true;
      }
    }

    return {
      allowed,
      currentOutstanding,
      creditLimit,
      newTotal,
      warningThreshold,
    };
  }

  // Update customer collection status based on outstanding balance and overdue payments
  async updateCustomerCollectionStatus(customerId: string) {
    const outstandingBalance = await this.calculateOutstandingBalance(customerId);
    
    let newStatus: CollectionStatus = CollectionStatus.ACTIVE;

    if (outstandingBalance > 0) {
      // Check for overdue payments (30+ days)
      const overduePayments = await prisma.payment.findMany({
        where: {
          customerId,
          status: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL],
          },
          createdAt: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          },
        },
      });

      if (overduePayments.length > 0) {
        newStatus = CollectionStatus.OVERDUE;
      }
    }

    // Update customer collection status
    await prisma.customer.update({
      where: { id: customerId },
      data: { collectionStatus: newStatus },
    });

    return newStatus;
  }

  // Get payment summary/KPIs
  async getPaymentSummary(): Promise<PaymentSummary> {
    const summary = await paymentsRepository.getPaymentSummary();

    // Calculate average debt age
    const outstandingPayments = await prisma.payment.findMany({
      where: {
        status: {
          in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL, PaymentStatus.OVERDUE],
        },
      },
      select: {
        createdAt: true,
        amount: true,
        paidAmount: true,
      },
    });

    let totalWeightedAge = 0;
    let totalOutstandingAmount = 0;

    outstandingPayments.forEach(payment => {
      const outstandingAmount = payment.amount - payment.paidAmount;
      const ageInDays = Math.floor((new Date().getTime() - payment.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      totalWeightedAge += ageInDays * outstandingAmount;
      totalOutstandingAmount += outstandingAmount;
    });

    const averageDebtAge = totalOutstandingAmount > 0 ? Math.round(totalWeightedAge / totalOutstandingAmount) : 0;

    return {
      ...summary,
      averageDebtAge,
    };
  }

  // Update payment
  async updatePayment(id: string, data: UpdatePaymentDTO, userId: string) {
    const existing = await paymentsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Payment');
    }

    const payment = await paymentsRepository.update(id, data);

    // Update customer outstanding balance if payment amount changed
    if (data.paidAmount !== undefined || data.status !== undefined) {
      await paymentsRepository.updateCustomerOutstandingBalance(payment.customerId);
      await this.updateCustomerCollectionStatus(payment.customerId);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Payment',
        entityId: payment.id,
        changes: {
          before: existing,
          after: data,
        } as any,
      },
    });

    return payment;
  }

  // Delete payment (admin only)
  async deletePayment(id: string, userId: string) {
    const existing = await paymentsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Payment');
    }

    await paymentsRepository.delete(id);

    // Update customer outstanding balance
    await paymentsRepository.updateCustomerOutstandingBalance(existing.customerId);
    await this.updateCustomerCollectionStatus(existing.customerId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Payment',
        entityId: existing.id,
        changes: { deleted: existing } as any,
      },
    });

    return { message: 'Payment deleted successfully' };
  }

  // Mark payments as overdue (to be called by scheduled job)
  async markOverduePayments(daysPastDue: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysPastDue);

    const overduePayments = await prisma.payment.updateMany({
      where: {
        status: PaymentStatus.UNPAID,
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        status: PaymentStatus.OVERDUE,
      },
    });

    // Update collection status for affected customers
    const affectedCustomers = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.OVERDUE,
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        customerId: true,
      },
      distinct: ['customerId'],
    });

    for (const payment of affectedCustomers) {
      await this.updateCustomerCollectionStatus(payment.customerId);
    }

    return {
      markedOverdue: overduePayments.count,
      affectedCustomers: affectedCustomers.length,
    };
  }

  // Get payment transactions for a date range
  async getPaymentTransactionsForDateRange(startDate: Date, endDate: Date) {
    const transactions = await prisma.paymentTransaction.findMany({
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

    return transactions;
  }

  // Get payment transaction history for a payment
  async getPaymentTransactionHistory(paymentId: string) {
    // Verify payment exists
    const payment = await paymentsRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    return paymentTransactionRepository.getTransactionsWithRunningBalance(paymentId);
  }

  // Get payment transaction by ID
  async getPaymentTransactionById(id: string) {
    const transaction = await paymentTransactionRepository.findById(id);
    if (!transaction) {
      throw new NotFoundError('PaymentTransaction');
    }

    return transaction;
  }

  // Update payment transaction notes
  async updatePaymentTransaction(id: string, data: UpdatePaymentTransactionDTO, userId: string) {
    const existing = await paymentTransactionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('PaymentTransaction');
    }

    const transaction = await paymentTransactionRepository.update(id, data);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'PaymentTransaction',
        entityId: transaction.id,
        changes: {
          before: existing,
          after: data,
        } as any,
      },
    });

    return transaction;
  }

  // Delete payment transaction (admin only)
  async deletePaymentTransaction(id: string, userId: string) {
    const existing = await paymentTransactionRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('PaymentTransaction');
    }

    const paymentId = existing.paymentId;

    await paymentTransactionRepository.delete(id);

    // Recalculate payment totals
    const payment = await paymentsRepository.findById(paymentId);
    if (payment) {
      const totalPaid = await paymentTransactionRepository.sumByPaymentId(paymentId);
      let newStatus: PaymentStatus = PaymentStatus.UNPAID;

      if (totalPaid > 0 && totalPaid < payment.amount) {
        newStatus = PaymentStatus.PARTIAL;
      } else if (totalPaid >= payment.amount) {
        newStatus = PaymentStatus.PAID;
      }

      await paymentsRepository.update(paymentId, {
        paidAmount: totalPaid,
        status: newStatus,
      });

      // Update customer outstanding balance
      await paymentsRepository.updateCustomerOutstandingBalance(payment.customerId);
      await this.updateCustomerCollectionStatus(payment.customerId);
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'PaymentTransaction',
        entityId: existing.id,
        changes: { deleted: existing } as any,
      },
    });

    return { message: 'Payment transaction deleted successfully' };
  }
}

export const paymentsService = new PaymentsService();