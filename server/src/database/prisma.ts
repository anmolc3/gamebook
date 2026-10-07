import { PrismaClient } from '@prisma/client';
import { ENV } from '../config/env';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: ENV.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully via Prisma');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    return false;
  }
}
