import { prisma } from '../../config/database';
import { CreateReminderNoteDTO, ReminderFilters } from './reminders.types';

export class RemindersRepository {
  // Find all reminder notes with filters
  async findAll(filters: ReminderFilters, skip: number, limit: number) {
    const where: any = {};

    // Customer filter
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    // Date range filters
    if (filters.startDate || filters.endDate) {
      where.reminderDate = {};
      if (filters.startDate) {
        where.reminderDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        where.reminderDate.lte = endDate;
      }
    }

    return prisma.reminderNote.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            outstandingBalance: true,
            collectionStatus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        reminderDate: 'desc',
      },
    });
  }

  // Count reminder notes with filters
  async count(filters: ReminderFilters) {
    const where: any = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.startDate || filters.endDate) {
      where.reminderDate = {};
      if (filters.startDate) {
        where.reminderDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.reminderDate.lte = endDate;
      }
    }

    return prisma.reminderNote.count({ where });
  }

  // Find reminder note by ID
  async findById(id: string) {
    return prisma.reminderNote.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            outstandingBalance: true,
            collectionStatus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Create reminder note
  async create(data: CreateReminderNoteDTO, createdById: string) {
    return prisma.reminderNote.create({
      data: {
        ...data,
        createdById,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
            phone: true,
            outstandingBalance: true,
            collectionStatus: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Delete reminder note
  async delete(id: string) {
    return prisma.reminderNote.delete({
      where: { id },
    });
  }

  // Get customer reminder history
  async getCustomerReminderHistory(customerId: string, skip: number = 0, limit: number = 50) {
    const [reminders, total] = await Promise.all([
      prisma.reminderNote.findMany({
        where: { customerId },
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          reminderDate: 'desc',
        },
      }),
      prisma.reminderNote.count({
        where: { customerId },
      }),
    ]);

    return { reminders, total };
  }

  // Get last reminder date for customer
  async getLastReminderDate(customerId: string): Promise<Date | null> {
    const lastReminder = await prisma.reminderNote.findFirst({
      where: { customerId },
      orderBy: {
        reminderDate: 'desc',
      },
      select: {
        reminderDate: true,
      },
    });

    return lastReminder?.reminderDate || null;
  }

  // Get customers needing reminders
  async getCustomersNeedingReminders(daysSinceLastReminder: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastReminder);

    // Get customers with outstanding balance who either:
    // 1. Have never been reminded, OR
    // 2. Haven't been reminded in the specified number of days
    const customersWithDebt = await prisma.customer.findMany({
      where: {
        outstandingBalance: {
          gt: 0,
        },
        collectionStatus: {
          in: ['OVERDUE', 'ACTIVE'],
        },
      },
      include: {
        reminderNotes: {
          orderBy: {
            reminderDate: 'desc',
          },
          take: 1,
        },
        payments: {
          where: {
            status: {
              in: ['UNPAID', 'PARTIAL', 'OVERDUE'],
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 1,
        },
      },
    });

    // Filter customers who need reminders
    const customersNeedingReminders = customersWithDebt.filter(customer => {
      const lastReminder = customer.reminderNotes[0];
      
      // Never been reminded
      if (!lastReminder) {
        return true;
      }

      // Last reminder was before cutoff date
      return lastReminder.reminderDate < cutoffDate;
    });

    return customersNeedingReminders.map(customer => ({
      id: customer.id,
      name: customer.name,
      location: customer.location,
      phone: customer.phone,
      outstandingBalance: customer.outstandingBalance,
      collectionStatus: customer.collectionStatus,
      lastReminderDate: customer.reminderNotes[0]?.reminderDate || null,
      oldestDebtDate: customer.payments[0]?.createdAt || null,
      daysSinceLastReminder: customer.reminderNotes[0] 
        ? Math.floor((new Date().getTime() - customer.reminderNotes[0].reminderDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  }

  // Get reminder statistics
  async getReminderStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    // Reminders added today
    const remindersToday = await prisma.reminderNote.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Reminders added this week
    const remindersThisWeek = await prisma.reminderNote.count({
      where: {
        createdAt: {
          gte: thisWeek,
        },
      },
    });

    // Customers with outstanding balance
    const customersWithDebt = await prisma.customer.count({
      where: {
        outstandingBalance: {
          gt: 0,
        },
      },
    });

    // Customers needing reminders (haven't been reminded in 7 days)
    const customersNeedingReminders = await this.getCustomersNeedingReminders(7);

    return {
      remindersToday,
      remindersThisWeek,
      customersWithDebt,
      customersNeedingReminders: customersNeedingReminders.length,
    };
  }
}

export const remindersRepository = new RemindersRepository();