import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

let prismaInstance = null;

export function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    prismaInstance.$on('error', (e) => {
      logger.error('Prisma Error:', { message: e.message, target: e.target });
    });

    prismaInstance.$on('warn', (e) => {
      logger.warn('Prisma Warning:', { message: e.message });
    });
  }

  return prismaInstance;
}

export async function checkDatabaseConnection(retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const client = getPrismaClient();
      await client.$queryRaw`SELECT 1`;
      return { connected: true, provider: 'postgresql' };
    } catch (err) {
      if (attempt <= retries) {
        logger.info(`PostgreSQL connection attempt ${attempt} failed, retrying in 1.5s (waiting for cloud database compute)...`);
        await new Promise((r) => setTimeout(r, 1500));
      } else {
        logger.warn('PostgreSQL database check failed; fallback resilience active:', { error: err.message });
        return { connected: false, error: err.message };
      }
    }
  }
}
