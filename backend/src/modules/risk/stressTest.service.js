import { portfolioService } from '../portfolio/portfolio.service.js';
import { riskRepository } from '../../infrastructure/database/riskRepository.js';
import { RiskMath } from './riskMath.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

export class StressTestService {
  /**
   * List all available scenarios (built-in + user custom)
   */
  async getScenarios(userId = null) {
    return await riskRepository.getScenarios(userId);
  }

  /**
   * Run Stress Scenario Evaluation on a portfolio
   * @param {string} portfolioId
   * @param {Object} options - { scenarioId, customScenario, userId }
   */
  async executeStressTest(portfolioId = null, options = {}) {
    const { scenarioId, customScenario, userId = null } = options;

    let scenario = null;
    if (scenarioId) {
      scenario = await riskRepository.getScenarioById(scenarioId);
      if (!scenario) {
        throw new NotFoundError(`Stress scenario [${scenarioId}] not found`);
      }
    } else if (customScenario) {
      if (!customScenario.shocks || !Array.isArray(customScenario.shocks) || customScenario.shocks.length === 0) {
        throw new BadRequestError('Custom stress scenario requires at least one shock condition');
      }
      scenario = {
        id: 'custom-ad-hoc',
        name: customScenario.name || 'Ad-Hoc Custom Shock Scenario',
        description: customScenario.description || 'User-defined dynamic stress test',
        category: 'CUSTOM',
        shocks: customScenario.shocks,
      };
    } else {
      // Default to RBI Rate Hike +100 bps
      scenario = await riskRepository.getScenarioById('scenario-rbi-hike-100');
    }

    const valuation = await portfolioService.getValuation(portfolioId, userId);
    const { holdings, summary, portfolio } = valuation;

    const currentTotalValue = summary.totalValue;
    const currentCash = summary.cashBalance;
    const equityHoldings = holdings.filter((h) => Number(h.quantity) > 0 && h.currentValue > 0);

    const positionImpacts = [];
    let totalPnlDelta = 0;

    for (const h of equityHoldings) {
      const sym = h.symbol.toUpperCase();
      const sector = (h.sector || '').trim().toLowerCase();
      const curVal = Number(h.currentValue);

      // Default shock factor
      let effectiveShockPercent = 0;
      let shockRule = 'Unaffected by scenario shocks';

      // 1. Specific Symbol Shock has highest precedence
      const symbolShock = scenario.shocks.find(
        (s) => s.target === 'SYMBOL' && s.identifier?.toUpperCase() === sym
      );

      if (symbolShock) {
        effectiveShockPercent = Number(symbolShock.shockPercent);
        shockRule = `Direct symbol shock: ${effectiveShockPercent > 0 ? '+' : ''}${effectiveShockPercent}%`;
      } else {
        // 2. Sector Shock
        const sectorShock = scenario.shocks.find(
          (s) => s.target === 'SECTOR' && (
            s.identifier?.toLowerCase() === sector ||
            (s.identifier?.toLowerCase().includes('tech') && sector.includes('tech')) ||
            (s.identifier?.toLowerCase().includes('finan') && (sector.includes('finan') || sector.includes('bank'))) ||
            (s.identifier?.toLowerCase().includes('energy') && sector.includes('energy')) ||
            (s.identifier?.toLowerCase().includes('auto') && (sector.includes('auto') || sector.includes('motor')))
          )
        );

        if (sectorShock) {
          effectiveShockPercent = Number(sectorShock.shockPercent);
          shockRule = `Sector shock [${sectorShock.identifier}]: ${effectiveShockPercent > 0 ? '+' : ''}${effectiveShockPercent}%`;
        }

        // 3. Broad Market Shock (scaled by holding beta if applicable, or base market shock)
        const marketShock = scenario.shocks.find((s) => s.target === 'MARKET');
        if (marketShock) {
          const mktShockVal = Number(marketShock.shockPercent);
          // If sector shock also exists, blend in market spillover
          if (sectorShock) {
            effectiveShockPercent += mktShockVal * 0.4;
            shockRule += ` + Market spillover: ${(mktShockVal * 0.4).toFixed(1)}%`;
          } else {
            effectiveShockPercent = mktShockVal;
            shockRule = `Systemic market shock: ${mktShockVal > 0 ? '+' : ''}${mktShockVal}%`;
          }
        }
      }

      effectiveShockPercent = RiskMath.round(effectiveShockPercent, 2);
      const positionPnlImpact = RiskMath.round((curVal * effectiveShockPercent) / 100, 2);
      const shockedValue = RiskMath.round(curVal + positionPnlImpact, 2);

      totalPnlDelta += positionPnlImpact;

      positionImpacts.push({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        sector: h.sector,
        currentValue: curVal,
        shockPercent: effectiveShockPercent,
        pnlImpact: positionPnlImpact,
        shockedValue,
        appliedRule: shockRule,
      });
    }

    totalPnlDelta = RiskMath.round(totalPnlDelta, 2);
    const postShockPortfolioValue = RiskMath.round(currentTotalValue + totalPnlDelta, 2);
    const portfolioDrawdownPercent = currentTotalValue > 0
      ? RiskMath.round((totalPnlDelta / currentTotalValue) * 100, 2)
      : 0;

    return {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.currency,
        currencySymbol: portfolio.currencySymbol,
      },
      scenario: {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        isSystem: Boolean(scenario.isSystem),
      },
      summary: {
        currentPortfolioValue: currentTotalValue,
        postShockPortfolioValue,
        portfolioImpactAmount: totalPnlDelta,
        portfolioImpactPercent: portfolioDrawdownPercent,
        affectedPositionsCount: positionImpacts.filter((p) => p.shockPercent !== 0).length,
        cashBalanceUnchanged: currentCash,
      },
      positionImpacts: positionImpacts.sort((a, b) => a.pnlImpact - b.pnlImpact), // Worst hit first
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save a new custom scenario
   */
  async createCustomScenario(userId, scenarioData) {
    return await riskRepository.createScenario(userId, scenarioData);
  }
}

export const stressTestService = new StressTestService();
