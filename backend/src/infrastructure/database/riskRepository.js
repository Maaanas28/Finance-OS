import { getPrismaClient } from './prisma.js';
import { logger } from '../../utils/logger.js';

export const BUILTIN_STRESS_SCENARIOS = [
  {
    id: 'scenario-rbi-hike-100',
    name: 'RBI Rate Hike (+100 bps)',
    description: 'Monetary tightening scenario with rising borrowing costs. Banks margin contraction, real estate and auto demand dampening.',
    category: 'MACRO',
    isSystem: true,
    shocks: [
      { target: 'SECTOR', identifier: 'Financial Services', shockPercent: -4.5 },
      { target: 'SECTOR', identifier: 'Real Estate', shockPercent: -6.0 },
      { target: 'SECTOR', identifier: 'Automobile', shockPercent: -3.5 },
      { target: 'SECTOR', identifier: 'Information Technology', shockPercent: 0.5 },
      { target: 'SECTOR', identifier: 'FMCG', shockPercent: -1.0 },
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: -2.8 },
    ],
  },
  {
    id: 'scenario-rbi-cut-100',
    name: 'RBI Rate Cut (-100 bps)',
    description: 'Aggressive monetary easing boosting credit expansion, consumption, and cyclical equities.',
    category: 'MACRO',
    isSystem: true,
    shocks: [
      { target: 'SECTOR', identifier: 'Financial Services', shockPercent: 4.0 },
      { target: 'SECTOR', identifier: 'Real Estate', shockPercent: 6.5 },
      { target: 'SECTOR', identifier: 'Automobile', shockPercent: 4.0 },
      { target: 'SECTOR', identifier: 'Information Technology', shockPercent: 1.5 },
      { target: 'SECTOR', identifier: 'FMCG', shockPercent: 1.0 },
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: 3.2 },
    ],
  },
  {
    id: 'scenario-crude-oil-plus-25',
    name: 'Crude Oil Spike (+25%)',
    description: 'Geopolitical supply disruption raising Brent crude to $105/bbl. Benefits upstream oil & gas, heavily compresses margins for paints, autos, and aviation.',
    category: 'GEOPOLITICAL',
    isSystem: true,
    shocks: [
      { target: 'SECTOR', identifier: 'Energy', shockPercent: 6.0 },
      { target: 'SECTOR', identifier: 'Automobile', shockPercent: -6.5 },
      { target: 'SECTOR', identifier: 'Aviation', shockPercent: -11.0 },
      { target: 'SECTOR', identifier: 'Chemicals', shockPercent: -5.0 },
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: -3.2 },
    ],
  },
  {
    id: 'scenario-crude-oil-minus-25',
    name: 'Crude Oil Collapse (-25%)',
    description: 'Global demand contraction or OPEC quota surplus dropping oil to $55/bbl. Massive tailwind for Indian import bill, margins for auto, paints, and FMCG.',
    category: 'GEOPOLITICAL',
    isSystem: true,
    shocks: [
      { target: 'SECTOR', identifier: 'Energy', shockPercent: -5.0 },
      { target: 'SECTOR', identifier: 'Automobile', shockPercent: 5.5 },
      { target: 'SECTOR', identifier: 'FMCG', shockPercent: 3.0 },
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: 2.5 },
    ],
  },
  {
    id: 'scenario-tech-correction-15',
    name: 'Technology Sector Correction (-15%)',
    description: 'US enterprise IT spending slowdown and currency headwind hitting tier-1 Indian IT exporters.',
    category: 'SECTOR',
    isSystem: true,
    shocks: [
      { target: 'SECTOR', identifier: 'Information Technology', shockPercent: -15.0 },
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: -2.5 },
    ],
  },
  {
    id: 'scenario-financial-contagion-15',
    name: 'Financial Sector Contagion (-15%)',
    description: 'Systemic liquidity squeeze or asset quality deterioration across top Indian private and PSU lenders.',
    category: 'SECTOR',
    isSystem: true,
    shocks: [
      { target: 'SECTOR', identifier: 'Financial Services', shockPercent: -15.0 },
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: -5.2 },
    ],
  },
  {
    id: 'scenario-market-crash-10',
    name: 'Broad Indian Market Shock (-10%)',
    description: 'Flash crash or severe foreign institutional outflow driving NIFTY 50 down by 10% in a single session.',
    category: 'MACRO',
    isSystem: true,
    shocks: [
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: -10.0 },
    ],
  },
  {
    id: 'scenario-market-rally-10',
    name: 'Broad Indian Market Rally (+10%)',
    description: 'Decisive macro reform announcement or FII liquidity wave driving NIFTY 50 up by 10%.',
    category: 'MACRO',
    isSystem: true,
    shocks: [
      { target: 'MARKET', identifier: 'BROAD_MARKET', shockPercent: 10.0 },
    ],
  },
];

export class RiskRepository {
  constructor() {
    this.memoryScenarios = new Map();
    this.useMemoryFallback = false;

    // Seed built-in scenarios in memory
    for (const sc of BUILTIN_STRESS_SCENARIOS) {
      this.memoryScenarios.set(sc.id, { ...sc, createdAt: new Date() });
    }
  }

  async getScenarios(userId = null) {
    let dbScenarios = [];
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        dbScenarios = await prisma.stressScenario.findMany({
          where: {
            OR: [
              { isSystem: true },
              ...(userId ? [{ userId }] : []),
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        logger.warn(`Prisma stressScenario query failed, falling back to in-memory: ${err.message}`);
        this.useMemoryFallback = true;
      }
    }

    const memoryList = Array.from(this.memoryScenarios.values()).filter(
      (s) => s.isSystem || (userId && s.userId === userId)
    );

    const mergedMap = new Map();
    for (const s of memoryList) {
      mergedMap.set(s.id || s.name, s);
    }
    for (const s of dbScenarios) {
      mergedMap.set(s.id || s.name, s);
    }

    return Array.from(mergedMap.values());
  }

  async getScenarioById(id) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        const sc = await prisma.stressScenario.findUnique({ where: { id } });
        if (sc) return sc;
      } catch (err) {
        this.useMemoryFallback = true;
      }
    }

    return this.memoryScenarios.get(id) || null;
  }

  async createScenario(userId, scenarioData) {
    const newScenario = {
      id: `scenario-${Date.now()}`,
      userId: userId || null,
      name: scenarioData.name,
      description: scenarioData.description || null,
      category: scenarioData.category || 'CUSTOM',
      shocks: scenarioData.shocks || [],
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.stressScenario.create({
          data: {
            name: newScenario.name,
            description: newScenario.description,
            category: newScenario.category,
            shocks: newScenario.shocks,
            isSystem: false,
            userId: userId || undefined,
          },
        });
      } catch (err) {
        this.useMemoryFallback = true;
      }
    }

    this.memoryScenarios.set(newScenario.id, newScenario);
    return newScenario;
  }
}

export const riskRepository = new RiskRepository();
