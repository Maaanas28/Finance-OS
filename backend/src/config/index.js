import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/finance_os?schema=public'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('finance-os-dev-secret-key-at-least-32-chars-long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  AI_PROVIDER: z.enum(['mock', 'grok', 'openai', 'gemini']).default('mock'),
  AI_API_KEY: z.string().default(''),
  XAI_API_KEY: z.string().default(''),
  MARKET_DATA_MODE: z.enum(['auto', 'live', 'mock']).default('auto'),
  BHARATSTOCK_API_KEY: z.string().default(''),
  BHARATSTOCK_BASE_URL: z.string().default('https://bharatstockapi.com'),
  BHARATSTOCK_DAILY_LIMIT: z.coerce.number().default(100),
  TWELVE_DATA_API_KEY: z.string().default(''),
  TWELVE_DATA_BASE_URL: z.string().default('https://api.twelvedata.com'),
  TWELVE_DATA_DAILY_LIMIT: z.coerce.number().default(800),
  MARKET_DATA_PROVIDER: z.enum(['yahoo', 'mock', 'alphavantage', 'finnhub', 'twelvedata', 'bharatstock']).default('yahoo'),
  MARKET_DATA_API_KEY: z.string().default(''),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // News Intelligence Engine
  NEWS_PROVIDER: z.enum(['rss', 'mock']).default('rss'),
  NEWS_CACHE_TTL: z.coerce.number().default(300),
  NEWS_MAX_ARTICLES: z.coerce.number().default(50),
  NEWS_AI_ENRICHMENT: z.enum(['true', 'false']).default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
