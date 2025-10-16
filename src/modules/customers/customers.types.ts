import { Location } from '@prisma/client';

// Create customer DTO
export interface CreateCustomerDTO {
  name: string;
  location: Location;
  phone?: string;
  customUnitPrice?: number;
  notes?: string;
}

// Update customer DTO
export interface UpdateCustomerDTO {
  name?: string;
  location?: Location;
  phone?: string;
  customUnitPrice?: number | null;
  notes?: string;
  active?: boolean;
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
  createdAt: Date;
  updatedAt: Date;
  stats: CustomerStats;
}
