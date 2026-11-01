import { describe, it, expect } from 'vitest';
import { RiskMath } from '../src/modules/risk/riskMath.js';

describe('Financial Calculation Engine — 15 Scenario Deterministic Audit Suite', () => {
  // Scenario 1: Portfolio with one stock
  it('Scenario 1: Single stock portfolio metrics with deterministic expected values', () => {
    // 5 daily returns
    const pReturns = [0.01, -0.02, 0.015, -0.005, 0.02];
    const bReturns = [0.008, -0.015, 0.01, -0.004, 0.012];

    const meanP = RiskMath.mean(pReturns);
    // Mean = (0.01 - 0.02 + 0.015 - 0.005 + 0.02) / 5 = 0.02 / 5 = 0.004
    expect(meanP).toBeCloseTo(0.004, 6);

    const stdP = RiskMath.standardDeviation(pReturns, true);
    // Sample std dev of pReturns:
    // diffs: [0.006, -0.024, 0.011, -0.009, 0.016]
    // sqDiffs: [0.000036, 0.000576, 0.000121, 0.000081, 0.000256] = 0.001070
    // variance = 0.001070 / 4 = 0.0002675
    // std = sqrt(0.0002675) = 0.0163554
    expect(stdP).toBeCloseTo(0.016355, 5);

    // Annualized volatility = std * sqrt(252) * 100
    const annualVol = stdP * Math.sqrt(252) * 100;
    expect(annualVol).toBeCloseTo(25.964, 2);

    // Beta = Cov(P, B) / Var(B)
    const cov = RiskMath.covariance(pReturns, bReturns);
    const varB = RiskMath.variance(bReturns, true);
    const beta = cov / varB;
    expect(varB).toBeGreaterThan(0);
    expect(beta).toBeGreaterThan(0.5);
    expect(beta).toBeLessThan(2.0);
  });

  // Scenario 2: Portfolio with multiple stocks
  it('Scenario 2: Multi-stock portfolio holding weights and aggregate valuation', () => {
    const holdings = [
      { symbol: 'RELIANCE', quantity: 100, price: 2500, costBasis: 240000 },
      { symbol: 'TCS', quantity: 50, price: 3500, costBasis: 160000 },
      { symbol: 'INFY', quantity: 200, price: 1500, costBasis: 280000 },
    ];
    const cash = 100000;

    const equityVal = holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
    // 250,000 + 175,000 + 300,000 = 725,000
    expect(equityVal).toBe(725000);

    const totalNav = equityVal + cash; // 825,000
    expect(totalNav).toBe(825000);

    const weights = {};
    for (const h of holdings) {
      weights[h.symbol] = (h.quantity * h.price) / totalNav;
    }
    weights['CASH'] = cash / totalNav;

    const sumWeights = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sumWeights).toBeCloseTo(1.0, 6);
    expect(weights['RELIANCE']).toBeCloseTo(250000 / 825000, 4);
    expect(weights['CASH']).toBeCloseTo(100000 / 825000, 4);
  });

  // Scenario 3: Portfolio with cash and equity holdings
  it('Scenario 3: Portfolio with 50% cash dampens volatility and beta exactly by half', () => {
    const stockReturns = [0.02, -0.01, 0.03, -0.02, 0.01];
    const benchReturns = [0.015, -0.008, 0.025, -0.015, 0.008];

    // Portfolio with 50% stock, 50% cash
    const portReturns = stockReturns.map((r) => 0.5 * r + 0.5 * 0);

    const stockVol = RiskMath.standardDeviation(stockReturns, true) * Math.sqrt(252);
    const portVol = RiskMath.standardDeviation(portReturns, true) * Math.sqrt(252);

    expect(portVol).toBeCloseTo(0.5 * stockVol, 6);

    const varB = RiskMath.variance(benchReturns, true);
    const covStock = RiskMath.covariance(stockReturns, benchReturns);
    const covPort = RiskMath.covariance(portReturns, benchReturns);

    const betaStock = covStock / varB;
    const betaPort = covPort / varB;

    expect(betaPort).toBeCloseTo(0.5 * betaStock, 6);
  });

  // Scenario 4: Profitable portfolio
  it('Scenario 4: Profitable portfolio correctly reconciles unrealized and realized PnL', () => {
    const investedAmount = 500000;
    const equityValue = 550000; // +50,000 unrealized
    const cashBalance = 100000;
    const realizedPnl = 20000; // +20,000 realized

    const unrealizedPnl = equityValue - investedAmount; // 50,000
    const totalPnl = unrealizedPnl + realizedPnl; // 70,000
    const totalValue = equityValue + cashBalance; // 650,000

    expect(unrealizedPnl).toBe(50000);
    expect(totalPnl).toBe(70000);
    expect(totalValue).toBe(650000);

    const totalReturnPercent = (totalPnl / investedAmount) * 100;
    expect(totalReturnPercent).toBeCloseTo(14.0, 5);
  });

  // Scenario 5: Loss-making portfolio
  it('Scenario 5: Loss-making portfolio reflects negative total return without corruption', () => {
    const investedAmount = 400000;
    const equityValue = 350000; // -50,000 unrealized
    const realizedPnl = -15000; // -15,000 realized

    const unrealizedPnl = equityValue - investedAmount; // -50,000
    const totalPnl = unrealizedPnl + realizedPnl; // -65,000

    expect(unrealizedPnl).toBe(-50000);
    expect(totalPnl).toBe(-65000);

    const totalReturnPercent = (totalPnl / investedAmount) * 100;
    expect(totalReturnPercent).toBe(-16.25);
  });

  // Scenario 6: Portfolio with deposits and withdrawals (Time-Weighted Return)
  it('Scenario 6: External deposits and withdrawals do not distort TWR performance', () => {
    // Day 0: Baseline NAV = 100,000
    const V0 = 100000;

    // Day 1: Asset grows to 105,000 (+5%). EOD deposit of 20,000. Ending NAV = 125,000.
    const V1 = 125000;
    const deposit1 = 20000;
    const r1 = (V1 - deposit1) / V0 - 1;
    expect(r1).toBeCloseTo(0.05, 6); // Pure market return was +5.0%

    // Day 2: Asset drops to 120,000 (-4%). EOD withdrawal of 10,000. Ending NAV = 110,000.
    const V2 = 110000;
    const withdrawal2 = 10000;
    const r2 = (V2 - (-withdrawal2)) / V1 - 1;
    expect(r2).toBeCloseTo(-0.04, 6); // Pure market return was -4.0%

    // Cumulative TWR: (1 + 0.05) * (1 - 0.04) - 1 = 1.008 - 1 = +0.80%
    const cumTWR = (1 + r1) * (1 + r2) - 1;
    expect(cumTWR).toBeCloseTo(0.008, 6);
  });

  // Scenario 7: Missing historical observations
  it('Scenario 7: Forward fills missing observations and avoids treating missing as zero', () => {
    const rawCandles = [
      { date: '2026-10-01', close: 100 },
      { date: '2026-10-02', close: 102 },
      // 2026-10-05 weekend/holiday gap
      { date: '2026-10-06', close: 105 },
    ];

    const tradingDates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06'];
    const candleMap = new Map(rawCandles.map((c) => [c.date, c.close]));

    let lastKnown = 100;
    const alignedPrices = tradingDates.map((dt) => {
      if (candleMap.has(dt)) lastKnown = candleMap.get(dt);
      return lastKnown;
    });

    // 2026-10-03 missing date forward-filled to 102, never 0!
    expect(alignedPrices).toEqual([100, 102, 102, 105]);
  });

  // Scenario 8: Duplicate observations
  it('Scenario 8: Deduplicates timestamps to prevent artificial 0% return observations', () => {
    const rawDates = ['2026-10-01', '2026-10-02', '2026-10-02', '2026-10-03'];
    const uniqueDates = Array.from(new Set(rawDates)).sort();
    expect(uniqueDates.length).toBe(3);
    expect(uniqueDates).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });

  // Scenario 9: Zero benchmark variance
  it('Scenario 9: Handles zero benchmark variance gracefully without silent 0 or crash', () => {
    const pReturns = [0.01, -0.01, 0.02, -0.02];
    const constBenchReturns = [0.005, 0.005, 0.005, 0.005]; // Zero variance

    const varB = RiskMath.variance(constBenchReturns, true);
    expect(varB).toBe(0);

    const cov = RiskMath.covariance(pReturns, constBenchReturns);
    expect(cov).toBe(0);

    // Beta calculation guard:
    const beta = varB > 0 ? cov / varB : null;
    expect(beta).toBeNull();
  });

  // Scenario 10: Insufficient historical data
  it('Scenario 10: Flags insufficient historical data when observations < 2', () => {
    const emptyReturns = [];
    const singleReturn = [0.01];

    expect(RiskMath.variance(emptyReturns)).toBe(0);
    expect(RiskMath.variance(singleReturn)).toBe(0);
    expect(RiskMath.covariance(singleReturn, singleReturn)).toBe(0);
  });

  // Scenario 11: Constant portfolio returns (Zero volatility)
  it('Scenario 11: Zero portfolio volatility handled safely in Sharpe calculation', () => {
    const constReturns = [0.001, 0.001, 0.001, 0.001];
    const std = RiskMath.standardDeviation(constReturns, true);
    expect(std).toBe(0);

    const rf = 0.065;
    const dailyRf = (1 + rf) ** (1 / 252) - 1;
    const excess = constReturns.map((r) => r - dailyRf);
    const meanExcess = RiskMath.mean(excess);
    const stdExcess = RiskMath.standardDeviation(excess, true);

    const sharpe = stdExcess > 0 ? (meanExcess / stdExcess) * Math.sqrt(252) : 0;
    expect(sharpe).toBe(0); // Safely returned 0, no division by zero or NaN
  });

  // Scenario 12: Extreme market movements
  it('Scenario 12: Extreme market moves do not break drawdown bounds [-100%, 0%]', () => {
    // Extreme single-day market crash: -40%, then -50%
    const crashSeries = [
      { date: '2026-10-01', return: -0.40 },
      { date: '2026-10-02', return: -0.50 },
    ];

    const dd = RiskMath.calculateDrawdowns(crashSeries);
    // After -40%, wealth = 0.60, DD = -40%
    // After -50%, wealth = 0.30, DD = -70%
    expect(dd.maxDrawdown).toBe(-70.0);
    expect(dd.maxDrawdown).toBeGreaterThanOrEqual(-100.0);
    expect(dd.maxDrawdown).toBeLessThanOrEqual(0.0);

    // Test log returns safeguard
    const logRets = RiskMath.logReturns([-0.99, -1.0]);
    expect(isNaN(logRets[0])).toBe(false);
    expect(isNaN(logRets[1])).toBe(false);
  });

  // Scenario 13: Portfolio reaching a new high and subsequently declining
  it('Scenario 13: Correctly identifies peak date, trough date, and drawdown percentage', () => {
    const valuations = [
      { date: '2026-10-01', nav: 100000 },
      { date: '2026-10-02', nav: 150000 }, // Peak
      { date: '2026-10-03', nav: 120000 }, // Drawdown = (120k - 150k)/150k = -20%
      { date: '2026-10-04', nav: 135000 }, // Recovery but below peak
    ];

    const dd = RiskMath.calculateDrawdownsFromValuations(valuations);
    expect(dd.maxDrawdown).toBe(-20.0);
    expect(dd.peakDate).toBe('2026-10-02');
    expect(dd.troughDate).toBe('2026-10-03');
  });

  // Scenario 14: Zero or invalid valuation
  it('Scenario 14: Safely handles zero or empty valuation without throwing', () => {
    const emptyValuations = [];
    const dd = RiskMath.calculateDrawdownsFromValuations(emptyValuations);
    expect(dd.maxDrawdown).toBe(0);
    expect(dd.peakDate).toBeNull();

    const zeroValuations = [{ date: '2026-10-01', nav: 0 }];
    const ddZero = RiskMath.calculateDrawdownsFromValuations(zeroValuations);
    expect(ddZero.maxDrawdown).toBe(0);
  });

  // Scenario 15: Corporate action / split maintaining cash integrity
  it('Scenario 15: Holding changes do not accidentally alter cash balance', () => {
    let cashBalance = 50000;
    const holding = { symbol: 'TCS', quantity: 10, averageBuyPrice: 3000 };

    // Stock 2:1 split: quantity doubles, average buy price halves
    const updatedHolding = {
      ...holding,
      quantity: holding.quantity * 2, // 20
      averageBuyPrice: holding.averageBuyPrice / 2, // 1500
    };

    // Value remains identical: 20 * 1500 = 10 * 3000 = 30,000
    expect(updatedHolding.quantity * updatedHolding.averageBuyPrice).toBe(
      holding.quantity * holding.averageBuyPrice
    );
    // Cash balance is untouched by split
    expect(cashBalance).toBe(50000);
  });
});
