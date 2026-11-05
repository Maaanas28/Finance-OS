import { z } from 'zod';

export const riskMetricsQuerySchema = z.object({
  portfolioId: z.string().optional(),
  riskFreeRate: z.coerce.number().min(0).max(0.30).optional(),
});

export const shockItemSchema = z.object({
  target: z.enum(['SECTOR', 'SYMBOL', 'MARKET']),
  identifier: z.string().min(1, 'Target identifier is required'),
  shockPercent: z.number().min(-99, 'Shock cannot exceed -99%').max(500, 'Shock cannot exceed +500%'),
});

export const stressTestSchema = z.object({
  portfolioId: z.string().optional(),
  scenarioId: z.string().optional(),
  customScenario: z.object({
    name: z.string().min(1, 'Scenario name is required').max(100),
    description: z.string().max(500).optional(),
    category: z.enum(['MACRO', 'SECTOR', 'GEOPOLITICAL', 'CUSTOM']).default('CUSTOM'),
    shocks: z.array(shockItemSchema).min(1, 'At least one shock condition is required'),
  }).optional(),
});

export const monteCarloSchema = z.object({
  portfolioId: z.string().optional().nullable(),
  initialPortfolioValue: z.coerce.number().positive().optional().nullable(),
  // Accepts both percentage (e.g. 12 for 12%) and decimal fraction (e.g. 0.12)
  expectedReturn: z.coerce.number().min(-100).max(500).optional().nullable(),
  volatility: z.coerce.number().min(0).max(500).optional().nullable(),
  simulationCount: z.coerce.number().int().min(100).max(10000).default(1000),
  horizonDays: z.coerce.number().int().min(10).max(504).default(252),
  targetReturn: z.coerce.number().min(-100).max(500).optional().nullable(),
  seed: z.coerce.number().int().optional().nullable(),
  historicalYears: z.coerce.number().int().min(1).max(5).default(3).optional(),
});
