/**
 * Pure Mathematical & Quantitative Statistics Library for Finance OS Risk Engine
 * Zero dependencies, pure numerical algorithms, deterministic precision.
 */

export const RiskMath = {
  /**
   * Round to decimal places safely
   */
  round(num, decimals = 4) {
    if (isNaN(num) || num === null || num === undefined) return 0;
    const factor = 10 ** decimals;
    return Math.round((Number(num) + Number.EPSILON) * factor) / factor;
  },

  /**
   * Arithmetic Mean
   */
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return sum / arr.length;
  },

  /**
   * Variance
   */
  variance(arr, isSample = true) {
    if (!arr || arr.length < 2) return 0;
    const avg = this.mean(arr);
    const sumSq = arr.reduce((acc, val) => acc + ((Number(val) || 0) - avg) ** 2, 0);
    const denom = isSample ? arr.length - 1 : arr.length;
    return sumSq / denom;
  },

  /**
   * Standard Deviation
   */
  standardDeviation(arr, isSample = true) {
    return Math.sqrt(this.variance(arr, isSample));
  },

  /**
   * Covariance between two equal-length series
   */
  covariance(arrX, arrY) {
    if (!arrX || !arrY || arrX.length !== arrY.length || arrX.length < 2) return 0;
    const meanX = this.mean(arrX);
    const meanY = this.mean(arrY);
    let sum = 0;
    for (let i = 0; i < arrX.length; i++) {
      sum += (arrX[i] - meanX) * (arrY[i] - meanY);
    }
    return sum / (arrX.length - 1);
  },

  /**
   * Pearson Correlation Coefficient (-1.0 to +1.0)
   */
  correlation(arrX, arrY) {
    const cov = this.covariance(arrX, arrY);
    const stdX = this.standardDeviation(arrX);
    const stdY = this.standardDeviation(arrY);
    if (stdX === 0 || stdY === 0) return 0;
    const corr = cov / (stdX * stdY);
    return this.round(Math.max(-1.0, Math.min(1.0, corr)), 6);
  },

  /**
   * Compute N x N Covariance Matrix
   * @param {Array<Array<number>>} seriesArray - Array of return arrays for each asset
   */
  covarianceMatrix(seriesArray) {
    const n = seriesArray.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const cov = this.covariance(seriesArray[i], seriesArray[j]);
        matrix[i][j] = cov;
        matrix[j][i] = cov; // Symmetric
      }
    }
    return matrix;
  },

  /**
   * Compute N x N Correlation Matrix
   */
  correlationMatrix(seriesArray) {
    const n = seriesArray.length;
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          const corr = this.round(this.correlation(seriesArray[i], seriesArray[j]), 4);
          matrix[i][j] = corr;
          matrix[j][i] = corr;
        }
      }
    }
    return matrix;
  },

  /**
   * Percentile extraction from a sorted array (linear interpolation)
   * @param {Array<number>} sortedArr - Must be sorted in ascending order
   * @param {number} p - Percentile between 0 and 100
   */
  percentile(sortedArr, p) {
    if (!sortedArr || sortedArr.length === 0) return 0;
    if (sortedArr.length === 1) return sortedArr[0];
    const clampedP = Math.max(0, Math.min(100, p));
    const rank = (clampedP / 100) * (sortedArr.length - 1);
    const lowerIndex = Math.floor(rank);
    const upperIndex = Math.ceil(rank);
    const weight = rank - lowerIndex;
    if (upperIndex >= sortedArr.length) return sortedArr[sortedArr.length - 1];
    return sortedArr[lowerIndex] * (1 - weight) + sortedArr[upperIndex] * weight;
  },

  /**
   * Cumulative Wealth & Drawdown Analysis
   * @param {Array<{ date: string, return: number }>} returnSeries - Chronological daily returns
   */
  calculateDrawdowns(returnSeries) {
    if (!returnSeries || returnSeries.length === 0) {
      return { maxDrawdown: 0, peakDate: null, troughDate: null, series: [] };
    }

    let peak = 1.0;
    let peakDate = returnSeries[0]?.date || null;
    let currentWealth = 1.0;
    let maxDrawdown = 0;
    let maxDdPeakDate = peakDate;
    let maxDdTroughDate = peakDate;

    const series = [];

    for (const pt of returnSeries) {
      currentWealth *= 1 + (Number(pt.return) || 0);
      if (currentWealth > peak) {
        peak = currentWealth;
        peakDate = pt.date;
      }
      const dd = (currentWealth - peak) / peak; // negative or zero
      if (dd < maxDrawdown) {
        maxDrawdown = dd;
        maxDdPeakDate = peakDate;
        maxDdTroughDate = pt.date;
      }
      series.push({
        date: pt.date,
        wealth: this.round(currentWealth, 4),
        drawdown: this.round(dd * 100, 2), // in percent
        peak: this.round(peak, 4),
      });
    }

    return {
      maxDrawdown: this.round(maxDrawdown * 100, 2), // percentage e.g. -14.25
      maxDrawdownDecimal: this.round(maxDrawdown, 4),
      peakDate: maxDdPeakDate,
      troughDate: maxDdTroughDate,
      series,
    };
  },

  /**
   * Rational Approximation of Inverse Normal Cumulative Distribution Function (Probit function)
   * Abramowitz & Stegun approximation (error < 4.5e-4)
   * Converts probability p (0 < p < 1) to standard Z-score
   */
  inverseNormalCDF(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    // Coefficients
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q, r;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    }
  },

  /**
   * Box-Muller Gaussian Transform: generates Z ~ N(0, 1)
   * @param {Function} randFn - RNG function returning uniform [0, 1)
   */
  boxMuller(randFn = Math.random) {
    let u1 = randFn();
    let u2 = randFn();
    while (u1 <= 1e-15) u1 = randFn(); // Avoid log(0)
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  },

  /**
   * Mulberry32: Deterministic 32-bit pseudo-random number generator
   * Used for reproducible testing and Monte Carlo validation
   */
  createMulberry32(seed = 1337) {
    let s = Math.floor(Number(seed) || 1337) >>> 0;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
};
