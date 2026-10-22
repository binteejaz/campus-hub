// src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  // Log slow queries (>500ms) in development
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

prisma.$on('error', (e) => logger.error('Prisma error:', e));

// Reuse in dev (HMR safe)
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
