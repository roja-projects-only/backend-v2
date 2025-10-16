import { prisma } from '../../config/database';
import { CreateSaleDTO, UpdateSaleDTO, SaleFilters } from './sales.types';

export class SalesRepository {
  // Find all sales with filters
  async findAll(filters: SaleFilters, skip: number, limit: number) {
    const where: any = {};

    // Customer filter
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    // User filter (explicit filter only - for viewing specific user's entries)
    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Date filter
    if (filters.date) {
      const date = new Date(filters.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      where.date = {
        gte: date,
        lt: nextDay,
      };
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1); // Include end date
      
      where.date = {
        gte: new Date(filters.startDate),
        lt: endDate,
      };
    }

    return prisma.sale.findMany({
      where,
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  // Count sales with filters
  async count(filters: SaleFilters) {
    const where: any = {};

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.date) {
      const date = new Date(filters.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      where.date = {
        gte: date,
        lt: nextDay,
      };
    }

    if (filters.startDate && filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      
      where.date = {
        gte: new Date(filters.startDate),
        lt: endDate,
      };
    }

    return prisma.sale.count({ where });
  }

  // Find sale by ID
  async findById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Find sale by customer and date (for upsert logic)
  async findByCustomerAndDate(customerId: string, dateISO: string) {
    const dateOnly = dateISO.split('T')[0];
    
    return prisma.sale.findFirst({
      where: {
        customerId,
        date: {
          gte: new Date(`${dateOnly}T00:00:00.000Z`),
          lt: new Date(`${dateOnly}T23:59:59.999Z`),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Create sale
  async create(data: CreateSaleDTO, userId: string, total: number) {
    return prisma.sale.create({
      data: {
        ...data,
        total,
        userId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Update sale
  async update(id: string, data: UpdateSaleDTO, total?: number) {
    return prisma.sale.update({
      where: { id },
      data: {
        ...data,
        ...(total !== undefined && { total }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Delete sale (hard delete)
  async delete(id: string) {
    return prisma.sale.delete({
      where: { id },
    });
  }

  // Aggregate sales by date range
  async aggregateByDateRange(startDate: Date, endDate: Date) {
    const where: any = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    // Group by date
    const sales = await prisma.sale.groupBy({
      by: ['date'],
      where,
      _sum: {
        quantity: true,
        total: true,
      },
      _count: true,
      orderBy: {
        date: 'asc',
      },
    });

    return sales.map((sale) => ({
      date: sale.date.toISOString().split('T')[0],
      totalSales: sale._count,
      totalRevenue: sale._sum.total || 0,
      totalQuantity: sale._sum.quantity || 0,
    }));
  }

  // Aggregate sales by location
  async aggregateByLocation(startDate: Date, endDate: Date) {
    const where: any = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: {
          select: {
            location: true,
          },
        },
      },
    });

    // Group by location
    const locationMap = new Map<string, {
      location: string;
      totalSales: number;
      totalRevenue: number;
      totalQuantity: number;
      customerIds: Set<string>;
    }>();

    for (const sale of sales) {
      const location = sale.customer.location;
      const existing = locationMap.get(location) || {
        location,
        totalSales: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        customerIds: new Set(),
      };

      existing.totalSales += 1;
      existing.totalRevenue += sale.total;
      existing.totalQuantity += sale.quantity;
      existing.customerIds.add(sale.customerId);

      locationMap.set(location, existing);
    }

    return Array.from(locationMap.values()).map((item) => ({
      location: item.location,
      totalSales: item.totalSales,
      totalRevenue: item.totalRevenue,
      totalQuantity: item.totalQuantity,
      customerCount: item.customerIds.size,
    }));
  }

  // Get sales summary
  async getSummary(startDate: Date, endDate: Date) {
    const where: any = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    const aggregate = await prisma.sale.aggregate({
      where,
      _sum: {
        quantity: true,
        total: true,
      },
      _count: true,
    });

    // Get unique customers
    const uniqueCustomers = await prisma.sale.findMany({
      where,
      select: {
        customerId: true,
      },
      distinct: ['customerId'],
    });

    // Get top customer
    const customerSales = await prisma.sale.groupBy({
      by: ['customerId'],
      where,
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 1,
    });

    let topCustomer = null;
    if (customerSales.length > 0) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerSales[0].customerId },
        select: { id: true, name: true },
      });

      if (customer) {
        topCustomer = {
          id: customer.id,
          name: customer.name,
          revenue: customerSales[0]._sum.total || 0,
        };
      }
    }

    const totalSales = aggregate._count;
    const totalRevenue = aggregate._sum.total || 0;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      totalQuantity: aggregate._sum.quantity || 0,
      averageOrderValue,
      uniqueCustomers: uniqueCustomers.length,
      topCustomer,
    };
  }
}

export const salesRepository = new SalesRepository();
