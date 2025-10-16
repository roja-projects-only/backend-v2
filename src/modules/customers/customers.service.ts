import { customersRepository } from './customers.repository';
import { CreateCustomerDTO, UpdateCustomerDTO, CustomerFilters, CustomerWithStats } from './customers.types';
import { NotFoundError } from '../../utils/errors';
import { prisma } from '../../config/database';

export class CustomersService {
  // Get all customers with pagination
  async getAllCustomers(filters: CustomerFilters, skip: number, limit: number) {
    const customers = await customersRepository.findAll(filters, skip, limit);
    const total = await customersRepository.count(filters);

    return { customers, total };
  }

  // Get customer by ID
  async getCustomerById(id: string) {
    const customer = await customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return customer;
  }

  // Create new customer
  async createCustomer(data: CreateCustomerDTO, userId: string) {
    const customer = await customersRepository.create(data, userId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'Customer',
        entityId: customer.id,
        changes: { data } as any,
      },
    });

    return customer;
  }

  // Update customer
  async updateCustomer(id: string, data: UpdateCustomerDTO, userId: string) {
    // Check if customer exists
    const existing = await customersRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Customer');
    }

    const customer = await customersRepository.update(id, data);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: customer.id,
        changes: {
          before: existing,
          after: data,
        } as any,
      },
    });

    return customer;
  }

  // Delete customer (soft delete)
  async deleteCustomer(id: string, userId: string) {
    // Check if customer exists
    const existing = await customersRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Customer');
    }

    const customer = await customersRepository.delete(id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Customer',
        entityId: customer.id,
      },
    });

    return customer;
  }

  // Restore customer
  async restoreCustomer(id: string, userId: string) {
    // Check if customer exists
    const existing = await customersRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Customer');
    }

    const customer = await customersRepository.restore(id);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Customer',
        entityId: customer.id,
        changes: { restored: true } as any,
      },
    });

    return customer;
  }

  // Get customer statistics
  async getCustomerStats(id: string): Promise<CustomerWithStats> {
    const customer = await customersRepository.findById(id);
    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const stats = await customersRepository.getStats(id);

    return {
      ...customer,
      stats,
    };
  }

  // Get all locations
  async getLocations() {
    return customersRepository.getLocations();
  }
}

export const customersService = new CustomersService();
