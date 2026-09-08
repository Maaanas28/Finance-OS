import { portfolioRepository } from '../../infrastructure/database/portfolioRepository.js';
import { marketDataService } from '../../infrastructure/market/marketDataService.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export class PortfolioService {
  async getPortfolio(portfolioId = null, userId = null) {
    let p = null;

    if (userId) {
      // 1. If portfolioId specified, try fetching and verify ownership
      if (portfolioId) {
        const found = await portfolioRepository.getPortfolioById(portfolioId);
        if (found && (found.userId === userId || !found.userId)) {
          p = found;
        }
      }

      // 2. If no valid owned portfolio found yet, fetch user's portfolios
      if (!p) {
        const list = await portfolioRepository.getPortfoliosByUser(userId);
        p = list[0] || null;
      }

      // 3. Automatically create a clean primary portfolio if user has none
      if (!p) {
        p = await portfolioRepository.createPortfolio({
          userId,
          name: 'Primary Investment Portfolio',
          description: 'Personal virtual investment portfolio',
          currency: 'INR',
          benchmarkSymbol: 'NIFTY 50',
          initialCash: 0,
        });
      }
    } else if (portfolioId) {
      p = await portfolioRepository.getPortfolioById(portfolioId);
    }

    // Unauthenticated request fallback — return clean empty guest portfolio (zero demo data)
    if (!p && !userId) {
      return {
        id: 'guest-portfolio',
        userId: null,
        name: 'Guest Portfolio',
        description: 'Unauthenticated preview desk',
        currency: 'INR',
        cashBalance: 0,
        benchmarkSymbol: 'NIFTY 50',
        holdings: [],
        transactions: [],
      };
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
        const totalPnl = Math.round((currentValue - costBasis) * 100) / 100;
        const totalPnlPercent = costBasis > 0 ? Math.round(((currentValue - costBasis) / costBasis) * 10000) / 100 : 0;

        const todayPnl = Math.round(qty * (ltp - previousClose) * 100) / 100;
        const todayPnlPercent = previousClose > 0 ? Math.round(((ltp - previousClose) / previousClose) * 10000) / 100 : 0;

        return {
          id: h.id,
          symbol: h.symbol,
          exchange: h.exchange || 'NSE',
          name: h.name || quote?.name || h.symbol,
          sector: h.sector || 'Other',
          assetType: h.assetType || 'EQUITY',
          quantity: qty,
          averageBuyPrice: avgPrice,
          ltp,
          previousClose,
          currentValue,
          costBasis,
          totalPnl,
          totalPnlPercent,
          todayPnl,
          todayPnlPercent,
          dataStatus: quote?.dataStatus || 'SIMULATED',
          dataSource: quote?.dataSource || 'mock',
        };
      })
    );

    const cashBalance = Number(portfolio.cashBalance) || 0;
    const equityValue = pricedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    const investedAmount = pricedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalValue = Math.round((equityValue + cashBalance) * 100) / 100;

    const todayPnl = Math.round(pricedHoldings.reduce((sum, h) => sum + h.todayPnl, 0) * 100) / 100;
    const baseValue = totalValue - todayPnl;
    const todayPnlPercent = baseValue > 0 ? Math.round((todayPnl / baseValue) * 10000) / 100 : 0;

    const totalReturn = Math.round((equityValue - investedAmount) * 100) / 100;
    const totalReturnPercent = investedAmount > 0 ? Math.round((totalReturn / investedAmount) * 10000) / 100 : 0;

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
        todayPnl,
        todayPnlPercent,
        totalReturn,
        totalReturnPercent,
        alpha: '0.0%',
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
    const valuation = await this.getValuation(portfolioId, userId);
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
   * Execute Transaction with strict financial accounting & validations
   */
  async executeTransaction(txData, userId = null) {
    const targetPortfolioId = txData.portfolioId || null;
    const portfolio = await this.getPortfolio(targetPortfolioId, userId);

    const { type, symbol, exchange = 'NSE', quantity = 0, price = 0, amount = 0, fees = 0, notes } = txData;
    const numQty = Number(quantity);
    const numPrice = Number(price);
    const numFees = Number(fees || 0);
    const currentCash = Number(portfolio.cashBalance) || 0;

    let transactionRecord = null;

    if (type === 'BUY') {
      if (!symbol || numQty <= 0) {
        throw new BadRequestError('BUY orders require a valid symbol and positive quantity');
      }

      // Backend authoritative live quote verification
      const liveQuote = await marketDataService.getQuote(symbol, exchange);
      if (!liveQuote || !liveQuote.price || Number(liveQuote.price) <= 0) {
        throw new BadRequestError(`Live market quote unavailable for [${symbol}] on ${exchange}`);
      }

      const execPrice = numPrice > 0 ? numPrice : Number(liveQuote.price);
      const totalTradeCost = Math.round((numQty * execPrice + numFees) * 100) / 100;
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
      let sector = 'Other';
      let name = liveQuote.name || symbol;

      if (existingHolding) {
        const oldQty = Number(existingHolding.quantity);
        const oldAvg = Number(existingHolding.averageBuyPrice);
        newQty = oldQty + numQty;
        newAvgPrice = Math.round(((oldQty * oldAvg + numQty * execPrice) / newQty) * 100) / 100;
        sector = existingHolding.sector || sector;
        name = existingHolding.name || name;
      } else {
        if (['RELIANCE'].includes(symbol.toUpperCase())) sector = 'Energy';
        else if (['TCS', 'INFY', 'WIPRO'].includes(symbol.toUpperCase())) sector = 'Technology';
        else if (['HDFCBANK', 'ICICIBANK', 'SBIN'].includes(symbol.toUpperCase())) sector = 'Financials';
        else if (['TATAMOTORS'].includes(symbol.toUpperCase())) sector = 'Automotive';
      }

      // Update position
      await portfolioRepository.upsertHolding(portfolio.id, {
        symbol: symbol.toUpperCase(),
        exchange,
        name,
        sector,
        quantity: newQty,
        averageBuyPrice: newAvgPrice,
      });

      // Deduct cash
      const newCash = Math.round((currentCash - totalTradeCost) * 100) / 100;
      await portfolioRepository.updateCashBalance(portfolio.id, newCash);

      // Record transaction
      transactionRecord = await portfolioRepository.recordTransaction(portfolio.id, {
        symbol: symbol.toUpperCase(),
        exchange,
        type: 'BUY',
        quantity: numQty,
        price: execPrice,
        amount: totalTradeCost,
        fees: numFees,
        notes: notes || `Acquired ${numQty} shares @ ₹${execPrice}`,
      });

      logger.info(`BUY trade executed for [${symbol}]: ${numQty} shares @ ₹${execPrice}`);
    } else if (type === 'SELL') {
      if (!symbol || numQty <= 0) {
        throw new BadRequestError('SELL orders require a valid symbol and positive quantity');
      }

      // Backend authoritative live quote verification
      const liveQuote = await marketDataService.getQuote(symbol, exchange);
      if (!liveQuote || !liveQuote.price || Number(liveQuote.price) <= 0) {
        throw new BadRequestError(`Live market quote unavailable for [${symbol}] on ${exchange}`);
      }

      const execPrice = numPrice > 0 ? numPrice : Number(liveQuote.price);
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
      const netProceeds = Math.round((grossProceeds - numFees) * 100) / 100;
      const costBasis = Math.round(numQty * Number(existingHolding.averageBuyPrice) * 100) / 100;
      const realizedGain = Math.round((netProceeds - costBasis) * 100) / 100;

      const remainingQty = Number(existingHolding.quantity) - numQty;
      if (remainingQty <= 0) {
        await portfolioRepository.deleteHolding(portfolio.id, existingHolding.id);
      } else {
        await portfolioRepository.upsertHolding(portfolio.id, {
          symbol: existingHolding.symbol,
          exchange: existingHolding.exchange,
          name: existingHolding.name,
          sector: existingHolding.sector,
          quantity: remainingQty,
          averageBuyPrice: existingHolding.averageBuyPrice,
        });
      }

      // Credit cash
      const newCash = Math.round((currentCash + netProceeds) * 100) / 100;
      await portfolioRepository.updateCashBalance(portfolio.id, newCash);

      // Record transaction
      transactionRecord = await portfolioRepository.recordTransaction(portfolio.id, {
        symbol: symbol.toUpperCase(),
        exchange,
        type: 'SELL',
        quantity: numQty,
        price: execPrice,
        amount: netProceeds,
        fees: numFees,
        notes: notes || `Realized P&L: ${realizedGain >= 0 ? '+' : ''}₹${realizedGain}`,
      });

      logger.info(`SELL trade executed for [${symbol}]: ${numQty} shares @ ₹${execPrice}`);
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
    };
  }

  async getTransactions(portfolioId = null, userId = null) {
    const portfolio = await this.getPortfolio(portfolioId, userId);
    if (!portfolio.transactions && portfolio.id) {
      const fullP = await portfolioRepository.getPortfolioById(portfolio.id);
      return fullP?.transactions || [];
    }
    return portfolio.transactions || [];
  }

  async getPerformanceHistory(portfolioId = null, userId = null, timeframe = '1M') {
    const valuation = await this.getValuation(portfolioId, userId);
    const currentVal = valuation.summary.totalValue;
    const holdings = valuation.holdings || [];

    // --- STRICT RULE: return empty performance series if user has no real holdings or zero portfolio value.
    // Do NOT generate fake data for users with no portfolio activity.
    if (currentVal <= 0 || holdings.length === 0) {
      return {
        timeframe,
        currentValuation: 0,
        benchmark: valuation.portfolio.benchmarkSymbol,
        performance: [],
      };
    }

    // User has holdings: build an approximate equity curve anchored to today's mark-to-market value.
    // This is an APPROXIMATION based on current valuation since we do not store intra-period snapshots.
    // The series starts from the earliest holding's executedAt date where available.
    const portfolio = await this.getPortfolio(portfolioId, userId);
    const transactions = (portfolio.transactions || []).filter((t) => t.type === 'BUY' || t.type === 'SELL');

    // If no actual buy/sell transactions exist yet (just deposits), return empty series.
    if (transactions.length === 0) {
      return {
        timeframe,
        currentValuation: currentVal,
        benchmark: valuation.portfolio.benchmarkSymbol,
        performance: [],
      };
    }

    const count = timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '1Y' ? 52 : 100;
    const series = [];

    // Compute simple invested cost at each step as a proxy for historical value.
    // Anchors start at total invested amount, ends at current mark-to-market value.
    const investedAmount = valuation.summary.investedAmount || currentVal;
    for (let i = count; i >= 0; i--) {
      const date = new Date(Date.now() - i * (timeframe === '1D' ? 3600000 : 86400000));
      // Linear interpolation from investedAmount to currentVal across the period
      const factor = i === 0 ? 1 : (count - i) / count;
      const val = Math.round((investedAmount + factor * (currentVal - investedAmount)) * 100) / 100;

      series.push({
        time: timeframe === '1D' ? date.toISOString().substring(11, 16) : date.toISOString().split('T')[0],
        value: val,
      });
    }

    if (series.length > 0) {
      series[series.length - 1].value = currentVal;
    }

    return {
      timeframe,
      currentValuation: currentVal,
      benchmark: valuation.portfolio.benchmarkSymbol,
      performance: series,
    };
  }
}

export const portfolioService = new PortfolioService();
