import { portfolioRepository } from '../../infrastructure/database/portfolioRepository.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

// P1.2: Quote statuses that block trade execution in non-mock modes
const NON_TRADEABLE_STATUSES = ['SIMULATED', 'UNAVAILABLE'];
// P1.2: Stale quotes older than 5 min are rejected for trades
const STALE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * P1.2: Check if a quote is tradeable.
 * In explicit mock mode, any quote is accepted.
 * In auto/live mode: SIMULATED and UNAVAILABLE are blocked; STALE > 5 min is blocked.
 */
function assertQuoteTradeable(quote, symbol) {
  if (config.MARKET_DATA_MODE === 'mock') return; // explicit dev/test mode – allow everything

  if (!quote || !quote.price || Number(quote.price) <= 0) {
    throw new BadRequestError(
      `QUOTE_NOT_TRADEABLE: Live market quote unavailable for [${symbol}]`,
      { code: 'QUOTE_NOT_TRADEABLE' }
    );
  }

  if (NON_TRADEABLE_STATUSES.includes(quote.dataStatus)) {
    throw new BadRequestError(
      `QUOTE_NOT_TRADEABLE: Quote for [${symbol}] is ${quote.dataStatus} and cannot be used for live trading`,
      { code: 'QUOTE_NOT_TRADEABLE' }
    );
  }

  if (quote.dataStatus === 'STALE') {
    const fetchedAt = quote.fetchedAt ? new Date(quote.fetchedAt).getTime() : 0;
    if (Date.now() - fetchedAt > STALE_MAX_AGE_MS) {
      throw new BadRequestError(
        `QUOTE_NOT_TRADEABLE: Quote for [${symbol}] is STALE (older than 5 minutes). Refresh and retry.`,
        { code: 'QUOTE_NOT_TRADEABLE' }
      );
    }
  }
}

export class PortfolioService {
  async getPortfolio(portfolioId = null, userId = null) {
    let p = null;

    // 1. If portfolioId specified, try fetching and verify ownership if userId provided
    if (portfolioId) {
      const found = await portfolioRepository.getPortfolioById(portfolioId);
      if (found) {
        // P1.5: Cross-user portfolioId access returns 404 when userId is supplied
        if (userId && found.userId !== userId) {
          throw new NotFoundError('Portfolio not found');
        }
        p = found;
      }
    }

    // 2. If no portfolio found yet, fetch user's portfolios using userId
    if (!p && userId) {
      const list = await portfolioRepository.getPortfoliosByUser(userId);
      p = list[0] || null;
    }

    // 3. Automatically create a clean primary portfolio if user has none
    if (!p && userId) {
      p = await portfolioRepository.createPortfolio({
        userId,
        name: 'Primary Investment Portfolio',
        description: 'Personal virtual investment portfolio',
        currency: 'INR',
        benchmarkSymbol: 'NIFTY 50',
        initialCash: 0,
      });
    }

    if (!p) {
      throw new NotFoundError('Portfolio not found');
    }

    return p;
  }

  async getUserPortfolios(userId) {
    const list = await portfolioRepository.getPortfoliosByUser(userId);
    return list;
  }

  async createPortfolio(userId, data) {
    return await portfolioRepository.createPortfolio({
      userId,
      name: data.name,
      description: data.description,
      currency: data.currency || 'INR',
      benchmarkSymbol: data.benchmarkSymbol || 'NIFTY 50',
      initialCash: data.initialCash || 0,
    });
  }

