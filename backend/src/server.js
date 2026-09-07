import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { checkDatabaseConnection } from './infrastructure/database/prisma.js';

async function bootstrap() {
  logger.info('====================================================');
  logger.info('  FINANCE OS - INSTITUTIONAL INTELLIGENCE PLATFORM  ');
  logger.info('====================================================');
  logger.info(`Environment: [${config.NODE_ENV}] | AI Driver: [${config.AI_PROVIDER}]`);

  // Check database status
  const dbStatus = await checkDatabaseConnection();
  if (dbStatus.connected) {
    logger.info('Database connection established: PostgreSQL / Prisma active');
  } else {
    logger.warn('PostgreSQL database not connected. Resilient repository fallback enabled.');
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`Server successfully running on port [${config.PORT}]`);
    logger.info(`Health check available at http://localhost:${config.PORT}/api/v1/health`);
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Gracefully shutting down Finance OS server...`);
    server.close(() => {
      logger.info('HTTP server closed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10s if graceful closure stalls
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error:', { error: err.message, stack: err.stack });
  process.exit(1);
});
