import { paymentsRepository } from './payments.repository';
import { 
  CreatePaymentDTO, 
  UpdatePaymentDTO, 
  PaymentFilters, 
  RecordPaymentDTO,
  PaymentSummary
} from './payments.types';
import { PaymentStatus, PaymentMethod, CollectionStatus } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../utils/errors';
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
      throw new BadRequestError('Payment already exists for this sale');
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
      throw new BadRequestError(`Credit limit exceeded. Current: ₱${currentOutstanding}, Limit: ₱${customer.creditLimit}, Requested: ₱${amount}`);
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

  // Record payment received (cash payment)
  async recordPayment(paymentId: string, amount: number, paymentMethod: PaymentMethod, userId: string, notes?: string) {
    const payment = await paymentsRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestError('Payment is already fully paid');
    }

    // Calculate remaining amount
    const remainingAmount = payment.amount - payment.paidAmount;

    if (amount <= 0) {
      throw new BadRequestError('Payment amount must be greater than zero');
    }

    if (amount > remainingAmount) {
      throw new BadRequestError(`Payment amount (₱${amount}) exceeds remaining balance (₱${remainingAmount})`);
    }

    // Calculate new paid amount and status
    const newPaidAmount = payment.paidAmount + amount;
    let newStatus = PaymentStatus.PARTIAL;

    if (newPaidAmount >= payment.amount) {
      newStatus = PaymentStatus.PAID;
    }

    // Update payment
    const updateData: UpdatePaymentDTO = {
      paidAmount: newPaidAmount,
      status: newStatus,
      paymentMethod,
      paidAt: new Date(),
      notes: notes || payment.notes,
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
        action: 'UPDATE',
        entity: 'Payment',
        entityId: payment.id,
        changes: {
          before: payment,
          after: updateData,
          paymentReceived: amount,
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
    
    let newStatus = CollectionStatus.ACTIVE;

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
}

export const paymentsService = new PaymentsService();