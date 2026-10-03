import dotenv from 'dotenv';
import { z } from 'zod';
import crypto from 'crypto';

// P7.1: Load test env file in test mode
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// P2.2: Weak/insecure JWT_SECRET values to reject in production
const INSECURE_JWT_PATTERNS = ['super-secret', 'change-this', 'finance-os-dev'];

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/finance_os?schema=public'),
  // P2.2: JWT_SECRET - no hard-coded default. Dev gets per-process random; prod requires strong secret.
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('1d'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  // P2.4: AI_PROVIDER accepts groq (and grok as deprecated alias)
  AI_PROVIDER: z.enum(['mock', 'groq', 'grok', 'openai', 'gemini']).default('mock'),
  AI_API_KEY: z.string().default(''),
  // P2.4: AI_MODEL configurable; XAI_API_KEY removed (was Groq all along)
  AI_MODEL: z.string().default('llama-3.3-70b-versatile'),
  MARKET_DATA_MODE: z.enum(['auto', 'live', 'mock']).default('auto'),
  BHARATSTOCK_API_KEY: z.string().default(''),
  BHARATSTOCK_BASE_URL: z.string().default('https://bharatstockapi.com'),
  BHARATSTOCK_DAILY_LIMIT: z.coerce.number().default(100),
  TWELVE_DATA_API_KEY: z.string().default(''),
  TWELVE_DATA_BASE_URL: z.string().default('https://api.twelvedata.com'),
  TWELVE_DATA_DAILY_LIMIT: z.coerce.number().default(800),
  MARKET_DATA_PROVIDER: z.enum(['yahoo', 'mock', 'alphavantage', 'finnhub', 'twelvedata', 'bharatstock']).default('yahoo'),
  MARKET_DATA_API_KEY: z.string().default(''),
  CORS_ORIGIN: z.string().optional(),
  CLIENT_URL: z.string().optional(),
  // News Intelligence Engine
  NEWS_PROVIDER: z.enum(['rss', 'mock']).default('rss'),
  NEWS_CACHE_TTL: z.coerce.number().default(300),
  NEWS_MAX_ARTICLES: z.coerce.number().default(50),
  NEWS_AI_ENRICHMENT: z.enum(['true', 'false']).default('false'),
  // P1.1: Server-computed flat trade fee (INR)
  TRADE_FLAT_FEE: z.coerce.number().min(0).default(20),
  // P1.7: Memory fallback controls
  ALLOW_MEMORY_FALLBACK: z.enum(['true', 'false']).default('false'),
  SEED_DEMO_PORTFOLIO: z.enum(['true', 'false']).default('false'),
  // P2.1: Proxy trust
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  // P3.5: Risk-free rate (RBI 91-day T-Bill equivalent)
  RISK_FREE_RATE: z.coerce.number().min(0).max(0.5).default(0.065),
  // P3.11: Stress test market spillover
  STRESS_MARKET_SPILLOVER: z.coerce.number().min(0).max(1).default(0.4),
  // P2.5: Log level
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

const data = parsed.data;

// P2.2: JWT_SECRET security enforcement
let jwtSecret = data.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  if (data.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET must be set to a strong secret (>= 32 chars) in production.');
    process.exit(1);
  }
  // Dev/test: generate a per-process random secret and warn
  jwtSecret = crypto.randomBytes(48).toString('hex');
  if (data.NODE_ENV !== 'test') {
    console.warn('[SECURITY] JWT_SECRET not set or too short. Using a random per-process secret. Set JWT_SECRET in .env for a stable token key.');
  }
}

// P2.2: Reject known insecure patterns in production
if (data.NODE_ENV === 'production') {
  const lc = jwtSecret.toLowerCase();
  if (INSECURE_JWT_PATTERNS.some((p) => lc.includes(p))) {
    console.error('[FATAL] JWT_SECRET matches an insecure pattern. Please generate a proper secret.');
    process.exit(1);
  }
}

// P2.4: Normalize deprecated 'grok' alias → 'groq'
let aiProvider = data.AI_PROVIDER;
if (aiProvider === 'grok') {
  if (data.NODE_ENV !== 'test') {
    console.warn('[DEPRECATED] AI_PROVIDER=grok is deprecated. Use AI_PROVIDER=groq instead.');
  }
  aiProvider = 'groq';
}

const corsOrigin = data.CORS_ORIGIN || data.CLIENT_URL || 'http://localhost:5173';

const configObj = {
  ...data,
  CORS_ORIGIN: corsOrigin,
  JWT_SECRET: jwtSecret,
  AI_PROVIDER: aiProvider,
};

export const config = data.NODE_ENV === 'test' ? configObj : Object.freeze(configObj);
