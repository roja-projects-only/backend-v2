import { Location, CollectionStatus } from '@prisma/client';

// Create customer DTO
export interface CreateCustomerDTO {
  name: string;
  location: Location;
  phone?: string;
  customUnitPrice?: number;
  notes?: string;
  creditLimit?: number;
}

// Update customer DTO
export interface UpdateCustomerDTO {
  name?: string;
  location?: Location;
  phone?: string;
  customUnitPrice?: number | null;
  notes?: string;
  active?: boolean;
  creditLimit?: number | null;
  collectionStatus?: CollectionStatus;
}

// Customer filters
export interface CustomerFilters {
  search?: string;
  location?: Location;
  active?: boolean;
  page?: number;
  limit?: number;
}

// Customer statistics
export interface CustomerStats {
  totalSales: number;
  totalRevenue: number;
  lastPurchaseDate: Date | null;
  averageOrderValue: number;
  outstandingBalance: number;
  totalPayments: number;
  lastPaymentDate: Date | null;
}

// Customer with stats
export interface CustomerWithStats {
  id: string;
  name: string;
  location: Location;
  phone: string | null;
  customUnitPrice: number | null;
  notes: string | null;
  active: boolean;
  creditLimit: number | null;
  outstandingBalance: number;
  lastPaymentDate: Date | null;
  collectionStatus: CollectionStatus;
  createdAt: Date;
  updatedAt: Date;
  stats: CustomerStats;
}
