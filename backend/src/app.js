import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';
import { NotFoundError } from './utils/errors.js';
import { checkDatabaseConnection } from './infrastructure/database/prisma.js';

// Import module routers
import authRoutes from './modules/auth/auth.routes.js';
import marketRoutes from './modules/market/market.routes.js';
import portfolioRoutes from './modules/portfolio/portfolio.routes.js';
import riskRoutes from './modules/risk/risk.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import newsRoutes from './modules/news/news.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import strategyRoutes from './modules/strategy/strategy.routes.js';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in development
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  return sendSuccess(res, {
    status: 'ok',
    version: '1.0.0',
    environment: config.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      api: 'HEALTHY',
      database: dbStatus.connected ? 'CONNECTED' : 'DISCONNECTED_FALLBACK_ACTIVE',
      cache: 'MEMORY_DRIVER_ACTIVE',
      aiProvider: config.AI_PROVIDER,
      marketDataProvider: config.MARKET_DATA_PROVIDER,
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/market', marketRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/risk', riskRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/news', newsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/strategy', strategyRoutes);

// Catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`));
});

// Centralized error handling
app.use(errorHandler);

export default app;
