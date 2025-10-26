import {
  PaymentStatus,
  PaymentMethod,
  CollectionStatus,
  PaymentType,
} from "@prisma/client";

// Re-export enums for convenience
export { PaymentStatus, PaymentMethod, CollectionStatus, PaymentType };

// Create payment DTO
export interface CreatePaymentDTO {
  amount: number;
  saleId: string;
  customerId: string;
  dueDate?: Date;
  notes?: string;
}

// Update payment DTO
export interface UpdatePaymentDTO {
  status?: PaymentStatus;
  paidAmount?: number;
  dueDate?: Date;
  notes?: string;
}

// Payment filters
export interface PaymentFilters {
  customerId?: string;
  status?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  overdue?: boolean;
  page?: number;
  limit?: number;
}

// Record payment DTO (for recording cash payments received)
export interface RecordPaymentDTO {
  paymentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

// Outstanding balance response
export interface OutstandingBalance {
  customerId: string;
  customerName: string;
  location: string;
  totalOwed: number;
  oldestDebtDate: Date | null;
  daysPastDue: number;
  creditLimit: number | null;
  collectionStatus: CollectionStatus;
  lastPaymentDate: Date | null;
}

// Payment with relations
export interface PaymentWithRelations {
  id: string;
  amount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAmount: number;
  paidAt: Date | null;
  dueDate: Date | null;
  notes: string | null;
  saleId: string;
  customerId: string;
  recordedById: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  sale?: {
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    date: Date;
    paymentType: PaymentType;
  };
  customer?: {
    id: string;
    name: string;
    location: string;
    phone: string | null;
  };
  recordedBy?: {
    id: string;
    username: string;
  };
}

// Aging report data
export interface AgingReportData {
  customerId: string;
  customerName: string;
  location: string;
  current: number; // 0-30 days
  days31to60: number; // 31-60 days
  days61to90: number; // 61-90 days
  over90Days: number; // 90+ days
  totalOwed: number;
  collectionStatus: CollectionStatus;
}

// Payment summary/KPIs
export interface PaymentSummary {
  totalOutstanding: number;
  totalOverdue: number;
  customersWithDebt: number;
  overdueCustomers: number;
  averageDebtAge: number;
  totalPaymentsToday: number;
  paymentsReceivedToday: number;
}

// Reminder note DTO
export interface CreateReminderNoteDTO {
  customerId: string;
  note: string;
  reminderDate?: Date;
}

// Reminder note with relations
export interface ReminderNoteWithRelations {
  id: string;
  note: string;
  reminderDate: Date;
  customerId: string;
  createdById: string;
  createdAt: Date;

  // Relations
  customer?: {
    id: string;
    name: string;
    location: string;
  };
  createdBy?: {
    id: string;
    username: string;
  };
}

// Payment transaction DTOs
export interface CreatePaymentTransactionDTO {
  paymentId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface UpdatePaymentTransactionDTO {
  notes?: string;
}

// Payment transaction with relations
export interface PaymentTransactionWithRelations {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  paymentId: string;
  recordedById: string;
  createdAt: Date;

  // Relations
  payment?: {
    id: string;
    amount: number;
    status: PaymentStatus;
    paidAmount: number;
    customerId: string;
    customer?: {
      id: string;
      name: string;
      location: string;
    };
  };
  recordedBy?: {
    id: string;
    username: string;
  };
}

// Payment transaction with running balance
export interface PaymentTransactionWithBalance
  extends PaymentTransactionWithRelations {
  runningBalance: number; // Remaining balance after this transaction
}
