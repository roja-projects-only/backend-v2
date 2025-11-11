import { Prisma, DebtStatus, DebtTransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';

const EPSILON = 0.005; // for floating balance checks

export interface ChargeInput {
  customerId: string;
  containers: number;
  transactionDate: Date;
  notes?: string;
}

export interface PaymentInput {
  customerId: string;
  amount: number;
  transactionDate: Date;
  notes?: string;
}

export interface AdjustmentInput {
  customerId: string;
  amount: number; // positive increases balance, negative decreases
  reason: string;
  transactionDate: Date;
  notes?: string;
}

export interface HistoryFilters {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  transactionType?: DebtTransactionType;
  status?: DebtStatus | 'ALL';
  page?: number;
  limit?: number;
}

class DebtsService {
  private async getUnitPrice(customerId: string): Promise<number> {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError(404, 'Customer not found');
    if (!customer.active) throw new AppError(400, 'Cannot record debt for inactive customer');

    if (customer.customUnitPrice && customer.customUnitPrice > 0) {
      return customer.customUnitPrice;
    }

    const global = await prisma.setting.findUnique({ where: { key: 'unitPrice' } });
    const val = global?.value ? parseFloat(global.value) : NaN;
    if (!isFinite(val) || val <= 0) {
      throw new AppError(500, 'Unit price setting is missing or invalid');
    }
    return val;
  }

  private async findOrCreateOpenTab(customerId: string, tx: Prisma.TransactionClient) {
    let tab = await tx.debtTab.findFirst({ where: { customerId, status: DebtStatus.OPEN } });
    if (!tab) {
      tab = await tx.debtTab.create({
        data: {
          customerId,
          status: DebtStatus.OPEN,
          totalBalance: 0,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'DebtTab',
          entityId: tab.id,
          changes: { customerId } as any,
          userId: 'system',
        },
      });
    }
    return tab;
  }

  async createCharge(input: ChargeInput, userId: string) {
    if (!input.containers || input.containers <= 0) {
      throw new AppError(400, 'Containers must be greater than 0');
    }

    const unitPrice = await this.getUnitPrice(input.customerId);
    const amount = input.containers * unitPrice;

    const result = await prisma.$transaction(async (tx) => {
      const tab = await this.findOrCreateOpenTab(input.customerId, tx);
      const newBalance = tab.totalBalance + amount;

      const trx = await tx.debtTransaction.create({
        data: {
          debtTabId: tab.id,
          transactionType: DebtTransactionType.CHARGE,
          containers: input.containers,
          unitPrice,
          amount,
          balanceAfter: newBalance,
          notes: input.notes,
          transactionDate: input.transactionDate,
          enteredById: userId,
        },
      });

      const updatedTab = await tx.debtTab.update({
        where: { id: tab.id },
        data: { totalBalance: newBalance },
      });

      return { transaction: trx, tab: updatedTab };
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'DebtTransaction',
        entityId: result.transaction.id,
        changes: {
          type: 'CHARGE',
          customerId: input.customerId,
          containers: input.containers,
          unitPrice,
          amount,
          balanceAfter: result.tab.totalBalance,
          transactionDate: input.transactionDate,
          notes: input.notes,
        } as any,
        userId,
      },
    });

    logger.info(`Debt charge created for customer ${input.customerId} by ${userId}`);
    return result;
  }

  async createPayment(input: PaymentInput, userId: string) {
    if (!input.amount || input.amount <= 0) {
      throw new AppError(400, 'Payment amount must be greater than 0');
    }

    const result = await prisma.$transaction(async (tx) => {
      const tab = await tx.debtTab.findFirst({ where: { customerId: input.customerId, status: DebtStatus.OPEN } });
      if (!tab) throw new AppError(404, 'No open debt tab for customer');

      if (input.amount - tab.totalBalance > EPSILON) {
        throw new AppError(400, 'Overpayment not allowed');
      }

      const newBalance = Math.max(0, tab.totalBalance - input.amount);

      const trx = await tx.debtTransaction.create({
        data: {
          debtTabId: tab.id,
          transactionType: DebtTransactionType.PAYMENT,
          amount: input.amount,
          balanceAfter: newBalance,
          notes: input.notes,
          transactionDate: input.transactionDate,
          enteredById: userId,
        },
      });

      // Close tab automatically if fully paid
      const tabData: Prisma.DebtTabUpdateInput = { totalBalance: newBalance };
      if (Math.abs(newBalance) < EPSILON) {
        tabData.status = DebtStatus.CLOSED;
        tabData.closedAt = input.transactionDate;
        tabData.totalBalance = 0;
      }

      const updatedTab = await tx.debtTab.update({ where: { id: tab.id }, data: tabData });

      return { transaction: trx, tab: updatedTab };
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'DebtTransaction',
        entityId: result.transaction.id,
        changes: {
          type: 'PAYMENT',
          customerId: input.customerId,
          amount: input.amount,
          balanceAfter: result.tab.totalBalance,
          transactionDate: input.transactionDate,
          notes: input.notes,
        } as any,
        userId,
      },
    });

    logger.info(`Debt payment recorded for customer ${input.customerId} by ${userId}`);
    return result;
  }

  async createAdjustment(input: AdjustmentInput, userId: string) {
    if (!input.reason || !input.reason.trim()) {
      throw new AppError(400, 'Adjustment reason is required');
    }
    if (!input.amount || Math.abs(input.amount) < EPSILON) {
      throw new AppError(400, 'Adjustment amount cannot be zero');
    }

    const result = await prisma.$transaction(async (tx) => {
      const tab = await tx.debtTab.findFirst({ where: { customerId: input.customerId, status: DebtStatus.OPEN } });
      if (!tab) throw new AppError(404, 'No open debt tab for customer');

      const newBalance = tab.totalBalance + input.amount;
      if (newBalance < -EPSILON) {
        throw new AppError(400, 'Adjustment would result in negative balance');
      }

      const trx = await tx.debtTransaction.create({
        data: {
          debtTabId: tab.id,
          transactionType: DebtTransactionType.ADJUSTMENT,
          amount: input.amount,
          balanceAfter: Math.max(0, newBalance),
          notes: input.notes,
          adjustmentReason: input.reason,
          transactionDate: input.transactionDate,
          enteredById: userId,
        },
      });

      const updatedTab = await tx.debtTab.update({
        where: { id: tab.id },
        data: { totalBalance: Math.max(0, newBalance) },
      });

      return { transaction: trx, tab: updatedTab };
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'DebtTransaction',
        entityId: result.transaction.id,
        changes: {
          type: 'ADJUSTMENT',
          customerId: input.customerId,
          amount: input.amount,
          reason: input.reason,
          balanceAfter: result.tab.totalBalance,
          transactionDate: input.transactionDate,
          notes: input.notes,
        } as any,
        userId,
      },
    });

    logger.info(`Debt adjustment recorded for customer ${input.customerId} by ${userId}`);
    return result;
  }

  async markPaid(customerId: string, transactionDate: Date, userId: string, finalPayment?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const tab = await tx.debtTab.findFirst({ where: { customerId, status: DebtStatus.OPEN } });
      if (!tab) throw new AppError(404, 'No open debt tab for customer');

      let currentBalance = tab.totalBalance;
      let paymentTrx: any | undefined;

      if (finalPayment && finalPayment > 0) {
        if (finalPayment - currentBalance > EPSILON) {
          throw new AppError(400, 'Final payment exceeds remaining balance');
        }

        const newBalance = Math.max(0, currentBalance - finalPayment);
        paymentTrx = await tx.debtTransaction.create({
          data: {
            debtTabId: tab.id,
            transactionType: DebtTransactionType.PAYMENT,
            amount: finalPayment,
            balanceAfter: newBalance,
            transactionDate,
            enteredById: userId,
          },
        });
        currentBalance = newBalance;
      }

      if (currentBalance > EPSILON) {
        throw new AppError(400, 'Cannot close tab with non-zero balance');
      }

      const closedTab = await tx.debtTab.update({
        where: { id: tab.id },
        data: { status: DebtStatus.CLOSED, closedAt: transactionDate, totalBalance: 0 },
      });

      return { tab: closedTab, transaction: paymentTrx };
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'DebtTab',
        entityId: result.tab.id,
        changes: { status: 'CLOSED', closedAt: transactionDate } as any,
        userId,
      },
    });

    logger.info(`Debt tab closed for customer ${customerId} by ${userId}`);
    return result;
  }

  async getCustomerDebt(customerId: string) {
    const [customer, tab] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.debtTab.findFirst({ where: { customerId, status: DebtStatus.OPEN } }),
    ]);

    if (!customer) throw new AppError(404, 'Customer not found');

    const transactions = tab
      ? await prisma.debtTransaction.findMany({
          where: { debtTabId: tab.id },
          orderBy: { transactionDate: 'desc' },
        })
      : [];

    return { customer, tab, transactions };
  }

  async getCustomerDebtHistory(customerId: string) {
    const tabs = await prisma.debtTab.findMany({
      where: { customerId },
      orderBy: { openedAt: 'desc' },
    });

    const tabIds = tabs.map((t) => t.id);
    const transactions = tabIds.length
      ? await prisma.debtTransaction.findMany({
          where: { debtTabId: { in: tabIds } },
          orderBy: { transactionDate: 'desc' },
        })
      : [];

    return { tabs, transactions };
  }

  async getTransactionHistory(filters: HistoryFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.DebtTransactionWhereInput = {};
    if (filters.customerId) {
      where.debtTab = { customerId: filters.customerId };
    }
    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) (where.transactionDate as any).gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        (where.transactionDate as any).lte = end;
      }
    }

    if (filters.status && filters.status !== 'ALL') {
      where.debtTab = { ...(where.debtTab || {}), status: filters.status } as any;
    }

    const [data, total] = await Promise.all([
      prisma.debtTransaction.findMany({
        where,
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
        include: { debtTab: { include: { customer: true } }, enteredBy: true },
      }),
      prisma.debtTransaction.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const debtsService = new DebtsService();
