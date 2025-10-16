import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { salesService } from './sales.service';
import { sendSuccess } from '../../utils/response';
import { CreateSaleDTO, UpdateSaleDTO, SaleFilters } from './sales.types';

export class SalesController {
  // List sales with filters
  async listSales(req: AuthRequest, res: Response) {
    const filters: SaleFilters = {
      customerId: req.query.customerId as string,
      userId: req.query.userId as string,
      date: req.query.date as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const result = await salesService.listSales(filters);

    sendSuccess(res, result, 'Sales retrieved successfully');
  }

  // Get sale by ID
  async getSaleById(req: AuthRequest, res: Response) {
    const sale = await salesService.getSaleById(req.params.id);

    sendSuccess(res, sale, 'Sale retrieved successfully');
  }

  // Create sale
  async createSale(req: AuthRequest, res: Response) {
    const data: CreateSaleDTO = req.body;

    const sale = await salesService.createSale(data, req.user!.userId);

    sendSuccess(res, sale, 'Sale created successfully', 201);
  }

  // Update sale
  async updateSale(req: AuthRequest, res: Response) {
    const data: UpdateSaleDTO = req.body;

    const sale = await salesService.updateSale(
      req.params.id,
      data,
      req.user!.userId,
      req.user!.role === 'ADMIN',
      req.get('user-agent'),
      req.ip
    );

    sendSuccess(res, sale, 'Sale updated successfully');
  }

  // Delete sale
  async deleteSale(req: AuthRequest, res: Response) {
    const result = await salesService.deleteSale(
      req.params.id,
      req.user!.userId,
      req.user!.role === 'ADMIN',
      req.get('user-agent'),
      req.ip
    );

    sendSuccess(res, null, result.message);
  }

  // Get today's sales
  async getTodaySales(req: AuthRequest, res: Response) {
    const today = new Date().toISOString().split('T')[0];
    const filters: SaleFilters = { date: today };

    const result = await salesService.listSales(filters);

    sendSuccess(res, result, "Today's sales retrieved successfully");
  }

  // Get sales by date
  async getSalesByDate(req: AuthRequest, res: Response) {
    const filters: SaleFilters = { date: req.params.date };

    const result = await salesService.listSales(filters);

    sendSuccess(res, result, 'Sales retrieved successfully');
  }

  // Get customer purchase history
  async getCustomerHistory(req: AuthRequest, res: Response) {
    const history = await salesService.getCustomerHistory(req.params.customerId);

    sendSuccess(res, history, 'Customer history retrieved successfully');
  }

  // Get daily sales trend
  async getDailySalesTrend(req: AuthRequest, res: Response) {
    const { startDate, endDate } = req.query;

    const trend = await salesService.getDailySalesTrend(
      startDate as string,
      endDate as string
    );

    sendSuccess(res, trend, 'Daily sales trend retrieved successfully');
  }

  // Get location performance
  async getLocationPerformance(req: AuthRequest, res: Response) {
    const { startDate, endDate } = req.query;

    const performance = await salesService.getLocationPerformance(
      startDate as string,
      endDate as string
    );

    sendSuccess(res, performance, 'Location performance retrieved successfully');
  }

  // Get sales summary
  async getSalesSummary(req: AuthRequest, res: Response) {
    const { startDate, endDate } = req.query;

    const summary = await salesService.getSalesSummary(
      startDate as string,
      endDate as string
    );

    sendSuccess(res, summary, 'Sales summary retrieved successfully');
  }
}

export const salesController = new SalesController();
