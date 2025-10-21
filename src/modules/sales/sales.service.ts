import { CreateSaleDTO, UpdateSaleDTO, SaleFilters, DailySalesData, LocationPerformance, CustomerPerformance, SalesSummary } from './sales.types';
import { salesRepository } from './sales.repository';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../config/logger';
import { paymentsService } from '../payments/payments.service';
import { PaymentType } from '@prisma/client';

export class SalesService {
  // List sales with filters
  async listSales(filters: SaleFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      salesRepository.findAll(filters, skip, limit),
      salesRepository.count(filters),
    ]);

    return {
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get sale by ID
  async getSaleById(id: string) {
    const sale = await salesRepository.findById(id);

    if (!sale) {
      throw new AppError(404, 'Sale not found');
    }

    return sale;
  }

  // Create sale (with upsert logic)
  async createSale(data: CreateSaleDTO, userId: string, adminOverride: boolean = false) {
    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new AppError(404, 'Customer not found');
    }

    if (!customer.active) {
      throw new AppError(400, 'Cannot create sale for inactive customer');
    }

    // Calculate total: quantity × unitPrice
    const total = data.quantity * data.unitPrice;
    const paymentType = data.paymentType || PaymentType.CASH;

    // Credit limit validation for credit sales
    let creditValidation = null;
    if (paymentType === PaymentType.CREDIT) {
      creditValidation = await paymentsService.validateCreditLimit(data.customerId, total);
      
      if (!creditValidation.allowed && !adminOverride) {
        throw new AppError(400, `Credit limit exceeded. Current outstanding: ₱${creditValidation.currentOutstanding}, Credit limit: ₱${creditValidation.creditLimit}, Requested: ₱${total}. New total would be: ₱${creditValidation.newTotal}`);
      }
    }

    // Check if sale already exists for this customer on this date
    const existingSale = await salesRepository.findByCustomerAndDate(
      data.customerId,
      data.date.toISOString()
    );

    if (existingSale) {
      // UPDATE existing sale (upsert behavior)
      const updatedSale = await salesRepository.update(
        existingSale.id,
        {
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          notes: data.notes,
          paymentType,
        },
        total
      );

      // Handle payment record for credit sales
      if (paymentType === PaymentType.CREDIT) {
        // Check if payment record exists
        const existingPayment = await prisma.payment.findUnique({
          where: { saleId: existingSale.id },
        });

        if (!existingPayment) {
          // Create payment record for updated credit sale
          await paymentsService.createCreditPayment(
            existingSale.id,
            total,
            data.customerId,
            userId
          );
        } else {
          // Update existing payment record amount
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { amount: total },
          });
          
          // Recalculate customer outstanding balance
          await prisma.payment.findFirst({
            where: { customerId: data.customerId },
          }).then(() => {
            return paymentsService.calculateOutstandingBalance(data.customerId);
          }).then(async (newBalance) => {
            await prisma.customer.update({
              where: { id: data.customerId },
              data: { outstandingBalance: newBalance },
            });
          });
        }
      } else if (existingSale.paymentType === PaymentType.CREDIT && paymentType === PaymentType.CASH) {
        // Sale changed from credit to cash - remove payment record
        await prisma.payment.deleteMany({
          where: { saleId: existingSale.id },
        });
        
        // Recalculate customer outstanding balance
        const newBalance = await paymentsService.calculateOutstandingBalance(data.customerId);
        await prisma.customer.update({
          where: { id: data.customerId },
          data: { outstandingBalance: newBalance },
        });
      }

      // Audit log for update
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entity: 'Sale',
          entityId: existingSale.id,
          changes: {
            before: {
              quantity: existingSale.quantity,
              unitPrice: existingSale.unitPrice,
              total: existingSale.total,
              notes: existingSale.notes,
              paymentType: existingSale.paymentType,
            },
            after: {
              quantity: data.quantity,
              unitPrice: data.unitPrice,
              total,
              notes: data.notes,
              paymentType,
            },
            adminOverride,
            creditValidation,
          } as any,
          userId,
        },
      });

      logger.info(`Sale updated (upsert): ${existingSale.id} by user ${userId}, paymentType: ${paymentType}`);

      return {
        ...updatedSale,
        wasUpdated: true,
        creditWarning: creditValidation?.warningThreshold || false,
        creditValidation,
      };
    } else {
      // CREATE new sale
      const sale = await salesRepository.create(data, userId, total);

      // Create payment record for credit sales
      if (paymentType === PaymentType.CREDIT) {
        await paymentsService.createCreditPayment(
          sale.id,
          total,
          data.customerId,
          userId
        );
      }

      // Audit log for create
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'Sale',
          entityId: sale.id,
          changes: {
            customerId: data.customerId,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            total,
            date: data.date,
            notes: data.notes,
            paymentType,
            adminOverride,
            creditValidation,
          } as any,
          userId,
        },
      });

      logger.info(`Sale created: ${sale.id} by user ${userId}, paymentType: ${paymentType}`);

      return {
        ...sale,
        wasUpdated: false,
        creditWarning: creditValidation?.warningThreshold || false,
        creditValidation,
      };
    }
  }

  // Update sale
  async updateSale(id: string, data: UpdateSaleDTO, userId: string, isAdmin: boolean, userAgent?: string, ipAddress?: string) {
    const existingSale = await salesRepository.findById(id);

    if (!existingSale) {
      throw new AppError(404, 'Sale not found');
    }

    // Access control: staff can only update their own sales
    if (!isAdmin && existingSale.userId !== userId) {
      throw new AppError(403, 'Unauthorized to update this sale');
    }

    // Validate customer if being changed
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });

      if (!customer) {
        throw new AppError(404, 'Customer not found');
      }

      if (!customer.active) {
        throw new AppError(400, 'Cannot assign sale to inactive customer');
      }
    }

    // Recalculate total if quantity or unitPrice changed
    let total: number | undefined;
    const quantity = data.quantity ?? existingSale.quantity;
    const unitPrice = data.unitPrice ?? existingSale.unitPrice;

    if (data.quantity !== undefined || data.unitPrice !== undefined) {
      total = quantity * unitPrice;
    }

    // Update sale
    const sale = await salesRepository.update(id, data, total);

    // Audit log
    const changes: any = {};
    if (data.customerId) changes.customerId = { from: existingSale.customerId, to: data.customerId };
    if (data.quantity) changes.quantity = { from: existingSale.quantity, to: data.quantity };
    if (data.unitPrice) changes.unitPrice = { from: existingSale.unitPrice, to: data.unitPrice };
    if (total !== undefined) changes.total = { from: existingSale.total, to: total };
    if (data.date) changes.date = { from: existingSale.date, to: data.date };
    if (data.notes !== undefined) changes.notes = { from: existingSale.notes, to: data.notes };

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Sale',
        entityId: id,
        changes: changes as any,
        userId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`Sale updated: ${id} by user ${userId}`);

    return sale;
  }

  // Delete sale
  async deleteSale(id: string, userId: string, isAdmin: boolean, userAgent?: string, ipAddress?: string) {
    const sale = await salesRepository.findById(id);

    if (!sale) {
      throw new AppError(404, 'Sale not found');
    }

    // Access control: staff can only delete their own sales within 24 hours
    if (!isAdmin) {
      if (sale.userId !== userId) {
        throw new AppError(403, 'Unauthorized to delete this sale');
      }

      const saleAge = Date.now() - sale.createdAt.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (saleAge > twentyFourHours) {
        throw new AppError(403, 'Cannot delete sales older than 24 hours');
      }
    }

    // Delete sale (hard delete)
    await salesRepository.delete(id);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entity: 'Sale',
        entityId: id,
        changes: {
          customerId: sale.customerId,
          quantity: sale.quantity,
          unitPrice: sale.unitPrice,
          total: sale.total,
          date: sale.date,
        } as any,
        userId,
        userAgent,
        ipAddress,
      },
    });

    logger.info(`Sale deleted: ${id} by user ${userId}`);

    return { message: 'Sale deleted successfully' };
  }

  // Get daily sales trend
  async getDailySalesTrend(startDate: string, endDate: string): Promise<DailySalesData[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Include end date

    const data = await salesRepository.aggregateByDateRange(start, end);

    return data as DailySalesData[];
  }

  // Get location performance
  async getLocationPerformance(startDate: string, endDate: string): Promise<LocationPerformance[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const data = await salesRepository.aggregateByLocation(start, end);

    return data as LocationPerformance[];
  }

  // Get customer purchase history
  async getCustomerHistory(customerId: string) {
    const filters: SaleFilters = { customerId };

    const sales = await salesRepository.findAll(filters, 0, 1000);

    // Group by date
    const dateMap = new Map<string, any>();

    for (const sale of sales) {
      const dateKey = sale.date.toISOString().split('T')[0];
      const existing = dateMap.get(dateKey) || {
        date: dateKey,
        sales: [],
        totalRevenue: 0,
        totalQuantity: 0,
      };

      existing.sales.push(sale);
      existing.totalRevenue += sale.total;
      existing.totalQuantity += sale.quantity;

      dateMap.set(dateKey, existing);
    }

    return Array.from(dateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  // Get sales summary
  async getSalesSummary(startDate: string, endDate: string): Promise<SalesSummary> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);

    const summary = await salesRepository.getSummary(start, end);

    return {
      ...summary,
      topCustomer: summary.topCustomer || undefined,
    };
  }
}

export const salesService = new SalesService();
