import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess, sendError } from './utils/response.js';
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

// P2.1: Trust proxy when configured
if (config.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security and utility middleware
app.use(helmet());

// P2.3: CORS - only allow configured origins + localhost in dev/test
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server, mobile apps)
      if (!origin) return callback(null, true);

      const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());

      // Check explicit list
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In non-production, additionally allow localhost and 127.0.0.1
      if (config.NODE_ENV !== 'production') {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      // All others rejected
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestLogger);

// P2.1: Rate limiting
// Global: 2000 req / 15 min / IP (skipped in dev/test)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV !== 'production',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
      timestamp: new Date().toISOString(),
    });
  },
});
app.use(globalLimiter);

// Auth: 100 req / 15 min / IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV !== 'production',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' },
      timestamp: new Date().toISOString(),
    });
  },
});

// AI: 100 req / hour / user (applied in route)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { xForwardedForHeader: false, default: false },
  skip: () => config.NODE_ENV !== 'production',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'AI query limit reached. Try again later.' },
      timestamp: new Date().toISOString(),
    });
  },
});

// Market & News: 1000 req / min / IP
const marketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.NODE_ENV !== 'production',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Market data rate limit exceeded. Please wait.' },
      timestamp: new Date().toISOString(),
    });
  },
});

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection();

  // P2.5: In production, return only minimal info
  if (config.NODE_ENV === 'production') {
    return sendSuccess(res, {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
    });
  }

  return sendSuccess(res, {
    status: 'ok',
    version: '1.0.0',
    environment: config.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    services: {
      api: 'HEALTHY',
      database: dbStatus.connected ? 'CONNECTED' : 'DEGRADED_MEMORY',
      cache: 'MEMORY_DRIVER_ACTIVE',
      aiProvider: config.AI_PROVIDER,
      marketDataMode: config.MARKET_DATA_MODE,
    },
  });
});

// API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/market', marketLimiter, marketRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/risk', riskRoutes);
app.use('/api/v1/ai', aiLimiter, aiRoutes);
app.use('/api/v1/news', marketLimiter, newsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/strategy', strategyRoutes);

// Catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`));
});

// Centralized error handling
app.use(errorHandler);

export default app;
