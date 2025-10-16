import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Prevents multiple instances in development with hot reload
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown handler
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
