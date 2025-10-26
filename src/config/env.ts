import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // CORS (allow comma-separated list or wildcard)
  CORS_ORIGIN: z
    .string()
    .nonempty()
    .refine(
      (value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .every((origin) =>
            origin === '*' ? true : z.string().url().safeParse(origin).success
          ),
      {
        message:
          'CORS_ORIGIN must be a comma-separated list of valid URLs or "*" for all origins.',
      }
    )
  .default('http://localhost:5173'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Validate and export environment variables
export const env = envSchema.parse(process.env);

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
