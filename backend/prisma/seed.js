import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('  FINANCE OS — DEMO DATABASE SEEDING PROCESS       ');
  console.log('====================================================');
  console.log('Cleaning existing database records in dependency-safe order...');

  // Clean existing records to guarantee idempotency
  await prisma.transaction.deleteMany();
  await prisma.portfolioHolding.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.stressScenario.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.security.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Existing records cleared.');
  console.log('Seeding demo users with bcrypt (10 salt rounds)...');

  const saltRounds = 10;
  const commonPassword = 'Demo@123';
  const commonHash = await bcrypt.hash(commonPassword, saltRounds);

  // 1. CREATE USERS
  const user1 = await prisma.user.create({
    data: {
      email: 'rahul@financeos.demo',
      passwordHash: commonHash,
      fullName: 'Rahul Sharma',
      role: 'ANALYST',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'priya@financeos.demo',
      passwordHash: commonHash,
      fullName: 'Priya Patel',
      role: 'USER',
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'vikram@financeos.demo',
      passwordHash: commonHash,
      fullName: 'Vikram Mehta',
      role: 'ADMIN',
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'ananya@financeos.demo',
      passwordHash: commonHash,
      fullName: 'Ananya Iyer',
      role: 'USER',
    },
  });

  const user5 = await prisma.user.create({
    data: {
      email: 'kabir@financeos.demo',
      passwordHash: commonHash,
      fullName: 'Kabir Roy',
      role: 'ANALYST',
    },
  });

  console.log('✓ 5 Demo users created.');

  // 2. CREATE PORTFOLIOS
  console.log('Seeding portfolios...');

  const portfolio1 = await prisma.portfolio.create({
    data: {
      userId: user1.id,
      name: "Rahul's Institutional Core Equity Fund",
      description: 'Diversified Indian blue-chip growth portfolio focused on large-cap leaders.',
      currency: 'INR',
      cashBalance: 203060.00,
      benchmarkSymbol: 'NIFTY 50',
    },
  });

  const portfolio2 = await prisma.portfolio.create({
    data: {
      userId: user2.id,
      name: 'Priya Tech Growth Strategy',
      description: 'Concentrated technology sector portfolio targeting IT exporters and software firms.',
      currency: 'INR',
      cashBalance: 93420.00,
      benchmarkSymbol: 'NIFTY IT',
    },
  });

  const portfolio3 = await prisma.portfolio.create({
    data: {
      userId: user3.id,
      name: 'Alpha Sovereign LargeCap Desk',
      description: 'High-conviction institutional desk holding multi-sector market leaders.',
      currency: 'INR',
      cashBalance: 159460.00,
      benchmarkSymbol: 'NIFTY 50',
    },
  });

  const portfolio4 = await prisma.portfolio.create({
    data: {
      userId: user4.id,
      name: 'Ananya Conservative Compounder',
      description: 'Defensive wealth preservation portfolio in dividend-paying FMCG & Banking.',
      currency: 'INR',
      cashBalance: 25040.00,
      benchmarkSymbol: 'NIFTY 50',
    },
  });

  const portfolio5 = await prisma.portfolio.create({
    data: {
      userId: user5.id,
      name: 'Kabir Quantitative Tactical Allocation',
      description: 'Tactical momentum strategy rotating between energy, auto, and financial beta.',
      currency: 'INR',
      cashBalance: 392500.00,
      benchmarkSymbol: 'NIFTY 50',
    },
  });

  console.log('✓ 5 Portfolios created.');

  // 3. CREATE SECURITIES
  console.log('Seeding security master universe (18 securities)...');

  const securitiesData = [
    { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', assetType: 'EQUITY', currency: 'INR' },
    { symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', assetType: 'INDEX', currency: 'INR' },
  ];

  const createdSecuritiesMap = {};

  for (const sec of securitiesData) {
    const created = await prisma.security.create({ data: sec });
    createdSecuritiesMap[sec.symbol] = created;
  }

  console.log(`✓ ${Object.keys(createdSecuritiesMap).length} Securities created.`);

  // 4. CREATE PORTFOLIO HOLDINGS
  console.log('Seeding portfolio holdings...');

  const holdingsData = [
    // Portfolio 1 (Rahul - 6 stocks)
    { portfolioId: portfolio1.id, symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries Ltd', sector: 'Energy', assetType: 'EQUITY', quantity: 20, averageBuyPrice: 2750.00 },
    { portfolioId: portfolio1.id, symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services', sector: 'Technology', assetType: 'EQUITY', quantity: 15, averageBuyPrice: 3400.00 },
    { portfolioId: portfolio1.id, symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Ltd', sector: 'Financials', assetType: 'EQUITY', quantity: 50, averageBuyPrice: 1600.00 },
    { portfolioId: portfolio1.id, symbol: 'ICICIBANK', exchange: 'NSE', name: 'ICICI Bank Ltd', sector: 'Financials', assetType: 'EQUITY', quantity: 40, averageBuyPrice: 1150.00 },
    { portfolioId: portfolio1.id, symbol: 'INFY', exchange: 'NSE', name: 'Infosys Ltd', sector: 'Technology', assetType: 'EQUITY', quantity: 25, averageBuyPrice: 1420.00 },
    { portfolioId: portfolio1.id, symbol: 'BHARTIARTL', exchange: 'NSE', name: 'Bharti Airtel Ltd', sector: 'Telecom', assetType: 'EQUITY', quantity: 20, averageBuyPrice: 1550.00 },

    // Portfolio 2 (Priya - 3 tech stocks)
    { portfolioId: portfolio2.id, symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services', sector: 'Technology', assetType: 'EQUITY', quantity: 15, averageBuyPrice: 3450.00 },
    { portfolioId: portfolio2.id, symbol: 'INFY', exchange: 'NSE', name: 'Infosys Ltd', sector: 'Technology', assetType: 'EQUITY', quantity: 45, averageBuyPrice: 1440.00 },
    { portfolioId: portfolio2.id, symbol: 'WIPRO', exchange: 'NSE', name: 'Wipro Ltd', sector: 'Technology', assetType: 'EQUITY', quantity: 80, averageBuyPrice: 510.00 },

    // Portfolio 3 (Vikram - 7 large-cap stocks)
    { portfolioId: portfolio3.id, symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries Ltd', sector: 'Energy', assetType: 'EQUITY', quantity: 60, averageBuyPrice: 2800.00 },
    { portfolioId: portfolio3.id, symbol: 'HDFCBANK', exchange: 'NSE', name: 'HDFC Bank Ltd', sector: 'Financials', assetType: 'EQUITY', quantity: 100, averageBuyPrice: 1620.00 },
    { portfolioId: portfolio3.id, symbol: 'LT', exchange: 'NSE', name: 'Larsen & Toubro Ltd', sector: 'Industrials', assetType: 'EQUITY', quantity: 30, averageBuyPrice: 3600.00 },
    { portfolioId: portfolio3.id, symbol: 'SBIN', exchange: 'NSE', name: 'State Bank of India', sector: 'Financials', assetType: 'EQUITY', quantity: 120, averageBuyPrice: 780.00 },
    { portfolioId: portfolio3.id, symbol: 'ITC', exchange: 'NSE', name: 'ITC Ltd', sector: 'FMCG', assetType: 'EQUITY', quantity: 200, averageBuyPrice: 430.00 },
    { portfolioId: portfolio3.id, symbol: 'MARUTI', exchange: 'NSE', name: 'Maruti Suzuki India Ltd', sector: 'Automotive', assetType: 'EQUITY', quantity: 8, averageBuyPrice: 12100.00 },
    { portfolioId: portfolio3.id, symbol: 'SUNPHARMA', exchange: 'NSE', name: 'Sun Pharma Ltd', sector: 'Healthcare', assetType: 'EQUITY', quantity: 50, averageBuyPrice: 1520.00 },

    // Portfolio 4 (Ananya - 3 conservative stocks)
    { portfolioId: portfolio4.id, symbol: 'HINDUNILVR', exchange: 'NSE', name: 'Hindustan Unilever Ltd', sector: 'FMCG', assetType: 'EQUITY', quantity: 20, averageBuyPrice: 2400.00 },
    { portfolioId: portfolio4.id, symbol: 'ITC', exchange: 'NSE', name: 'ITC Ltd', sector: 'FMCG', assetType: 'EQUITY', quantity: 100, averageBuyPrice: 425.00 },
    { portfolioId: portfolio4.id, symbol: 'KOTAKBANK', exchange: 'NSE', name: 'Kotak Mahindra Bank', sector: 'Financials', assetType: 'EQUITY', quantity: 20, averageBuyPrice: 1720.00 },

    // Portfolio 5 (Kabir - 5 tactical stocks)
    { portfolioId: portfolio5.id, symbol: 'AXISBANK', exchange: 'NSE', name: 'Axis Bank Ltd', sector: 'Financials', assetType: 'EQUITY', quantity: 50, averageBuyPrice: 1080.00 },
    { portfolioId: portfolio5.id, symbol: 'ADANIENT', exchange: 'NSE', name: 'Adani Enterprises Ltd', sector: 'Industrials', assetType: 'EQUITY', quantity: 25, averageBuyPrice: 3100.00 },
    { portfolioId: portfolio5.id, symbol: 'TATAMOTORS', exchange: 'NSE', name: 'Tata Motors Ltd', sector: 'Automotive', assetType: 'EQUITY', quantity: 60, averageBuyPrice: 960.00 },
    { portfolioId: portfolio5.id, symbol: 'RELIANCE', exchange: 'NSE', name: 'Reliance Industries Ltd', sector: 'Energy', assetType: 'EQUITY', quantity: 35, averageBuyPrice: 2820.00 },
    { portfolioId: portfolio5.id, symbol: 'TCS', exchange: 'NSE', name: 'Tata Consultancy Services', sector: 'Technology', assetType: 'EQUITY', quantity: 20, averageBuyPrice: 3480.00 },
  ];

  for (const h of holdingsData) {
    await prisma.portfolioHolding.create({ data: h });
  }

  console.log(`✓ ${holdingsData.length} Portfolio holdings created.`);

  // 5. CREATE TRANSACTIONS
  console.log('Seeding transaction histories...');

  const transactionsData = [
    // Portfolio 1 Transactions (Rahul)
    { portfolioId: portfolio1.id, type: 'DEPOSIT', amount: 500000.00, fees: 0, executedAt: new Date('2026-03-01T10:00:00Z'), notes: 'Initial capital deposit' },
    { portfolioId: portfolio1.id, symbol: 'RELIANCE', exchange: 'NSE', type: 'BUY', quantity: 30, price: 2750.00, amount: 82500.00, fees: 20.00, executedAt: new Date('2026-03-05T11:15:00Z'), notes: 'Acquired 30 RELIANCE shares' },
    { portfolioId: portfolio1.id, symbol: 'TCS', exchange: 'NSE', type: 'BUY', quantity: 15, price: 3400.00, amount: 51000.00, fees: 20.00, executedAt: new Date('2026-03-10T14:20:00Z'), notes: 'Acquired 15 TCS shares' },
    { portfolioId: portfolio1.id, symbol: 'HDFCBANK', exchange: 'NSE', type: 'BUY', quantity: 50, price: 1600.00, amount: 80000.00, fees: 20.00, executedAt: new Date('2026-03-15T09:45:00Z'), notes: 'Acquired 50 HDFCBANK shares' },
    { portfolioId: portfolio1.id, symbol: 'ICICIBANK', exchange: 'NSE', type: 'BUY', quantity: 40, price: 1150.00, amount: 46000.00, fees: 20.00, executedAt: new Date('2026-04-02T10:30:00Z'), notes: 'Acquired 40 ICICIBANK shares' },
    { portfolioId: portfolio1.id, symbol: 'RELIANCE', exchange: 'NSE', type: 'SELL', quantity: 10, price: 2920.00, amount: 29200.00, fees: 20.00, executedAt: new Date('2026-04-15T13:10:00Z'), notes: 'Booked partial profit on 10 RELIANCE shares' },
    { portfolioId: portfolio1.id, symbol: 'INFY', exchange: 'NSE', type: 'BUY', quantity: 25, price: 1420.00, amount: 35500.00, fees: 20.00, executedAt: new Date('2026-05-01T11:00:00Z'), notes: 'Acquired 25 INFY shares' },
    { portfolioId: portfolio1.id, symbol: 'BHARTIARTL', exchange: 'NSE', type: 'BUY', quantity: 20, price: 1550.00, amount: 31000.00, fees: 20.00, executedAt: new Date('2026-05-10T12:00:00Z'), notes: 'Acquired 20 BHARTIARTL shares' },

    // Portfolio 2 Transactions (Priya)
    { portfolioId: portfolio2.id, type: 'DEPOSIT', amount: 250000.00, fees: 0, executedAt: new Date('2026-03-10T09:30:00Z'), notes: 'Initial capital funding' },
    { portfolioId: portfolio2.id, symbol: 'TCS', exchange: 'NSE', type: 'BUY', quantity: 20, price: 3450.00, amount: 69000.00, fees: 20.00, executedAt: new Date('2026-03-12T10:15:00Z'), notes: 'Acquired 20 TCS shares' },
    { portfolioId: portfolio2.id, symbol: 'INFY', exchange: 'NSE', type: 'BUY', quantity: 45, price: 1440.00, amount: 64800.00, fees: 20.00, executedAt: new Date('2026-03-20T11:45:00Z'), notes: 'Acquired 45 INFY shares' },
    { portfolioId: portfolio2.id, symbol: 'WIPRO', exchange: 'NSE', type: 'BUY', quantity: 80, price: 510.00, amount: 40800.00, fees: 20.00, executedAt: new Date('2026-04-05T14:00:00Z'), notes: 'Acquired 80 WIPRO shares' },
    { portfolioId: portfolio2.id, symbol: 'TCS', exchange: 'NSE', type: 'SELL', quantity: 5, price: 3620.00, amount: 18100.00, fees: 20.00, executedAt: new Date('2026-04-18T15:00:00Z'), notes: 'Sold 5 TCS shares' },

    // Portfolio 3 Transactions (Vikram)
    { portfolioId: portfolio3.id, type: 'DEPOSIT', amount: 1000000.00, fees: 0, executedAt: new Date('2026-02-01T09:00:00Z'), notes: 'Institutional capital seed' },
    { portfolioId: portfolio3.id, symbol: 'RELIANCE', exchange: 'NSE', type: 'BUY', quantity: 60, price: 2800.00, amount: 168000.00, fees: 20.00, executedAt: new Date('2026-02-05T10:30:00Z'), notes: 'Acquired 60 RELIANCE shares' },
    { portfolioId: portfolio3.id, symbol: 'HDFCBANK', exchange: 'NSE', type: 'BUY', quantity: 100, price: 1620.00, amount: 162000.00, fees: 20.00, executedAt: new Date('2026-02-10T11:00:00Z'), notes: 'Acquired 100 HDFCBANK shares' },
    { portfolioId: portfolio3.id, symbol: 'LT', exchange: 'NSE', type: 'BUY', quantity: 30, price: 3600.00, amount: 108000.00, fees: 20.00, executedAt: new Date('2026-02-15T12:15:00Z'), notes: 'Acquired 30 LT shares' },
    { portfolioId: portfolio3.id, symbol: 'SBIN', exchange: 'NSE', type: 'BUY', quantity: 120, price: 780.00, amount: 93600.00, fees: 20.00, executedAt: new Date('2026-03-01T13:45:00Z'), notes: 'Acquired 120 SBIN shares' },
    { portfolioId: portfolio3.id, symbol: 'ITC', exchange: 'NSE', type: 'BUY', quantity: 200, price: 430.00, amount: 86000.00, fees: 20.00, executedAt: new Date('2026-03-15T10:20:00Z'), notes: 'Acquired 200 ITC shares' },
    { portfolioId: portfolio3.id, symbol: 'MARUTI', exchange: 'NSE', type: 'BUY', quantity: 8, price: 12100.00, amount: 96800.00, fees: 20.00, executedAt: new Date('2026-04-01T11:30:00Z'), notes: 'Acquired 8 MARUTI shares' },
    { portfolioId: portfolio3.id, symbol: 'SUNPHARMA', exchange: 'NSE', type: 'BUY', quantity: 50, price: 1520.00, amount: 76000.00, fees: 20.00, executedAt: new Date('2026-04-15T14:10:00Z'), notes: 'Acquired 50 SUNPHARMA shares' },
    { portfolioId: portfolio3.id, type: 'WITHDRAWAL', amount: 50000.00, fees: 0, executedAt: new Date('2026-05-02T15:30:00Z'), notes: 'Partial liquidity withdrawal' },

    // Portfolio 4 Transactions (Ananya)
    { portfolioId: portfolio4.id, type: 'DEPOSIT', amount: 150000.00, fees: 0, executedAt: new Date('2026-03-15T09:15:00Z'), notes: 'Initial account funding' },
    { portfolioId: portfolio4.id, symbol: 'HINDUNILVR', exchange: 'NSE', type: 'BUY', quantity: 20, price: 2400.00, amount: 48000.00, fees: 20.00, executedAt: new Date('2026-03-18T11:00:00Z'), notes: 'Acquired 20 HINDUNILVR shares' },
    { portfolioId: portfolio4.id, symbol: 'ITC', exchange: 'NSE', type: 'BUY', quantity: 100, price: 425.00, amount: 42500.00, fees: 20.00, executedAt: new Date('2026-03-25T14:30:00Z'), notes: 'Acquired 100 ITC shares' },
    { portfolioId: portfolio4.id, symbol: 'KOTAKBANK', exchange: 'NSE', type: 'BUY', quantity: 20, price: 1720.00, amount: 34400.00, fees: 20.00, executedAt: new Date('2026-04-10T10:45:00Z'), notes: 'Acquired 20 KOTAKBANK shares' },

    // Portfolio 5 Transactions (Kabir)
    { portfolioId: portfolio5.id, type: 'DEPOSIT', amount: 750000.00, fees: 0, executedAt: new Date('2026-02-15T10:00:00Z'), notes: 'Initial tactical fund allocation' },
    { portfolioId: portfolio5.id, symbol: 'AXISBANK', exchange: 'NSE', type: 'BUY', quantity: 50, price: 1080.00, amount: 54000.00, fees: 20.00, executedAt: new Date('2026-02-20T11:30:00Z'), notes: 'Acquired 50 AXISBANK shares' },
    { portfolioId: portfolio5.id, symbol: 'ADANIENT', exchange: 'NSE', type: 'BUY', quantity: 25, price: 3100.00, amount: 77500.00, fees: 20.00, executedAt: new Date('2026-03-01T14:15:00Z'), notes: 'Acquired 25 ADANIENT shares' },
    { portfolioId: portfolio5.id, symbol: 'TATAMOTORS', exchange: 'NSE', type: 'BUY', quantity: 60, price: 960.00, amount: 57600.00, fees: 20.00, executedAt: new Date('2026-03-10T10:00:00Z'), notes: 'Acquired 60 TATAMOTORS shares' },
    { portfolioId: portfolio5.id, symbol: 'RELIANCE', exchange: 'NSE', type: 'BUY', quantity: 35, price: 2820.00, amount: 98700.00, fees: 20.00, executedAt: new Date('2026-03-20T13:20:00Z'), notes: 'Acquired 35 RELIANCE shares' },
    { portfolioId: portfolio5.id, symbol: 'TCS', exchange: 'NSE', type: 'BUY', quantity: 20, price: 3480.00, amount: 69600.00, fees: 20.00, executedAt: new Date('2026-04-05T15:10:00Z'), notes: 'Acquired 20 TCS shares' },
  ];

  for (const tx of transactionsData) {
    await prisma.transaction.create({ data: tx });
  }

  console.log(`✓ ${transactionsData.length} Transactions created.`);

  // 6. CREATE HISTORICAL MARKET PRICES
  console.log('Seeding historical market prices (10 price points per security)...');

  let priceRecordCount = 0;
  const now = Date.now();
  const daysStep = 3 * 86400000; // Every 3 days

  const basePriceMap = {
    RELIANCE: 2980.50,
    TCS: 4230.00,
    INFY: 1845.30,
    HDFCBANK: 1675.20,
    ICICIBANK: 1210.80,
    SBIN: 825.40,
    ITC: 452.10,
    BHARTIARTL: 1640.10,
    LT: 3750.00,
    MARUTI: 12450.00,
    SUNPHARMA: 1580.60,
    AXISBANK: 1140.20,
    KOTAKBANK: 1790.00,
    HINDUNILVR: 2480.00,
    ADANIENT: 3220.00,
    TATAMOTORS: 978.40,
    WIPRO: 524.10,
    'NIFTY 50': 24852.15,
  };

  const marketPricesBatch = [];

  for (const [symbol, secObj] of Object.entries(createdSecuritiesMap)) {
    const basePx = basePriceMap[symbol] || 1000.00;

    for (let i = 9; i >= 0; i--) {
      const timestamp = new Date(now - i * daysStep);
      const randomDrift = (Math.sin(i + symbol.length) * 0.02) * basePx;
      const close = Number((basePx + randomDrift).toFixed(2));
      const open = Number((close * (1 - 0.004)).toFixed(2));
      const high = Number((Math.max(open, close) * 1.012).toFixed(2));
      const low = Number((Math.min(open, close) * 0.988).toFixed(2));
      const volume = BigInt(Math.floor(1000000 + (Math.abs(Math.sin(i)) * 5000000)));

      marketPricesBatch.push({
        securityId: secObj.id,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        source: 'MOCK',
        dataStatus: 'SIMULATED',
      });
    }
  }

  await prisma.marketPrice.createMany({ data: marketPricesBatch });
  priceRecordCount = marketPricesBatch.length;

  console.log(`✓ ${priceRecordCount} Market price records created.`);

  // 7. CREATE STRESS SCENARIOS
  console.log('Seeding macro & custom stress scenarios...');

  const stressScenariosData = [
    {
      userId: null,
      name: 'RBI Rate Hike (+100 bps)',
      description: 'Simulates a 100 basis point interest rate hike by the RBI affecting debt & rate-sensitive equities.',
      category: 'MACRO',
      isSystem: true,
      shocks: [
        { target: 'SECTOR', identifier: 'Financials', shockPercent: -3.5 },
        { target: 'SECTOR', identifier: 'Real Estate', shockPercent: -4.8 },
      ],
    },
    {
      userId: null,
      name: 'Indian Market Correction (-15%)',
      description: 'Simulates a broad equity benchmark drawdown across all Nifty 50 constituents.',
      category: 'MACRO',
      isSystem: true,
      shocks: [
        { target: 'MARKET', identifier: 'NIFTY 50', shockPercent: -15.0 },
      ],
    },
    {
      userId: null,
      name: 'IT Sector Downturn (-20%)',
      description: 'Simulates tech spending slowdown impacting software exporters and IT services.',
      category: 'SECTOR',
      isSystem: true,
      shocks: [
        { target: 'SECTOR', identifier: 'Technology', shockPercent: -20.0 },
      ],
    },
    {
      userId: null,
      name: 'Banking Sector Stress (-18%)',
      description: 'Simulates credit default risks and margin compression in commercial banks.',
      category: 'SECTOR',
      isSystem: true,
      shocks: [
        { target: 'SECTOR', identifier: 'Financials', shockPercent: -18.0 },
      ],
    },
    {
      userId: null,
      name: 'Global Risk-Off Event (-12%)',
      description: 'Simulates geopolitical conflict driven flight to liquidity & global risk asset selloff.',
      category: 'GEOPOLITICAL',
      isSystem: true,
      shocks: [
        { target: 'MARKET', identifier: 'GLOBAL', shockPercent: -12.0 },
      ],
    },
    {
      userId: user1.id,
      name: 'Tech Rally + Energy Pullback',
      description: 'Custom analyst scenario: +12% rally in IT exporters combined with -8% drop in energy stocks.',
      category: 'CUSTOM',
      isSystem: false,
      shocks: [
        { target: 'SECTOR', identifier: 'Technology', shockPercent: 12.0 },
        { target: 'SECTOR', identifier: 'Energy', shockPercent: -8.0 },
      ],
    },
  ];

  for (const scenario of stressScenariosData) {
    await prisma.stressScenario.create({ data: scenario });
  }

  console.log(`✓ ${stressScenariosData.length} Stress scenarios created.`);

  console.log('\n====================================================');
  console.log('  SEED SUMMARY & DEMO LOGIN CREDENTIALS             ');
  console.log('====================================================');
  console.log(`Users:           5`);
  console.log(`Portfolios:      5`);
  console.log(`Securities:      ${Object.keys(createdSecuritiesMap).length}`);
  console.log(`Holdings:        ${holdingsData.length}`);
  console.log(`Transactions:    ${transactionsData.length}`);
  console.log(`Market Prices:   ${priceRecordCount}`);
  console.log(`Stress Scenarios:${stressScenariosData.length}`);
  console.log('----------------------------------------------------');
  console.log('DEMO ACCOUNTS (Password: Demo@123 for all):');
  console.log('  1. Analyst: rahul@financeos.demo   (Role: ANALYST)');
  console.log('  2. User:    priya@financeos.demo   (Role: USER)');
  console.log('  3. Admin:   vikram@financeos.demo  (Role: ADMIN)');
  console.log('  4. User:    ananya@financeos.demo  (Role: USER)');
  console.log('  5. Analyst: kabir@financeos.demo   (Role: ANALYST)');
  console.log('====================================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seeding process failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
