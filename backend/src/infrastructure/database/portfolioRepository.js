import { getPrismaClient } from './prisma.js';
import { logger } from '../../utils/logger.js';
import { shouldFallbackToMemory, portfolioMutex } from './resilience.js';
import crypto from 'crypto';

class PortfolioRepository {
  constructor() {
    this.memoryPortfolios = new Map();
    this.memoryHoldings = new Map(); // id -> holding
    this.memoryTransactions = new Map(); // id -> transaction
    this.useMemoryFallback = false;

    // P1.5: Only seed demo portfolio when explicitly configured (not in production, not by default)
    if (process.env.SEED_DEMO_PORTFOLIO === 'true' && process.env.NODE_ENV !== 'production') {
      this.seedModelPortfolio();
    }
  }

  seedModelPortfolio() {
    const defaultPortfolioId = 'portfolio-model-alpha';
    const defaultUserId = 'user-demo-analyst';

    const defaultPortfolio = {
      id: defaultPortfolioId,
      userId: defaultUserId,
      name: 'Institutional Alpha Model',
      description: 'Core institutional equities benchmarked to NIFTY 50 with defensive cash allocation',
      currency: 'INR',
      cashBalance: 85400,
      benchmarkSymbol: 'NIFTY 50',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
    };
    this.memoryPortfolios.set(defaultPortfolioId, defaultPortfolio);

    const initialHoldings = [
      { id: 'holding-1', portfolioId: defaultPortfolioId, symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries', sector: 'Energy', assetType: 'EQUITY', quantity: 120, averageBuyPrice: 2450.0 },
      { id: 'holding-2', portfolioId: defaultPortfolioId, symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services', sector: 'Information Technology', assetType: 'EQUITY', quantity: 60, averageBuyPrice: 3500.0 },
      { id: 'holding-3', portfolioId: defaultPortfolioId, symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Ltd', sector: 'Financial Services', assetType: 'EQUITY', quantity: 80, averageBuyPrice: 755.0 },
      { id: 'holding-4', portfolioId: defaultPortfolioId, symbol: 'INFY', exchange: 'NSE', name: 'Infosys Ltd', sector: 'Information Technology', assetType: 'EQUITY', quantity: 95, averageBuyPrice: 1720.0 },
      { id: 'holding-5', portfolioId: defaultPortfolioId, symbol: 'TATAMOTORS', exchange: 'NSE', name: 'Tata Motors', sector: 'Automobile', assetType: 'EQUITY', quantity: 110, averageBuyPrice: 820.0 },
    ];

    for (const h of initialHoldings) {
      this.memoryHoldings.set(h.id, {
        ...h,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      });
    }

    const initialTransactions = [
      { id: 'tx-1', portfolioId: defaultPortfolioId, symbol: 'RELIANCE', exchange: 'NSE', type: 'BUY', quantity: 120, price: 2450.0, amount: 294000, fees: 20, realizedPnl: null, executedAt: new Date('2024-01-15T09:30:00Z'), notes: 'Core energy allocation tranche' },
      { id: 'tx-2', portfolioId: defaultPortfolioId, symbol: 'TCS', exchange: 'NSE', type: 'BUY', quantity: 60, price: 3500.0, amount: 210000, fees: 20, realizedPnl: null, executedAt: new Date('2024-02-01T10:15:00Z'), notes: 'Large-cap IT exposure' },
      { id: 'tx-3', portfolioId: defaultPortfolioId, symbol: 'HDFCBANK', exchange: 'NSE', type: 'BUY', quantity: 80, price: 755.0, amount: 60400, fees: 20, realizedPnl: null, executedAt: new Date('2024-02-18T11:00:00Z'), notes: 'Financials pillar (post 1:1 bonus)' },
      { id: 'tx-4', portfolioId: defaultPortfolioId, symbol: 'INFY', exchange: 'NSE', type: 'BUY', quantity: 95, price: 1720.0, amount: 163400, fees: 20, realizedPnl: null, executedAt: new Date('2024-03-05T14:20:00Z'), notes: 'Export tech rebalance' },
      { id: 'tx-5', portfolioId: defaultPortfolioId, symbol: 'TATAMOTORS', exchange: 'NSE', type: 'BUY', quantity: 110, price: 820.0, amount: 90200, fees: 20, realizedPnl: null, executedAt: new Date('2024-04-10T12:00:00Z'), notes: 'Automotive cyclicals' },
    ];

    for (const tx of initialTransactions) {
      this.memoryTransactions.set(tx.id, tx);
    }
  }

  async getPortfoliosByUser(userId) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        const found = await prisma.portfolio.findMany({
          where: { userId },
          include: {
            holdings: true,
            // P1.8: return latest 50 in list; getAllTransactions for risk
            transactions: { orderBy: { executedAt: 'desc' }, take: 50 },
          },
          orderBy: { createdAt: 'desc' },
        });
        return found;
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          logger.warn('DB getPortfoliosByUser failed (connectivity), using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          // P1.7: domain errors (unique violation, FK, etc.) propagate normally
          throw err;
        }
      }
    }

    const userPortfolios = Array.from(this.memoryPortfolios.values())
      .filter((p) => p.userId === userId)
      .map((p) => {
        const holdings = Array.from(this.memoryHoldings.values()).filter((h) => h.portfolioId === p.id);
        const transactions = Array.from(this.memoryTransactions.values())
          .filter((t) => t.portfolioId === p.id)
          .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
          .slice(0, 50);
        return { ...p, holdings, transactions };
      });
    return userPortfolios;
  }

