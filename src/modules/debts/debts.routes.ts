import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { sendSuccess, sendSuccessWithPagination, calculatePagination } from '../../utils/response';
import { debtsService } from './debts.service';
import { chargeSchema, paymentSchema, adjustmentSchema, markPaidSchema, historyFiltersSchema } from './debts.validators';

const router = Router();

// All debt routes require authentication
router.use(authenticate);

// GET /api/debts/summary - list customers with current open tab summary
router.get('/summary', async (req, res, next) => {
  try {
    // Basic summary: customers having open tabs with balance > 0
    const tabs = await debtsService.getTransactionHistory({ page: 1, limit: 1 }); // placeholder to ensure service compiled
    // For now fetch open tabs and join customer
    const openTabs = await (await import('../../config/database')).prisma.debtTab.findMany({
      where: { status: 'OPEN' },
      include: { customer: true },
      orderBy: { updatedAt: 'desc' },
    });
    const summary = openTabs.map(t => ({
      customerId: t.customerId,
      customerName: t.customer.name,
      balance: t.totalBalance,
      status: t.status,
      openedAt: t.openedAt,
      lastUpdated: t.updatedAt,
    }));
    sendSuccess(res, summary, 'Debt summary retrieved');
  } catch (err) { next(err); }
});

// GET /api/debts/customer/:customerId - current tab + transactions
router.get('/customer/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const data = await debtsService.getCustomerDebt(customerId);
    sendSuccess(res, data, 'Customer debt retrieved');
  } catch (err) { next(err); }
});

// GET /api/debts/customer/:customerId/history - all tabs + transactions
router.get('/customer/:customerId/history', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const data = await debtsService.getCustomerDebtHistory(customerId);
    sendSuccess(res, data, 'Customer debt history retrieved');
  } catch (err) { next(err); }
});

// GET /api/debts/transactions - global transaction history
router.get('/transactions', async (req, res, next) => {
  try {
    const parsed = historyFiltersSchema.parse(req.query);
    const result = await debtsService.getTransactionHistory(parsed);
    const meta = calculatePagination(result.pagination.page, result.pagination.limit, result.pagination.total);
    sendSuccessWithPagination(res, result.data, meta, 'Debt transactions retrieved');
  } catch (err) { next(err); }
});

// POST /api/debts/charge
router.post('/charge', async (req: any, res, next) => {
  try {
    const payload = chargeSchema.parse(req.body);
    const result = await debtsService.createCharge({
      customerId: payload.customerId,
      containers: payload.containers,
      transactionDate: payload.transactionDate,
      notes: payload.notes,
    }, req.user!.userId);
    sendSuccess(res, result, 'Charge recorded', 201);
  } catch (err) { next(err); }
});

// POST /api/debts/payment
router.post('/payment', async (req: any, res, next) => {
  try {
    const payload = paymentSchema.parse(req.body);
    const result = await debtsService.createPayment({
      customerId: payload.customerId,
      amount: payload.amount,
      transactionDate: payload.transactionDate,
      notes: payload.notes,
    }, req.user!.userId);
    sendSuccess(res, result, 'Payment recorded', 201);
  } catch (err) { next(err); }
});

// POST /api/debts/adjustment
router.post('/adjustment', async (req: any, res, next) => {
  try {
    const payload = adjustmentSchema.parse(req.body);
    const result = await debtsService.createAdjustment({
      customerId: payload.customerId,
      amount: payload.amount,
      reason: payload.reason,
      transactionDate: payload.transactionDate,
      notes: payload.notes,
    }, req.user!.userId);
    sendSuccess(res, result, 'Adjustment recorded', 201);
  } catch (err) { next(err); }
});

// POST /api/debts/mark-paid
router.post('/mark-paid', async (req: any, res, next) => {
  try {
    const payload = markPaidSchema.parse(req.body);
    const result = await debtsService.markPaid(payload.customerId, payload.transactionDate, req.user!.userId, payload.finalPayment);
    sendSuccess(res, result, 'Debt tab closed');
  } catch (err) { next(err); }
});

// GET /api/debts/metrics - basic metrics for dashboard
router.get('/metrics', async (req, res, next) => {
  try {
    const prisma = (await import('../../config/database')).prisma;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [paymentsToday, totalOutstanding, activeCustomers] = await Promise.all([
      prisma.debtTransaction.aggregate({
        _sum: { amount: true },
        where: { transactionType: 'PAYMENT', transactionDate: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.debtTab.aggregate({ _sum: { totalBalance: true }, where: { status: 'OPEN' } }),
      prisma.debtTab.count({ where: { status: 'OPEN' } }),
    ]);

    sendSuccess(res, {
      totalOutstanding: totalOutstanding._sum.totalBalance || 0,
      totalPaymentsToday: paymentsToday._sum.amount || 0,
      activeCustomers,
    }, 'Debt metrics retrieved');
  } catch (err) { next(err); }
});

export default router;