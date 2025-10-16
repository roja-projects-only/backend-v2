import { prisma } from '../../config/database';
import { CreateCustomerDTO, UpdateCustomerDTO, CustomerFilters } from './customers.types';
import { Location } from '@prisma/client';

export class CustomersRepository {
  // Find all customers with filters
  async findAll(filters: CustomerFilters, skip: number, limit: number) {
    const where: any = {};

    // Search filter (name or phone)
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Location filter
    if (filters.location) {
      where.location = filters.location;
    }

    // Active filter
    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    return prisma.customer.findMany({
      where,
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
        createdAt: 'desc',
      },
    });
  }

  // Count customers with filters
  async count(filters: CustomerFilters) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.location) {
      where.location = filters.location;
    }

    if (filters.active !== undefined) {
      where.active = filters.active;
    }

    return prisma.customer.count({ where });
  }

  // Find customer by ID
  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Create customer
  async create(data: CreateCustomerDTO, createdById: string) {
    return prisma.customer.create({
      data: {
        ...data,
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Update customer
  async update(id: string, data: UpdateCustomerDTO) {
    return prisma.customer.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  // Delete customer (soft delete)
  async delete(id: string) {
    return prisma.customer.update({
      where: { id },
      data: { active: false },
    });
  }

  // Restore customer
  async restore(id: string) {
    return prisma.customer.update({
      where: { id },
      data: { active: true },
    });
  }

  // Get customer statistics
  async getStats(id: string) {
    const sales = await prisma.sale.aggregate({
      where: {
        customerId: id,
      },
      _sum: {
        quantity: true,
        total: true,
      },
      _count: true,
    });

    const lastSale = await prisma.sale.findFirst({
      where: { customerId: id },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const totalSales = sales._count || 0;
    const totalRevenue = sales._sum.total || 0;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    return {
      totalSales,
      totalRevenue,
      lastPurchaseDate: lastSale?.date || null,
      averageOrderValue,
    };
  }

  // Get all locations
  async getLocations(): Promise<Location[]> {
    const locations = await prisma.customer.findMany({
      select: { location: true },
      distinct: ['location'],
    });
    return locations.map((l) => l.location);
  }
}

export const customersRepository = new CustomersRepository();
