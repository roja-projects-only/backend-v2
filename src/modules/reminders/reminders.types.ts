import { CollectionStatus } from '@prisma/client';

export interface CreateReminderNoteDTO {
  note: string;
  customerId: string;
  reminderDate?: Date;
}

export interface ReminderFilters {
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CustomerNeedingReminder {
  id: string;
  name: string;
  location: string;
  phone: string | null;
  outstandingBalance: number;
  collectionStatus: CollectionStatus;
  lastReminderDate?: Date;
  oldestDebtDate?: Date;
  daysSinceLastReminder: number | null;
}

export interface ReminderStats {
  remindersToday: number;
  remindersThisWeek: number;
  customersWithDebt: number;
  customersNeedingReminders: number;
}