/**
 * Quantitative Strategy Engine & Backtester for Finance OS
 * Mathematical indicator calculations, vectorized signal generation, and zero look-ahead bias execution simulation.
 */

export class StrategyEngine {
  /**
   * Simple Moving Average (SMA)
   */
  static calculateSMA(prices, period) {
    const sma = new Array(prices.length).fill(null);
    if (prices.length < period) return sma;

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    sma[period - 1] = sum / period;

    for (let i = period; i < prices.length; i++) {
      sum += prices[i] - prices[i - period];
      sma[i] = sum / period;
    }
    return sma;
  }

  /**
   * Exponential Moving Average (EMA)
   */
  static calculateEMA(prices, period) {
    const ema = new Array(prices.length).fill(null);
    if (prices.length < period) return ema;

    const multiplier = 2 / (period + 1);

    // Initial SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema[period - 1] = sum / period;

    for (let i = period; i < prices.length; i++) {
      ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
  }

  /**
   * Relative Strength Index (RSI) - Wilder's Smoothing
   */
  static calculateRSI(prices, period = 14) {
    const rsi = new Array(prices.length).fill(null);
    if (prices.length <= period) return rsi;

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gainSum += diff;
      else lossSum += Math.abs(diff);
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + firstRS));

    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }

    return rsi;
  }

  /**
   * Moving Average Convergence Divergence (MACD)
   */
  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEma = this.calculateEMA(prices, fastPeriod);
    const slowEma = this.calculateEMA(prices, slowPeriod);

    const macdLine = new Array(prices.length).fill(null);
    const validMacdPrices = [];
    const validMacdIndices = [];

    for (let i = 0; i < prices.length; i++) {
      if (fastEma[i] !== null && slowEma[i] !== null) {
        macdLine[i] = fastEma[i] - slowEma[i];
        validMacdPrices.push(macdLine[i]);
        validMacdIndices.push(i);
      }
    }

    const signalEma = this.calculateEMA(validMacdPrices, signalPeriod);
    const signalLine = new Array(prices.length).fill(null);
    const histogram = new Array(prices.length).fill(null);

    for (let k = 0; k < validMacdIndices.length; k++) {
      const idx = validMacdIndices[k];
      if (signalEma[k] !== null) {
        signalLine[idx] = signalEma[k];
        histogram[idx] = macdLine[idx] - signalLine[idx];
      }
    }

    return { macdLine, signalLine, histogram };
  }

  /**
   * Backtest Execution Engine with Zero Look-Ahead Bias
   * Signal at candle [i] close -> Execution at candle [i+1] open/price
   */
  static runBacktest({
    strategyId,
    candles = [],
    initialCapital = 100000,
    slippagePercent = 0.1, // 0.1% per trade
    commissionPercent = 0.05, // 0.05% per trade
    params = {},
  }) {
    if (!candles || candles.length < 20) {
      throw new Error('Insufficient historical candle data for backtesting (minimum 20 candles required)');
    }

    // Sort candles chronologically ascending (oldest first)
    const sortedCandles = [...candles].sort((a, b) => new Date(a.date) - new Date(b.date));
    const closes = sortedCandles.map((c) => Number(c.close));
    const opens = sortedCandles.map((c) => Number(c.open || c.close));
    const dates = sortedCandles.map((c) => c.date);

    const signals = new Array(sortedCandles.length).fill(0); // 1 = BUY, -1 = SELL, 0 = HOLD

    // 1. Calculate Signals based on Strategy Strategy Type
    if (strategyId === 'mean_reversion' || strategyId === 'rsi_strategy') {
      const period = Number(params.rsiPeriod || 14);
      const oversold = Number(params.oversoldThreshold || 30);
      const overbought = Number(params.overboughtThreshold || 70);

      const rsi = this.calculateRSI(closes, period);

      for (let i = period + 1; i < sortedCandles.length; i++) {
        if (rsi[i] !== null) {
          if (rsi[i] < oversold && rsi[i - 1] >= oversold) {
            signals[i] = 1; // BUY signal
          } else if (rsi[i] > overbought && rsi[i - 1] <= overbought) {
            signals[i] = -1; // SELL signal
          }
        }
      }
    } else if (strategyId === 'momentum_ema' || strategyId === 'ema_crossover') {
      const fastPeriod = Number(params.fastEma || 20);
      const slowPeriod = Number(params.slowEma || 50);

      const fastEma = this.calculateEMA(closes, fastPeriod);
      const slowEma = this.calculateEMA(closes, slowPeriod);

      for (let i = slowPeriod; i < sortedCandles.length; i++) {
        if (fastEma[i] !== null && slowEma[i] !== null && fastEma[i - 1] !== null && slowEma[i - 1] !== null) {
          // Golden cross: Fast EMA crosses above Slow EMA
          if (fastEma[i] > slowEma[i] && fastEma[i - 1] <= slowEma[i - 1]) {
            signals[i] = 1;
          }
          // Death cross: Fast EMA crosses below Slow EMA
          else if (fastEma[i] < slowEma[i] && fastEma[i - 1] >= slowEma[i - 1]) {
            signals[i] = -1;
          }
        }
      }
    } else if (strategyId === 'macd_momentum') {
      const fastP = Number(params.fastPeriod || 12);
      const slowP = Number(params.slowPeriod || 26);
      const signalP = Number(params.signalPeriod || 9);

      const { macdLine, signalLine } = this.calculateMACD(closes, fastP, slowP, signalP);

      for (let i = slowP + signalP; i < sortedCandles.length; i++) {
        if (macdLine[i] !== null && signalLine[i] !== null && macdLine[i - 1] !== null && signalLine[i - 1] !== null) {
          if (macdLine[i] > signalLine[i] && macdLine[i - 1] <= signalLine[i - 1]) {
            signals[i] = 1;
          } else if (macdLine[i] < signalLine[i] && macdLine[i - 1] >= signalLine[i - 1]) {
            signals[i] = -1;
          }
        }
      }
    } else {
      // Default: Dual SMA Crossover (SMA 10 / SMA 30)
      const fastSma = this.calculateSMA(closes, 10);
      const slowSma = this.calculateSMA(closes, 30);

      for (let i = 30; i < sortedCandles.length; i++) {
        if (fastSma[i] !== null && slowSma[i] !== null && fastSma[i - 1] !== null && slowSma[i - 1] !== null) {
          if (fastSma[i] > slowSma[i] && fastSma[i - 1] <= slowSma[i - 1]) {
            signals[i] = 1;
          } else if (fastSma[i] < slowSma[i] && fastSma[i - 1] >= slowSma[i - 1]) {
            signals[i] = -1;
          }
        }
      }
    }

    // 2. Simulation Execution Loop (Zero Look-Ahead Bias)
    // Signal on candle [i] -> Order executed on candle [i+1] at Open price
    let cash = initialCapital;
    let positionQuantity = 0;
    let buyPrice = 0;
    const executedTrades = [];
    const equityCurve = [];
    let peakEquity = initialCapital;
    let maxDrawdownValue = 0;

    const slippageMultiplierBuy = 1 + (slippagePercent / 100);
    const slippageMultiplierSell = 1 - (slippagePercent / 100);
    const commissionCostRate = commissionPercent / 100;

    for (let i = 0; i < sortedCandles.length; i++) {
      const currentDate = dates[i];
      const currentClose = closes[i];
      const currentOpen = opens[i];

      // Execute pending signal from previous candle i-1
      if (i > 0) {
        const pendingSignal = signals[i - 1];

        if (pendingSignal === 1 && positionQuantity === 0) {
          // BUY ENTRY at current candle Open price + slippage
          const execPrice = currentOpen * slippageMultiplierBuy;
          const availableCashForEquity = cash * (1 - commissionCostRate);
          const qtyToBuy = Math.floor(availableCashForEquity / execPrice);

          if (qtyToBuy > 0) {
            const grossCost = qtyToBuy * execPrice;
            const commission = grossCost * commissionCostRate;
            const totalCost = grossCost + commission;

            cash -= totalCost;
            positionQuantity = qtyToBuy;
            buyPrice = execPrice;

            executedTrades.push({
              tradeId: `TRD-${executedTrades.length + 1}`,
              date: currentDate,
              type: 'BUY_ENTRY',
              price: Number(execPrice.toFixed(2)),
              quantity: qtyToBuy,
              cost: Number(totalCost.toFixed(2)),
              pnl: 0,
              pnlPercent: 0,
            });
          }
        } else if (pendingSignal === -1 && positionQuantity > 0) {
          // SELL EXIT at current candle Open price - slippage
          const execPrice = currentOpen * slippageMultiplierSell;
          const grossProceeds = positionQuantity * execPrice;
          const commission = grossProceeds * commissionCostRate;
          const netProceeds = grossProceeds - commission;

          const tradeCostBasis = positionQuantity * buyPrice;
          const tradePnl = netProceeds - tradeCostBasis;
          const tradePnlPercent = (tradePnl / tradeCostBasis) * 100;

          cash += netProceeds;

          executedTrades.push({
            tradeId: `TRD-${executedTrades.length + 1}`,
            date: currentDate,
            type: 'SELL_EXIT',
            price: Number(execPrice.toFixed(2)),
            quantity: positionQuantity,
            cost: Number(netProceeds.toFixed(2)),
            pnl: Number(tradePnl.toFixed(2)),
            pnlPercent: Number(tradePnlPercent.toFixed(2)),
          });

          positionQuantity = 0;
          buyPrice = 0;
        }
      }

      // Calculate Current Daily Portfolio Equity
      const currentEquity = cash + (positionQuantity * currentClose);
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const currentDrawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
      if (currentDrawdown > maxDrawdownValue) {
        maxDrawdownValue = currentDrawdown;
      }

      // Benchmark Equity (Buy & Hold from Day 0)
      const benchmarkQty = Math.floor(initialCapital / opens[0]);
      const benchmarkEquity = (initialCapital - (benchmarkQty * opens[0])) + (benchmarkQty * currentClose);

      equityCurve.push({
        date: currentDate,
        equity: Number(currentEquity.toFixed(2)),
        benchmarkEquity: Number(benchmarkEquity.toFixed(2)),
        drawdown: Number(currentDrawdown.toFixed(2)),
      });
    }

    // 3. Compute Final Performance Metrics
    const finalCapital = equityCurve[equityCurve.length - 1].equity;
    const totalReturnPercent = ((finalCapital - initialCapital) / initialCapital) * 100;

    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const diffDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
    const years = diffDays / 365.25;

    const cagrPercent = (Math.pow(Math.max(0.001, finalCapital / initialCapital), 1 / Math.max(0.1, years)) - 1) * 100;

    // Closed trade analysis
    const closedTrades = executedTrades.filter((t) => t.type === 'SELL_EXIT');
    const totalTradesCount = closedTrades.length;
    const winningTrades = closedTrades.filter((t) => t.pnl > 0);
    const losingTrades = closedTrades.filter((t) => t.pnl <= 0);

    const winRate = totalTradesCount > 0 ? (winningTrades.length / totalTradesCount) * 100 : 0;

    const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    // Daily Returns & Sharpe Ratio
    const dailyReturns = [];
    const benchmarkReturns = [];

    for (let j = 1; j < equityCurve.length; j++) {
      const rStrat = (equityCurve[j].equity - equityCurve[j - 1].equity) / equityCurve[j - 1].equity;
      const rBench = (equityCurve[j].benchmarkEquity - equityCurve[j - 1].benchmarkEquity) / equityCurve[j - 1].benchmarkEquity;
      dailyReturns.push(rStrat);
      benchmarkReturns.push(rBench);
    }

    const meanDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
    const meanBenchReturn = benchmarkReturns.length > 0 ? benchmarkReturns.reduce((a, b) => a + b, 0) / benchmarkReturns.length : 0;

    const dailyVariance = dailyReturns.length > 0
      ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanDailyReturn, 2), 0) / dailyReturns.length
      : 0;
    const dailyStdDev = Math.sqrt(dailyVariance);

    const dailyRiskFree = 0.065 / 252; // 6.5% annual risk-free rate
    const sharpeRatio = dailyStdDev > 0 ? ((meanDailyReturn - dailyRiskFree) / dailyStdDev) * Math.sqrt(252) : 0;

    // Alpha & Beta
    let covar = 0;
    let benchVar = 0;
    for (let k = 0; k < dailyReturns.length; k++) {
      covar += (dailyReturns[k] - meanDailyReturn) * (benchmarkReturns[k] - meanBenchReturn);
      benchVar += Math.pow(benchmarkReturns[k] - meanBenchReturn, 2);
    }
    const beta = benchVar > 0 ? covar / benchVar : 1.0;
    const annualizedStratReturn = meanDailyReturn * 252;
    const annualizedBenchReturn = meanBenchReturn * 252;
    const alpha = (annualizedStratReturn - (0.065 + beta * (annualizedBenchReturn - 0.065))) * 100;

    return {
      summary: {
        initialCapital: Number(initialCapital.toFixed(2)),
        finalCapital: Number(finalCapital.toFixed(2)),
        totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
        cagrPercent: Number(cagrPercent.toFixed(2)),
        maxDrawdownPercent: Number(maxDrawdownValue.toFixed(2)),
        sharpeRatio: Number(sharpeRatio.toFixed(2)),
        winRatePercent: Number(winRate.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
        totalTrades: totalTradesCount,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        alphaPercent: Number(alpha.toFixed(2)),
        beta: Number(beta.toFixed(2)),
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        totalCandles: candles.length,
      },
      trades: executedTrades,
      equityCurve,
      executionRules: {
        lookAheadBias: 'NONE (Signal at Close T -> Execution at Open T+1)',
        slippagePercent,
        commissionPercent,
        riskFreeRate: '6.5%',
      },
    };
  }
}
