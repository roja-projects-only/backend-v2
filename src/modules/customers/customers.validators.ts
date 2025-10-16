import { z } from 'zod';

// Location enum values
const locationEnum = z.enum([
  'BANAI',
  'DOUBE_L',
  'JOVIL_3',
  'LOWER_LOOB',
  'PINATUBO',
  'PLASTIKAN',
  'SAN_ISIDRO',
  'UPPER_LOOB',
  'URBAN',
  'ZUNIGA',
]);

// Create customer validation schema
export const createCustomerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  location: locationEnum,
  phone: z.string()
    .max(20, 'Phone must be at most 20 characters')
    .optional(),
  customUnitPrice: z.number()
    .positive('Custom unit price must be positive')
    .optional(),
  notes: z.string()
    .max(500, 'Notes must be at most 500 characters')
    .optional(),
});

// Update customer validation schema
export const updateCustomerSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  location: locationEnum.optional(),
  phone: z.string()
    .max(20, 'Phone must be at most 20 characters')
    .nullable()
    .optional(),
  customUnitPrice: z.number()
    .positive('Custom unit price must be positive')
    .nullable()
    .optional(),
  notes: z.string()
    .max(500, 'Notes must be at most 500 characters')
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

// Customer filters validation schema
export const customerFiltersSchema = z.object({
  search: z.string().optional(),
  location: locationEnum.optional(),
  active: z.string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().positive())
    .optional(),
  limit: z.string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().positive().max(100))
    .optional(),
});

// Customer ID param validation
export const customerIdSchema = z.object({
  id: z.string().cuid(),
});
