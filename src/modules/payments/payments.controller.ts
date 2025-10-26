import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { paymentsService } from './payments.service';
import { sendSuccess } from '../../utils/response';
import { PaymentFilters, RecordPaymentDTO, UpdatePaymentDTO } from './payments.types';
import { PaymentMethod } from '@prisma/client';

export class PaymentsController {
  // List payments with filters (GET /api/payments)
  async listPayments(req: AuthRequest, res: Response): Promise<void> {
    const filters: PaymentFilters = {
      customerId: req.query.customerId as string,
      status: req.query.status as any,
      paymentMethod: req.query.paymentMethod as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      overdue: req.query.overdue === 'true',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const skip = ((filters.page || 1) - 1) * (filters.limit || 50);
    const result = await paymentsService.getAllPayments(filters, skip, filters.limit || 50);

    const response = {
      payments: result.payments,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 50,
        total: result.total,
        totalPages: Math.ceil(result.total / (filters.limit || 50)),
      },
    };

    sendSuccess(res, response, 'Payments retrieved successfully');
  }

  // Get payment by ID (GET /api/payments/:id)
  async getPaymentById(req: AuthRequest, res: Response): Promise<void> {
    const payment = await paymentsService.getPaymentById(req.params.id);

    sendSuccess(res, payment, 'Payment retrieved successfully');
  }

  // Record payment received (POST /api/payments)
  async recordPayment(req: AuthRequest, res: Response): Promise<void> {
    const data: RecordPaymentDTO = req.body;

    const payment = await paymentsService.recordPayment(
      data.paymentId,
      data.amount,
      data.paymentMethod,
      req.user!.userId,
      data.notes
    );

    sendSuccess(res, payment, 'Payment recorded successfully', 201);
  }

  // Record payment on payment ID (POST /api/payments/:id/record)
  async recordPaymentById(req: AuthRequest, res: Response): Promise<void> {
    const { amount, paymentMethod, notes } = req.body;

    const payment = await paymentsService.recordPayment(
      req.params.id,
      amount,
      paymentMethod,
      req.user!.userId,
      notes
    );

    sendSuccess(res, payment, 'Payment recorded successfully', 201);
  }

  // Update payment (PUT /api/payments/:id)
  async updatePayment(req: AuthRequest, res: Response): Promise<void> {
    const data: UpdatePaymentDTO = req.body;

    const payment = await paymentsService.updatePayment(
      req.params.id,
      data,
      req.user!.userId
    );

    sendSuccess(res, payment, 'Payment updated successfully');
  }

  // Delete payment (DELETE /api/payments/:id) - Admin only
  async deletePayment(req: AuthRequest, res: Response): Promise<void> {
    const result = await paymentsService.deletePayment(
      req.params.id,
      req.user!.userId
    );

    sendSuccess(res, null, result.message);
  }

  // Get customer payment history (GET /api/customers/:id/payments)
  async getCustomerPaymentHistory(req: AuthRequest, res: Response): Promise<void> {
    const customerId = req.params.id;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const skip = (page - 1) * limit;

    const result = await paymentsService.getCustomerPaymentHistory(customerId, skip, limit);

    const response = {
      payments: result.payments,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };

    sendSuccess(res, response, 'Customer payment history retrieved successfully');
  }

  // Record payment for specific customer (POST /api/customers/:id/payments)
  async recordCustomerPayment(req: AuthRequest, res: Response): Promise<void | Response> {
    const customerId = req.params.id;
    const { paymentId, amount, paymentMethod, notes } = req.body;

    // Validate that the payment belongs to this customer
    const payment = await paymentsService.getPaymentById(paymentId);
    if (payment.customerId !== customerId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYMENT',
          message: 'Payment does not belong to this customer',
        },
      });
    }

    const updatedPayment = await paymentsService.recordPayment(
      paymentId,
      amount,
      paymentMethod || PaymentMethod.CASH,
      req.user!.userId,
      notes
    );

    sendSuccess(res, updatedPayment, 'Customer payment recorded successfully', 201);
  }

  // Get customer outstanding balance (GET /api/customers/:id/outstanding)
  async getCustomerOutstandingBalance(req: AuthRequest, res: Response): Promise<void> {
    const customerId = req.params.id;

    const outstandingBalance = await paymentsService.calculateOutstandingBalance(customerId);

    const response = {
      customerId,
      outstandingBalance,
      calculatedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Customer outstanding balance retrieved successfully');
  }

  // Get all customers with outstanding balances (GET /api/payments/outstanding)
  async getCustomersWithOutstandingBalances(req: AuthRequest, res: Response): Promise<void> {
    const customers = await paymentsService.getCustomersWithOutstandingBalances();

    const response = {
      customers,
      totalCustomers: customers.length,
      totalOutstanding: customers.reduce((sum, customer) => sum + customer.totalOwed, 0),
      retrievedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Customers with outstanding balances retrieved successfully');
  }

  // Get aging report (GET /api/reports/aging)
  async getAgingReport(req: AuthRequest, res: Response): Promise<void> {
    const agingData = await paymentsService.getAgingReport();

    const summary = {
      totalCustomers: agingData.length,
      totalOutstanding: agingData.reduce((sum, customer) => sum + customer.totalOwed, 0),
      current: agingData.reduce((sum, customer) => sum + customer.current, 0),
      days31to60: agingData.reduce((sum, customer) => sum + customer.days31to60, 0),
      days61to90: agingData.reduce((sum, customer) => sum + customer.days61to90, 0),
      over90Days: agingData.reduce((sum, customer) => sum + customer.over90Days, 0),
    };

    const response = {
      summary,
      customers: agingData,
      generatedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Aging report retrieved successfully');
  }

  // Get payment summary/KPIs (GET /api/payments/summary)
  async getPaymentSummary(req: AuthRequest, res: Response): Promise<void> {
    const summary = await paymentsService.getPaymentSummary();

    sendSuccess(res, summary, 'Payment summary retrieved successfully');
  }

  // Get daily payments report (GET /api/reports/payments/daily)
  async getDailyPaymentsReport(req: AuthRequest, res: Response): Promise<void> {
    const date = req.query.date as string || new Date().toISOString().split('T')[0];
    
    // Parse the date and create start/end of day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get payments received on this date
    const filters: PaymentFilters = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const result = await paymentsService.getAllPayments(filters, 0, 1000);

    // Get all payment transactions for the date range
    const transactions = await paymentsService.getPaymentTransactionsForDateRange(startDate, endDate);

    const summary = {
      date,
      totalPayments: transactions.length,
      totalAmount: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      paymentMethods: transactions.reduce((acc, transaction) => {
        const method = transaction.paymentMethod || 'CASH';
        acc[method] = (acc[method] || 0) + transaction.amount;
        return acc;
      }, {} as Record<string, number>),
    };

    const response = {
      summary,
      payments: result.payments,
      transactions,
      generatedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Daily payments report retrieved successfully');
  }
}

export const paymentsController = new PaymentsController();