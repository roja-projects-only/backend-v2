import { remindersRepository } from './reminders.repository';
import { CreateReminderNoteDTO, ReminderFilters, CustomerNeedingReminder, ReminderStats } from './reminders.types';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { prisma } from '../../config/database';

export class RemindersService {
  // Get all reminder notes with pagination
  async getAllReminderNotes(filters: ReminderFilters, skip: number, limit: number) {
    const reminders = await remindersRepository.findAll(filters, skip, limit);
    const total = await remindersRepository.count(filters);

    return { reminders, total };
  }

  // Get reminder note by ID
  async getReminderNoteById(id: string) {
    const reminder = await remindersRepository.findById(id);

    if (!reminder) {
      throw new NotFoundError('Reminder note');
    }

    return reminder;
  }

  // Add reminder note
  async addReminderNote(data: CreateReminderNoteDTO, userId: string) {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Validate note content
    if (!data.note || data.note.trim().length === 0) {
      throw new ValidationError('Reminder note cannot be empty');
    }

    if (data.note.length > 500) {
      throw new ValidationError('Reminder note cannot exceed 500 characters');
    }

    // Create reminder note
    const reminderData: CreateReminderNoteDTO = {
      note: data.note.trim(),
      customerId: data.customerId,
      reminderDate: data.reminderDate || new Date(),
    };

    const reminder = await remindersRepository.create(reminderData, userId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'ReminderNote',
        entityId: reminder.id,
        changes: { reminderData } as any,
      },
    });

    return reminder;
  }

  // Get customer reminder history
  async getCustomerReminderHistory(customerId: string, skip: number = 0, limit: number = 50) {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return remindersRepository.getCustomerReminderHistory(customerId, skip, limit);
  }

  // Get last reminder date for customer
  async getLastReminderDate(customerId: string): Promise<Date | null> {
    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return remindersRepository.getLastReminderDate(customerId);
  }

  // Get customers needing reminders
  async getCustomersNeedingReminders(daysSinceLastReminder: number = 7): Promise<CustomerNeedingReminder[]> {
    if (daysSinceLastReminder < 1) {
      throw new ValidationError('Days since last reminder must be at least 1');
    }

    return remindersRepository.getCustomersNeedingReminders(daysSinceLastReminder);
  }

  // Get reminder statistics
  async getReminderStats(): Promise<ReminderStats> {
    return remindersRepository.getReminderStats();
  }

  // Delete reminder note (admin only)
  async deleteReminderNote(id: string, userId: string) {
    const existing = await remindersRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Reminder note');
    }

    await remindersRepository.delete(id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'ReminderNote',
        entityId: existing.id,
        changes: { deleted: existing } as any,
      },
    });

    return { message: 'Reminder note deleted successfully' };
  }

  // Bulk add reminder notes for multiple customers
  async bulkAddReminderNotes(customerIds: string[], note: string, userId: string) {
    if (!customerIds || customerIds.length === 0) {
      throw new ValidationError('At least one customer ID is required');
    }

    if (!note || note.trim().length === 0) {
      throw new ValidationError('Reminder note cannot be empty');
    }

    if (note.length > 500) {
      throw new ValidationError('Reminder note cannot exceed 500 characters');
    }

    // Verify all customers exist
    const customers = await prisma.customer.findMany({
      where: {
        id: {
          in: customerIds,
        },
      },
    });

    if (customers.length !== customerIds.length) {
      const foundIds = customers.map(c => c.id);
      const missingIds = customerIds.filter(id => !foundIds.includes(id));
      throw new NotFoundError(`Customers not found: ${missingIds.join(', ')}`);
    }

    // Create reminder notes for all customers
    const reminderPromises = customerIds.map(customerId =>
      remindersRepository.create({
        note: note.trim(),
        customerId,
        reminderDate: new Date(),
      }, userId)
    );

    const reminders = await Promise.all(reminderPromises);

    // Create audit logs
    const auditPromises = reminders.map(reminder =>
      prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'ReminderNote',
          entityId: reminder.id,
          changes: { 
            bulkOperation: true,
            note: note.trim(),
            customerId: reminder.customerId,
          } as any,
        },
      })
    );

    await Promise.all(auditPromises);

    return {
      message: `${reminders.length} reminder notes created successfully`,
      reminders,
    };
  }

  // Get overdue customers (customers with debt older than specified days)
  async getOverdueCustomers(daysPastDue: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysPastDue);

    const customers = await prisma.customer.findMany({
      where: {
        outstandingBalance: {
          gt: 0,
        },
        payments: {
          some: {
            status: {
              in: ['UNPAID', 'PARTIAL'],
            },
            createdAt: {
              lt: cutoffDate,
            },
          },
        },
      },
      include: {
        payments: {
          where: {
            status: {
              in: ['UNPAID', 'PARTIAL'],
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
        reminderNotes: {
          orderBy: {
            reminderDate: 'desc',
          },
          take: 1,
        },
      },
    });

    return customers.map(customer => {
      const oldestPayment = customer.payments[0];
      const lastReminder = customer.reminderNotes[0];
      const daysPastDue = oldestPayment 
        ? Math.floor((new Date().getTime() - oldestPayment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: customer.id,
        name: customer.name,
        location: customer.location,
        phone: customer.phone,
        outstandingBalance: customer.outstandingBalance,
        collectionStatus: customer.collectionStatus,
        oldestDebtDate: oldestPayment?.createdAt || null,
        daysPastDue,
        lastReminderDate: lastReminder?.reminderDate || null,
        daysSinceLastReminder: lastReminder 
          ? Math.floor((new Date().getTime() - lastReminder.reminderDate.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      };
    });
  }
}

export const remindersService = new RemindersService();