  async getPortfolioById(id) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        const p = await prisma.portfolio.findUnique({
          where: { id },
          include: {
            holdings: true,
            // P1.8: return latest 50; getAllTransactions for risk/analytics
            transactions: { orderBy: { executedAt: 'desc' }, take: 50 },
          },
        });
        if (p) return p;
        if (this.memoryPortfolios.has(id)) {
          const mem = this.memoryPortfolios.get(id);
          const holdings = Array.from(this.memoryHoldings.values()).filter((h) => h.portfolioId === id);
          const transactions = Array.from(this.memoryTransactions.values())
            .filter((t) => t.portfolioId === id)
            .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
            .slice(0, 50);
          return { ...mem, holdings, transactions };
        }
        return null;
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          logger.warn('DB getPortfolioById failed (connectivity), using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          throw err;
        }
      }
    }

    const p = this.memoryPortfolios.get(id);
    if (!p) return null;

    const holdings = Array.from(this.memoryHoldings.values()).filter((h) => h.portfolioId === id);
    const transactions = Array.from(this.memoryTransactions.values())
      .filter((t) => t.portfolioId === id)
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
      .slice(0, 50);

    return { ...p, holdings, transactions };
  }

  // P1.8: Get ALL transactions for risk/analytics (no limit)
  async getAllTransactions(portfolioId) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.transaction.findMany({
          where: { portfolioId },
          orderBy: { executedAt: 'asc' },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          logger.warn('DB getAllTransactions failed (connectivity), using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          throw err;
        }
      }
    }

    return Array.from(this.memoryTransactions.values())
      .filter((t) => t.portfolioId === portfolioId)
      .sort((a, b) => new Date(a.executedAt) - new Date(b.executedAt));
  }

  async createPortfolio({ userId, name, description, currency = 'INR', benchmarkSymbol = 'NIFTY 50', initialCash = 0 }) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.portfolio.create({
          data: {
            userId,
            name,
            description,
            currency,
            benchmarkSymbol,
            cashBalance: initialCash,
          },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err) || err.code === 'P2003') {
          logger.warn('DB createPortfolio failed, using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          // P1.7: domain errors propagate (e.g. unique name violation)
          throw err;
        }
      }
    }

    const id = `portfolio-${crypto.randomUUID()}`;
    const newP = {
      id,
      userId,
      name,
      description,
      currency,
      cashBalance: Number(initialCash),
      benchmarkSymbol,
      createdAt: new Date(),
      updatedAt: new Date(),
      holdings: [],
      transactions: [],
    };
    this.memoryPortfolios.set(id, newP);
    return newP;
  }

  async updateCashBalance(portfolioId, newCash) {
    const sanitizedCash = Math.round(Number(newCash) * 100) / 100;
    if (!this.useMemoryFallback && !this.memoryPortfolios.has(portfolioId)) {
      try {
        const prisma = getPrismaClient();
        return await prisma.portfolio.update({
          where: { id: portfolioId },
          data: { cashBalance: sanitizedCash },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          this.useMemoryFallback = true;
        } else if (this.memoryPortfolios.has(portfolioId)) {
          const p = this.memoryPortfolios.get(portfolioId);
          p.cashBalance = sanitizedCash;
          p.updatedAt = new Date();
          return p;
        } else {
          throw err;
        }
      }
    }

    const p = this.memoryPortfolios.get(portfolioId);
    if (p) {
      p.cashBalance = sanitizedCash;
      p.updatedAt = new Date();
      return p;
    }
    throw new Error(`Portfolio ${portfolioId} not found`);
  }

  async upsertHolding(portfolioId, { symbol, exchange = 'NSE', name, sector, assetType = 'EQUITY', quantity, averageBuyPrice }) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.portfolioHolding.upsert({
          where: {
            portfolioId_symbol_exchange: {
              portfolioId,
              symbol,
              exchange,
            },
          },
          update: {
            quantity,
            averageBuyPrice,
            name,
            sector,
          },
          create: {
            portfolioId,
            symbol,
            exchange,
            name,
            sector,
            assetType,
            quantity,
            averageBuyPrice,
          },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          this.useMemoryFallback = true;
        } else {
          throw err;
        }
      }
    }

    // In-memory fallback upsert
    let existing = Array.from(this.memoryHoldings.values()).find(
      (h) => h.portfolioId === portfolioId && h.symbol === symbol && h.exchange === exchange
    );

    if (existing) {
      existing.quantity = Number(quantity);
      existing.averageBuyPrice = Number(averageBuyPrice);
      if (name) existing.name = name;
      if (sector) existing.sector = sector;
      existing.updatedAt = new Date();
      return existing;
    }

    const id = `holding-${crypto.randomUUID()}`;
    const newHolding = {
      id,
      portfolioId,
      symbol,
      exchange,
      name: name || symbol,
      sector: sector || 'Unclassified',
      assetType,
      quantity: Number(quantity),
      averageBuyPrice: Number(averageBuyPrice),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.memoryHoldings.set(id, newHolding);
    return newHolding;
  }

  async deleteHolding(portfolioId, holdingId) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.portfolioHolding.delete({
          where: { id: holdingId },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          this.useMemoryFallback = true;
        } else {
          throw err;
        }
      }
    }

    this.memoryHoldings.delete(holdingId);
  }

  async recordTransaction(portfolioId, txData) {
    if (!this.useMemoryFallback && !this.memoryPortfolios.has(portfolioId)) {
      try {
        const prisma = getPrismaClient();
        const createData = {
          portfolioId,
          symbol: txData.symbol || null,
          exchange: txData.exchange || 'NSE',
          type: txData.type,
          quantity: txData.quantity || null,
          price: txData.price || null,
          amount: txData.amount,
          fees: txData.fees || 0,
          notes: txData.notes || null,
        };
        if (txData.realizedPnl !== undefined && txData.realizedPnl !== null) {
          createData.realizedPnl = txData.realizedPnl;
        }
        return await prisma.transaction.create({ data: createData });
      } catch (err) {
        if (shouldFallbackToMemory(err) || (err.message && err.message.includes('Unknown argument'))) {
          this.useMemoryFallback = true;
        } else if (this.memoryPortfolios.has(portfolioId)) {
          // fall through to memory
        } else {
          throw err;
        }
      }
    }

    const id = `tx-${crypto.randomUUID()}`;
    const newTx = {
      id,
      portfolioId,
      symbol: txData.symbol || null,
      exchange: txData.exchange || 'NSE',
      type: txData.type,
      quantity: txData.quantity ? Number(txData.quantity) : null,
      price: txData.price ? Number(txData.price) : null,
      amount: Number(txData.amount),
      fees: Number(txData.fees || 0),
      realizedPnl: txData.realizedPnl !== undefined ? txData.realizedPnl : null,
      executedAt: new Date(),
      notes: txData.notes || null,
    };
    this.memoryTransactions.set(id, newTx);
    return newTx;
  }

  /**
   * P1.6: Atomic trade operation.
   * - Postgres: uses prisma.$transaction with optimistic cash lock
   * - Memory: uses per-portfolio async mutex
   */
  async applyTrade(portfolioId, trade) {
    const {
      type,
      symbol,
      exchange,
      name,
      sector,
      quantity,
      execPrice,
      tradeFee,
      notes,
    } = trade;

    if (!this.useMemoryFallback && !this.memoryPortfolios.has(portfolioId)) {
      try {
        const prisma = getPrismaClient();
        return await prisma.$transaction(
          async (tx) => {
          if (type === 'BUY') {
            const { newTotalQty, newAvgPrice, totalTradeCost } = trade;
            // Atomic conditional decrement: only proceeds if cash is sufficient
            const updated = await tx.portfolio.updateMany({
              where: {
                id: portfolioId,
                cashBalance: { gte: totalTradeCost },
              },
              data: { cashBalance: { decrement: totalTradeCost } },
            });

            if (updated.count === 0) {
              const p = await tx.portfolio.findUnique({ where: { id: portfolioId } });
              throw new Error(
                `Insufficient cash balance. Required: ₹${totalTradeCost}, Available: ₹${p?.cashBalance || 0}`
              );
            }

            // Upsert holding
            await tx.portfolioHolding.upsert({
              where: { portfolioId_symbol_exchange: { portfolioId, symbol, exchange } },
              update: { quantity: newTotalQty, averageBuyPrice: newAvgPrice, name, sector },
              create: { portfolioId, symbol, exchange, name, sector, assetType: 'EQUITY', quantity: newTotalQty, averageBuyPrice: newAvgPrice },
            });

            // Record transaction
            return await tx.transaction.create({
              data: {
                portfolioId,
                symbol,
                exchange,
                type: 'BUY',
                quantity,
                price: execPrice,
                amount: totalTradeCost,
                fees: tradeFee,
                realizedPnl: null,
                notes,
              },
            });
          } else if (type === 'SELL') {
            const { remainingQty, netProceeds, realizedPnl, existingHolding } = trade;

            // Verify quantity inside transaction
            const holding = await tx.portfolioHolding.findUnique({
              where: { portfolioId_symbol_exchange: { portfolioId, symbol, exchange } },
            });
            if (!holding || Number(holding.quantity) < quantity) {
              const avail = holding ? Number(holding.quantity) : 0;
              throw new Error(`Cannot SELL ${quantity} shares of ${symbol}. Available: ${avail}`);
            }

            // Credit cash
            await tx.portfolio.update({
              where: { id: portfolioId },
              data: { cashBalance: { increment: netProceeds } },
            });

            // Update or delete holding
            if (remainingQty <= 0) {
              await tx.portfolioHolding.delete({
                where: { portfolioId_symbol_exchange: { portfolioId, symbol, exchange } },
              });
            } else {
              await tx.portfolioHolding.update({
                where: { portfolioId_symbol_exchange: { portfolioId, symbol, exchange } },
                data: { quantity: remainingQty },
              });
            }

            // Record transaction
            return await tx.transaction.create({
              data: {
                portfolioId,
                symbol,
                exchange,
                type: 'SELL',
                quantity,
                price: execPrice,
                amount: netProceeds,
                fees: tradeFee,
                realizedPnl,
                notes,
              },
            });
          }
        }, { maxWait: 20000, timeout: 60000 });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          logger.warn('DB applyTrade failed (connectivity), using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          // Re-throw with better message for insufficient funds
          if (err.message && err.message.includes('Insufficient cash')) {
            const { BadRequestError } = await import('../../utils/errors.js');
            throw new BadRequestError(err.message);
          }
          if (err.message && err.message.includes('Cannot SELL')) {
            const { BadRequestError } = await import('../../utils/errors.js');
            throw new BadRequestError(err.message);
          }
          throw err;
        }
      }
    }

    // In-memory path with per-portfolio mutex for atomicity
    const release = await portfolioMutex.lock(portfolioId);
    try {
      const p = this.memoryPortfolios.get(portfolioId);
      if (!p) throw new Error(`Portfolio ${portfolioId} not found`);

      if (type === 'BUY') {
        const { newTotalQty, newAvgPrice, totalTradeCost } = trade;
        if (p.cashBalance < totalTradeCost) {
          const { BadRequestError } = await import('../../utils/errors.js');
          throw new BadRequestError(
            `Insufficient cash balance. Required: ₹${totalTradeCost}, Available: ₹${p.cashBalance}`
          );
        }
        p.cashBalance = Math.round((p.cashBalance - totalTradeCost) * 100) / 100;
        p.updatedAt = new Date();

        // Upsert holding
        let existH = Array.from(this.memoryHoldings.values()).find(
          (h) => h.portfolioId === portfolioId && h.symbol === symbol && h.exchange === exchange
        );
        if (existH) {
          existH.quantity = newTotalQty;
          existH.averageBuyPrice = newAvgPrice;
          if (name) existH.name = name;
          if (sector) existH.sector = sector;
          existH.updatedAt = new Date();
        } else {
          const hid = `holding-${crypto.randomUUID()}`;
          existH = { id: hid, portfolioId, symbol, exchange, name: name || symbol, sector: sector || 'Unclassified', assetType: 'EQUITY', quantity: newTotalQty, averageBuyPrice: newAvgPrice, createdAt: new Date(), updatedAt: new Date() };
          this.memoryHoldings.set(hid, existH);
        }
      } else if (type === 'SELL') {
        const { remainingQty, netProceeds, realizedPnl, existingHolding } = trade;

        // Verify quantity
        const existH = Array.from(this.memoryHoldings.values()).find(
          (h) => h.portfolioId === portfolioId && h.symbol === symbol && h.exchange === exchange
        );
        if (!existH || Number(existH.quantity) < quantity) {
          const avail = existH ? Number(existH.quantity) : 0;
          const { BadRequestError } = await import('../../utils/errors.js');
          throw new BadRequestError(`Cannot SELL ${quantity} shares of ${symbol}. Available: ${avail}`);
        }

        p.cashBalance = Math.round((p.cashBalance + netProceeds) * 100) / 100;
        p.updatedAt = new Date();

        if (remainingQty <= 0) {
          this.memoryHoldings.delete(existH.id);
        } else {
          existH.quantity = remainingQty;
          existH.updatedAt = new Date();
        }
      }

      // Record transaction
      const txId = `tx-${crypto.randomUUID()}`;
      const newTx = {
        id: txId,
        portfolioId,
        symbol,
        exchange,
        type,
        quantity,
        price: execPrice,
        amount: type === 'BUY' ? trade.totalTradeCost : trade.netProceeds,
        fees: tradeFee,
        realizedPnl: type === 'SELL' ? trade.realizedPnl : null,
        executedAt: new Date(),
        notes,
      };
      this.memoryTransactions.set(txId, newTx);
      return newTx;
    } finally {
      release();
    }
  }
}

export const portfolioRepository = new PortfolioRepository();