  /**
   * Mark-to-market valuation integrating directly with MarketDataService
   */
  async getValuation(portfolioId = null, userId = null, options = {}) {
    const portfolio = await this.getPortfolio(portfolioId, userId);
    const rawHoldings = portfolio.holdings || [];

    // Parallel pricing via MarketDataService
    const pricedHoldings = await Promise.all(
      rawHoldings.map(async (h) => {
        let quote = null;
        try {
          quote = await marketDataService.getQuote(h.symbol, h.exchange);
        } catch (err) {
          logger.warn(`Failed to price holding [${h.symbol}]: ${err.message}`);
        }

        const ltp = quote?.price !== null && quote?.price !== undefined ? Number(quote.price) : Number(h.averageBuyPrice);
        const previousClose = quote?.previousClose !== null && quote?.previousClose !== undefined ? Number(quote.previousClose) : ltp;

        const qty = Number(h.quantity);
        const avgPrice = Number(h.averageBuyPrice);

        const currentValue = Math.round(qty * ltp * 100) / 100;
        const costBasis = Math.round(qty * avgPrice * 100) / 100;
        // P3.8: canonical field names: unrealizedPnl (alias totalPnl)
        const unrealizedPnl = Math.round((currentValue - costBasis) * 100) / 100;
        const unrealizedPnlPercent = costBasis > 0 ? Math.round(((currentValue - costBasis) / costBasis) * 10000) / 100 : 0;

        const todayPnl = Math.round(qty * (ltp - previousClose) * 100) / 100;
        const todayPnlPercent = previousClose > 0 ? Math.round(((ltp - previousClose) / previousClose) * 10000) / 100 : 0;

        return {
          id: h.id,
          symbol: h.symbol,
          exchange: h.exchange || 'NSE',
          name: h.name || quote?.name || h.symbol,
          sector: h.sector || 'Unclassified',
          assetType: h.assetType || 'EQUITY',
          quantity: qty,
          averageBuyPrice: avgPrice,
          ltp,
          previousClose,
          currentValue,
          costBasis,
          // P3.8: both names provided for compatibility
          totalPnl: unrealizedPnl,
          unrealizedPnl,
          unrealizedPnlPercent,
          todayPnl,
          todayPnlPercent,
          dataStatus: quote?.dataStatus || 'SIMULATED',
          dataSource: quote?.dataSource || 'mock',
        };
      })
    );

    const cashBalance = Number(portfolio.cashBalance) || 0;
    const equityValue = pricedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    // P3.8: investedAmount (was investedCapital)
    const investedAmount = pricedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalValue = Math.round((equityValue + cashBalance) * 100) / 100;

    const todayPnl = Math.round(pricedHoldings.reduce((sum, h) => sum + h.todayPnl, 0) * 100) / 100;
    const baseValue = totalValue - todayPnl;
    const todayPnlPercent = baseValue > 0 ? Math.round((todayPnl / baseValue) * 10000) / 100 : 0;

    const totalReturn = Math.round((equityValue - investedAmount) * 100) / 100;
    const totalReturnPercent = investedAmount > 0 ? Math.round((totalReturn / investedAmount) * 10000) / 100 : 0;

    // P3.8: unrealizedPnl and realizedPnl on summary
    const unrealizedPnl = totalReturn; // equity value - cost basis
    const unrealizedPnlPercent = totalReturnPercent;

    // P3.8: realizedPnl from SELL transactions
    const allTransactions = portfolio.transactions || [];
    const realizedPnl = Math.round(
      allTransactions
        .filter((t) => t.type === 'SELL' && t.realizedPnl != null)
        .reduce((sum, t) => sum + Number(t.realizedPnl), 0) * 100
    ) / 100;
    const totalPnl = Math.round((unrealizedPnl + realizedPnl) * 100) / 100;

    // Calculate allocation percentage per holding
    const enrichedHoldings = pricedHoldings.map((h) => ({
      ...h,
      allocationPercent: totalValue > 0 ? Math.round((h.currentValue / totalValue) * 10000) / 100 : 0,
    })).sort((a, b) => b.currentValue - a.currentValue);

    const overallDataStatus = pricedHoldings.some((h) => h.dataStatus === 'DELAYED')
      ? 'DELAYED'
      : pricedHoldings.some((h) => h.dataStatus === 'STALE')
      ? 'STALE'
      : 'LIVE';

    let beta = 0;
    let sharpe = 0;
    let riskLevel = enrichedHoldings.length > 0 ? 'MODERATE' : 'LOW';

    if (options.includeRisk !== false) {
      try {
        const { riskService } = await import('../risk/risk.service.js');
        const riskMetrics = await riskService.getRiskMetrics(portfolioId, userId);
        if (riskMetrics?.summary) {
          beta = riskMetrics.summary.beta !== undefined ? riskMetrics.summary.beta : 0;
          sharpe = riskMetrics.summary.sharpe !== undefined ? riskMetrics.summary.sharpe : 0;
          riskLevel = riskMetrics.summary.riskLevel || riskLevel;
        }
      } catch (err) {
        logger.warn(`Failed to enrich valuation with risk metrics: ${err.message}`);
      }
    }

    return {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        currency: portfolio.currency || 'INR',
        currencySymbol: portfolio.currency === 'USD' ? '$' : '₹',
        benchmarkSymbol: portfolio.benchmarkSymbol || 'NIFTY 50',
      },
      summary: {
        totalValue,
        equityValue: Math.round(equityValue * 100) / 100,
        cashBalance: Math.round(cashBalance * 100) / 100,
        investedAmount: Math.round(investedAmount * 100) / 100,
        unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        unrealizedPnlPercent,
        realizedPnl,
        totalPnl,
        todayPnl,
        todayPnlPercent,
        totalReturn,
        totalReturnPercent,
        // P3.8: alpha removed from here; comes from analytics (3.5)
        beta,
        sharpe,
        sharpeRatio: sharpe,
        riskLevel,
        dataStatus: overallDataStatus,
      },
      holdings: enrichedHoldings,
    };
  }

  /**
   * Sector and Asset Class Exposure
   */
  async getAllocations(portfolioId = null, userId = null) {
    const valuation = await this.getValuation(portfolioId, userId, { includeRisk: false });
    const { holdings, summary } = valuation;

    const sectorMap = {};
    const assetTypeMap = {
      EQUITY: summary.equityValue,
      CASH: summary.cashBalance,
    };

    for (const h of holdings) {
      const sector = h.sector || 'Unclassified';
      sectorMap[sector] = (sectorMap[sector] || 0) + h.currentValue;
    }

    const totalVal = summary.totalValue || 1;
    const sectors = Object.entries(sectorMap).map(([name, value]) => {
      const percent = Math.round((value / totalVal) * 10000) / 100;
      return {
        name,
        value: Math.round(value * 100) / 100,
        percent,
        // Institutional risk threshold: concentration above 30% is elevated
        isElevatedRisk: percent > 30.0,
      };
    }).sort((a, b) => b.value - a.value);

    const assetClasses = Object.entries(assetTypeMap).map(([type, value]) => ({
      type,
      value: Math.round(value * 100) / 100,
      percent: Math.round((value / totalVal) * 10000) / 100,
    }));

    return {
      totalValue: summary.totalValue,
      sectors,
      assetClasses,
      maxConcentrationSector: sectors[0] || null,
      hasConcentrationRisk: sectors.some((s) => s.isElevatedRisk),
    };
  }

  /**
   * P1.1 + P1.2 + P1.6: Execute Transaction
   * - Server decides exec price from live quote (ignores client price)
   * - Server-computed flat fee
   * - Rejects non-tradeable quotes (SIMULATED/UNAVAILABLE/STALE>5min) in auto/live mode
   * - Atomic writes via applyTrade
   */
  async executeTransaction(txData, userId = null) {
    const targetPortfolioId = txData.portfolioId || null;
    const portfolio = await this.getPortfolio(targetPortfolioId, userId);

    const { type, symbol, exchange = 'NSE', quantity = 0, amount = 0, notes } = txData;
    const numQty = Number(quantity);
    const currentCash = Number(portfolio.cashBalance) || 0;

    let transactionRecord = null;

    if (type === 'BUY') {
      if (!symbol || numQty <= 0) {
        throw new BadRequestError('BUY orders require a valid symbol and positive quantity');
      }

      // P1.1: Server fetches authoritative live quote — client price is completely ignored
      const liveQuote = await marketDataService.getQuote(symbol, exchange);

      // P1.2: Reject non-real/stale quotes in auto/live mode
      assertQuoteTradeable(liveQuote, symbol);

      if (!liveQuote || !liveQuote.price || Number(liveQuote.price) <= 0) {
        throw new BadRequestError(`Live market quote unavailable for [${symbol}] on ${exchange}`);
      }

      // P1.1: execPrice always from server quote
      const execPrice = Number(liveQuote.price);
      // P1.1: Server-computed flat fee
      const tradeFee = config.TRADE_FLAT_FEE;
      const totalTradeCost = Math.round((numQty * execPrice + tradeFee) * 100) / 100;
      if (totalTradeCost > currentCash) {
        throw new BadRequestError(
          `Insufficient cash balance. Required: ₹${totalTradeCost}, Available: ₹${currentCash}`
        );
      }

      // Check existing holding to compute weighted average
      const existingHolding = (portfolio.holdings || []).find(
        (h) => h.symbol.toUpperCase() === symbol.toUpperCase() && h.exchange === exchange
      );

      let newQty = numQty;
      let newAvgPrice = execPrice;
      let sector = 'Unclassified';
      let name = liveQuote.name || symbol;

      if (existingHolding) {
        const oldQty = Number(existingHolding.quantity);
        const oldAvg = Number(existingHolding.averageBuyPrice);
        newQty = oldQty + numQty;
        newAvgPrice = Math.round(((oldQty * oldAvg + numQty * execPrice) / newQty) * 100) / 100;
        sector = existingHolding.sector || sector;
        name = existingHolding.name || name;
      } else {
        // Use sector from quote if available
        sector = liveQuote.sector || 'Unclassified';
      }

      // P1.6: Atomic trade via applyTrade
      transactionRecord = await portfolioRepository.applyTrade(portfolio.id, {
        type: 'BUY',
        symbol: symbol.toUpperCase(),
        exchange,
        name,
        sector,
        quantity: numQty,
        newTotalQty: newQty,
        newAvgPrice,
        execPrice,
        tradeFee,
        totalTradeCost,
        notes: notes || `Acquired ${numQty} shares @ ₹${execPrice}`,
        existingHolding,
      });

      logger.info(`BUY trade executed for [${symbol}]: ${numQty} shares @ ₹${execPrice} fee ₹${tradeFee}`);
    } else if (type === 'SELL') {
      if (!symbol || numQty <= 0) {
        throw new BadRequestError('SELL orders require a valid symbol and positive quantity');
      }

      // P1.1: Server fetches authoritative live quote
      const liveQuote = await marketDataService.getQuote(symbol, exchange);

      // P1.2: Reject non-real/stale quotes
      assertQuoteTradeable(liveQuote, symbol);

      if (!liveQuote || !liveQuote.price || Number(liveQuote.price) <= 0) {
        throw new BadRequestError(`Live market quote unavailable for [${symbol}] on ${exchange}`);
      }

      const execPrice = Number(liveQuote.price);
      const tradeFee = config.TRADE_FLAT_FEE;
      const existingHolding = (portfolio.holdings || []).find(
        (h) => h.symbol.toUpperCase() === symbol.toUpperCase() && h.exchange === exchange
      );

      if (!existingHolding || Number(existingHolding.quantity) < numQty) {
        const available = existingHolding ? Number(existingHolding.quantity) : 0;
        throw new BadRequestError(
          `Cannot SELL ${numQty} shares of ${symbol}. Available position: ${available}`
        );
      }

      const grossProceeds = Math.round(numQty * execPrice * 100) / 100;
      const netProceeds = Math.round((grossProceeds - tradeFee) * 100) / 100;
      const costBasis = Math.round(numQty * Number(existingHolding.averageBuyPrice) * 100) / 100;
      // P3.8: realizedPnl on SELL
      const realizedPnl = Math.round((netProceeds - costBasis) * 100) / 100;

      const remainingQty = Number(existingHolding.quantity) - numQty;

      // P1.6: Atomic trade via applyTrade
      transactionRecord = await portfolioRepository.applyTrade(portfolio.id, {
        type: 'SELL',
        symbol: symbol.toUpperCase(),
        exchange,
        name: existingHolding.name,
        sector: existingHolding.sector,
        quantity: numQty,
        remainingQty,
        execPrice,
        tradeFee,
        netProceeds,
        realizedPnl,
        existingHolding,
        notes: notes || `Realized P&L: ${realizedPnl >= 0 ? '+' : ''}₹${realizedPnl}`,
      });

      logger.info(`SELL trade executed for [${symbol}]: ${numQty} shares @ ₹${execPrice} fee ₹${tradeFee}`);
    } else if (type === 'DEPOSIT') {
      const depositAmt = Number(amount);
      if (depositAmt <= 0) {
        throw new BadRequestError('Deposit amount must be greater than zero');
      }

      const newCash = Math.round((currentCash + depositAmt) * 100) / 100;
      await portfolioRepository.updateCashBalance(portfolio.id, newCash);

      transactionRecord = await portfolioRepository.recordTransaction(portfolio.id, {
        type: 'DEPOSIT',
        amount: depositAmt,
        fees: 0,
        notes: notes || 'Cash capital injection',
      });
    } else if (type === 'WITHDRAWAL') {
      const withdrawAmt = Number(amount);
      if (withdrawAmt <= 0) {
        throw new BadRequestError('Withdrawal amount must be greater than zero');
      }
      if (withdrawAmt > currentCash) {
        throw new BadRequestError(`Insufficient cash balance for withdrawal. Available: ₹${currentCash}`);
      }

      const newCash = Math.round((currentCash - withdrawAmt) * 100) / 100;
      await portfolioRepository.updateCashBalance(portfolio.id, newCash);

      transactionRecord = await portfolioRepository.recordTransaction(portfolio.id, {
        type: 'WITHDRAWAL',
        amount: withdrawAmt,
        fees: 0,
        notes: notes || 'Cash capital distribution',
      });
    }

    return {
      success: true,
      transaction: transactionRecord,
      fee: type === 'BUY' || type === 'SELL' ? config.TRADE_FLAT_FEE : 0,
    };
  }

  async getTransactions(portfolioId = null, userId = null, options = {}) {
    const portfolio = await this.getPortfolio(portfolioId, userId);
    if (!portfolio.transactions && portfolio.id) {
      const fullP = await portfolioRepository.getPortfolioById(portfolio.id);
      return fullP?.transactions || [];
    }
    return portfolio.transactions || [];
  }

  // P1.8: getAllTransactions (no limit) for risk/analytics
  async getAllTransactions(portfolioId = null, userId = null) {
    const portfolio = await this.getPortfolio(portfolioId, userId);
    return await portfolioRepository.getAllTransactions(portfolio.id);
  }

  async getPerformanceHistory(portfolioId = null, userId = null, timeframe = '1M') {
    const valuation = await this.getValuation(portfolioId, userId, { includeRisk: false });
    const currentVal = valuation.summary.totalValue;
    const holdings = valuation.holdings || [];

    // STRICT RULE: return empty performance series if user has no real holdings or zero portfolio value.
    if (currentVal <= 0 || holdings.length === 0) {
      return {
        timeframe,
        currentValuation: 0,
        benchmark: valuation.portfolio.benchmarkSymbol,
        performance: [],
      };
    }

    const portfolio = await this.getPortfolio(portfolioId, userId);
    const transactions = (portfolio.transactions || []).filter((t) => t.type === 'BUY' || t.type === 'SELL');

    if (transactions.length === 0) {
      return {
        timeframe,
        currentValuation: currentVal,
        benchmark: valuation.portfolio.benchmarkSymbol,
        performance: [],
      };
    }

    // P3.10: Use real NAV series from riskService if available
    try {
      const { riskService } = await import('../risk/risk.service.js');
      const syncReturns = await riskService.getSynchronizedReturns(portfolioId, userId);
      if (syncReturns?.navSeries && syncReturns.navSeries.length > 0) {
        const nav = syncReturns.navSeries;

        // Slice by timeframe
        const tf = (timeframe || '1M').toUpperCase();
        const now = Date.now();
        const msPerDay = 86400000;
        const cutoffMs = tf === '1D' ? 1 * msPerDay
          : tf === '1W' ? 7 * msPerDay
          : tf === '1M' ? 30 * msPerDay
          : tf === '3M' ? 90 * msPerDay
          : tf === '6M' ? 180 * msPerDay
          : tf === '1Y' ? 365 * msPerDay
          : 0; // ALL = no cutoff

        let filtered = cutoffMs > 0
          ? nav.filter((pt) => new Date(pt.date).getTime() >= now - cutoffMs)
          : nav;

        // Ensure at least 2 data points for rendering a proper line chart
        if (filtered.length < 2 && nav.length >= 2) {
          filtered = nav.slice(-2);
        } else if (filtered.length === 1) {
          const firstPt = filtered[0];
          const val = firstPt.nav ?? firstPt.value ?? currentVal;
          const prevDate = new Date(new Date(firstPt.date).getTime() - (tf === '1D' ? 86400000 : 7 * 86400000))
            .toISOString().split('T')[0];
          filtered = [
            { date: prevDate, nav: val },
            firstPt,
          ];
        }

        const performance = filtered.map((pt) => ({
          time: pt.date,
          value: Number((pt.nav ?? pt.value ?? 0).toFixed(2)),
        }));

        return {
          timeframe,
          currentValuation: currentVal,
          benchmark: valuation.portfolio.benchmarkSymbol,
          performance,
        };
      }
    } catch (err) {
      logger.warn(`Failed to get NAV series from risk service: ${err.message}`);
    }

    // Fallback: return empty when history insufficient
    return {
      timeframe,
      currentValuation: currentVal,
      benchmark: valuation.portfolio.benchmarkSymbol,
      performance: [],
    };
  }
}

export const portfolioService = new PortfolioService();
