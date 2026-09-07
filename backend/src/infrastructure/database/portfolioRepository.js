import { getPrismaClient } from './prisma.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

class PortfolioRepository {
  constructor() {
    this.memoryPortfolios = new Map();
    this.memoryHoldings = new Map(); // id -> holding
    this.memoryTransactions = new Map(); // id -> transaction
    this.useMemoryFallback = false;

    this.seedModelPortfolio();
  }

  seedModelPortfolio() {
    const defaultPortfolioId = 'portfolio-model-alpha';
    const defaultUserId = 'user-default-analyst';

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
      { id: 'holding-2', portfolioId: defaultPortfolioId, symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services', sector: 'Technology', assetType: 'EQUITY', quantity: 60, averageBuyPrice: 3500.0 },
      { id: 'holding-3', portfolioId: defaultPortfolioId, symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Ltd', sector: 'Financials', assetType: 'EQUITY', quantity: 80, averageBuyPrice: 755.0 },
      { id: 'holding-4', portfolioId: defaultPortfolioId, symbol: 'INFY', exchange: 'NSE', name: 'Infosys Ltd', sector: 'Technology', assetType: 'EQUITY', quantity: 95, averageBuyPrice: 1720.0 },
      { id: 'holding-5', portfolioId: defaultPortfolioId, symbol: 'TATAMOTORS', exchange: 'NSE', name: 'Tata Motors', sector: 'Automotive', assetType: 'EQUITY', quantity: 110, averageBuyPrice: 820.0 },
    ];

    for (const h of initialHoldings) {
      this.memoryHoldings.set(h.id, {
        ...h,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      });
    }

    const initialTransactions = [
      { id: 'tx-1', portfolioId: defaultPortfolioId, symbol: 'RELIANCE', exchange: 'NSE', type: 'BUY', quantity: 120, price: 2450.0, amount: 294000, fees: 147, executedAt: new Date('2024-01-15T09:30:00Z'), notes: 'Core energy allocation tranche' },
      { id: 'tx-2', portfolioId: defaultPortfolioId, symbol: 'TCS', exchange: 'NSE', type: 'BUY', quantity: 60, price: 3500.0, amount: 210000, fees: 105, executedAt: new Date('2024-02-01T10:15:00Z'), notes: 'Large-cap IT exposure' },
      { id: 'tx-3', portfolioId: defaultPortfolioId, symbol: 'HDFCBANK', exchange: 'NSE', type: 'BUY', quantity: 80, price: 755.0, amount: 60400, fees: 30, executedAt: new Date('2024-02-18T11:00:00Z'), notes: 'Financials pillar (post 1:1 bonus)' },
      { id: 'tx-4', portfolioId: defaultPortfolioId, symbol: 'INFY', exchange: 'NSE', type: 'BUY', quantity: 95, price: 1720.0, amount: 163400, fees: 81, executedAt: new Date('2024-03-05T14:20:00Z'), notes: 'Export tech rebalance' },
      { id: 'tx-5', portfolioId: defaultPortfolioId, symbol: 'TATAMOTORS', exchange: 'NSE', type: 'BUY', quantity: 110, price: 820.0, amount: 90200, fees: 45, executedAt: new Date('2024-04-10T12:00:00Z'), notes: 'Automotive cyclicals' },
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
            transactions: { orderBy: { executedAt: 'desc' }, take: 100 },
          },
          orderBy: { createdAt: 'desc' },
        });
        return found;
      } catch (err) {
        logger.warn('Prisma getPortfoliosByUser error, using resilient fallback:', { error: err.message });
        this.useMemoryFallback = true;
      }
    }

    const userPortfolios = Array.from(this.memoryPortfolios.values())
      .filter((p) => p.userId === userId)
      .map((p) => {
        const holdings = Array.from(this.memoryHoldings.values()).filter((h) => h.portfolioId === p.id);
        const transactions = Array.from(this.memoryTransactions.values())
          .filter((t) => t.portfolioId === p.id)
          .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
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
          include: { holdings: true, transactions: { orderBy: { executedAt: 'desc' }, take: 50 } },
        });
        if (p) return p;
      } catch (err) {
        logger.warn('Prisma getPortfolioById error, using resilient fallback:', { error: err.message });
        this.useMemoryFallback = true;
      }
    }

    const p = this.memoryPortfolios.get(id);
    if (!p) return null;

    const holdings = Array.from(this.memoryHoldings.values()).filter((h) => h.portfolioId === id);
    const transactions = Array.from(this.memoryTransactions.values())
      .filter((t) => t.portfolioId === id)
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

    return { ...p, holdings, transactions };
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
        logger.warn('Prisma createPortfolio error, using resilient fallback:', { error: err.message });
        this.useMemoryFallback = true;
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
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.portfolio.update({
          where: { id: portfolioId },
          data: { cashBalance: sanitizedCash },
        });
      } catch (err) {
        this.useMemoryFallback = true;
      }
    }

    const p = this.memoryPortfolios.get(portfolioId);
    if (p) {
      p.cashBalance = sanitizedCash;
      p.updatedAt = new Date();
    }
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
        this.useMemoryFallback = true;
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
      sector: sector || 'Other',
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
        this.useMemoryFallback = true;
      }
    }

    this.memoryHoldings.delete(holdingId);
  }

  async recordTransaction(portfolioId, txData) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.transaction.create({
          data: {
            portfolioId,
            symbol: txData.symbol || null,
            exchange: txData.exchange || 'NSE',
            type: txData.type,
            quantity: txData.quantity || null,
            price: txData.price || null,
            amount: txData.amount,
            fees: txData.fees || 0,
            notes: txData.notes || null,
          },
        });
      } catch (err) {
        this.useMemoryFallback = true;
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
      executedAt: new Date(),
      notes: txData.notes || null,
    };
    this.memoryTransactions.set(id, newTx);
    return newTx;
  }
}

export const portfolioRepository = new PortfolioRepository();
