import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { customersService } from './customers.service';
import { sendSuccess, sendSuccessWithPagination } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { CreateCustomerDTO, UpdateCustomerDTO, CustomerFilters } from './customers.types';

export class CustomersController {
  // GET /api/customers
  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: CustomerFilters = req.query;
      const { page, limit, skip } = parsePagination({ page: filters.page, limit: filters.limit });

      const { customers, total } = await customersService.getAllCustomers(filters, skip, limit);
      
      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      sendSuccessWithPagination(res, customers, pagination);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/customers/:id
  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await customersService.getCustomerById(id);
      sendSuccess(res, customer);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/customers
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateCustomerDTO = req.body;
      const userId = req.user!.userId;
      const customer = await customersService.createCustomer(data, userId);
      sendSuccess(res, customer, 'Customer created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/customers/:id
  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateCustomerDTO = req.body;
      const userId = req.user!.userId;
      const customer = await customersService.updateCustomer(id, data, userId);
      sendSuccess(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/customers/:id
  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const customer = await customersService.deleteCustomer(id, userId);
      sendSuccess(res, customer, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/customers/:id/restore
  async restore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const customer = await customersService.restoreCustomer(id, userId);
      sendSuccess(res, customer, 'Customer restored successfully');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/customers/:id/stats
  async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customerWithStats = await customersService.getCustomerStats(id);
      sendSuccess(res, customerWithStats);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/customers/locations
  async getLocations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const locations = await customersService.getLocations();
      sendSuccess(res, locations);
    } catch (error) {
      next(error);
    }
  }
}

export const customersController = new CustomersController();
