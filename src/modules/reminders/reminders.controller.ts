import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { remindersService } from './reminders.service';
import { sendSuccess } from '../../utils/response';
import { ReminderFilters, CreateReminderNoteDTO } from './reminders.types';

export class RemindersController {
  // List reminder notes with filters (GET /api/reminders/notes)
  async listReminderNotes(req: AuthRequest, res: Response): Promise<void> {
    const filters: ReminderFilters = {
      customerId: req.query.customerId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const skip = (page - 1) * limit;

    const result = await remindersService.getAllReminderNotes(filters, skip, limit);

    const response = {
      reminders: result.reminders,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };

    sendSuccess(res, response, 'Reminder notes retrieved successfully');
  }

  // Get reminder note by ID (GET /api/reminders/notes/:id)
  async getReminderNoteById(req: AuthRequest, res: Response): Promise<void> {
    const reminder = await remindersService.getReminderNoteById(req.params.id);

    sendSuccess(res, reminder, 'Reminder note retrieved successfully');
  }

  // Add reminder note (POST /api/reminders/notes)
  async addReminderNote(req: AuthRequest, res: Response): Promise<void> {
    const data: CreateReminderNoteDTO = req.body;

    const reminder = await remindersService.addReminderNote(data, req.user!.userId);

    sendSuccess(res, reminder, 'Reminder note added successfully', 201);
  }

  // Delete reminder note (DELETE /api/reminders/notes/:id) - Admin only
  async deleteReminderNote(req: AuthRequest, res: Response): Promise<void> {
    const result = await remindersService.deleteReminderNote(
      req.params.id,
      req.user!.userId
    );

    sendSuccess(res, null, result.message);
  }

  // Get customer reminder history (GET /api/customers/:id/reminders)
  async getCustomerReminderHistory(req: AuthRequest, res: Response): Promise<void> {
    const customerId = req.params.id;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const skip = (page - 1) * limit;

    const result = await remindersService.getCustomerReminderHistory(customerId, skip, limit);

    const response = {
      reminders: result.reminders,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };

    sendSuccess(res, response, 'Customer reminder history retrieved successfully');
  }

  // Get customers needing reminders (GET /api/reminders/overdue)
  async getCustomersNeedingReminders(req: AuthRequest, res: Response): Promise<void> {
    const daysSinceLastReminder = req.query.days 
      ? parseInt(req.query.days as string) 
      : 7;

    const customers = await remindersService.getCustomersNeedingReminders(daysSinceLastReminder);

    const response = {
      customers,
      totalCustomers: customers.length,
      daysSinceLastReminder,
      retrievedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Customers needing reminders retrieved successfully');
  }

  // Get overdue customers (GET /api/reminders/overdue-customers)
  async getOverdueCustomers(req: AuthRequest, res: Response): Promise<void> {
    const daysPastDue = req.query.days 
      ? parseInt(req.query.days as string) 
      : 30;

    const customers = await remindersService.getOverdueCustomers(daysPastDue);

    const response = {
      customers,
      totalCustomers: customers.length,
      daysPastDue,
      retrievedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Overdue customers retrieved successfully');
  }

  // Get reminder statistics (GET /api/reminders/stats)
  async getReminderStats(req: AuthRequest, res: Response): Promise<void> {
    const stats = await remindersService.getReminderStats();

    sendSuccess(res, stats, 'Reminder statistics retrieved successfully');
  }

  // Bulk add reminder notes (POST /api/reminders/bulk)
  async bulkAddReminderNotes(req: AuthRequest, res: Response): Promise<void> {
    const { customerIds, note } = req.body;

    const result = await remindersService.bulkAddReminderNotes(
      customerIds,
      note,
      req.user!.userId
    );

    sendSuccess(res, result, result.message, 201);
  }

  // Get last reminder date for customer (GET /api/customers/:id/last-reminder)
  async getLastReminderDate(req: AuthRequest, res: Response): Promise<void> {
    const customerId = req.params.id;

    const lastReminderDate = await remindersService.getLastReminderDate(customerId);

    const response = {
      customerId,
      lastReminderDate,
      retrievedAt: new Date().toISOString(),
    };

    sendSuccess(res, response, 'Last reminder date retrieved successfully');
  }
}

export const remindersController = new RemindersController();