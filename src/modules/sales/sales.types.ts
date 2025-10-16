// Create sale DTO
export interface CreateSaleDTO {
  customerId: string;
  quantity: number;
  unitPrice: number;
  date: Date;
  notes?: string;
}

// Update sale DTO
export interface UpdateSaleDTO {
  customerId?: string;
  quantity?: number;
  unitPrice?: number;
  date?: Date;
  notes?: string;
}

// Sale filters
export interface SaleFilters {
  customerId?: string;
  userId?: string;
  date?: string; // YYYY-MM-DD
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

// Daily sales aggregation
export interface DailySalesData {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalQuantity: number;
}

// Location performance
export interface LocationPerformance {
  location: string;
  totalSales: number;
  totalRevenue: number;
  totalQuantity: number;
  customerCount: number;
}

// Customer performance
export interface CustomerPerformance {
  customerId: string;
  customerName: string;
  location: string;
  totalSales: number;
  totalRevenue: number;
  totalQuantity: number;
  lastPurchaseDate: Date;
}

// Sales summary/KPIs
export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalQuantity: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  topCustomer?: {
    id: string;
    name: string;
    revenue: number;
  };
}
