import { describe, it, expect } from 'vitest';
import { RiskMath } from '../src/modules/risk/riskMath.js';

describe('RiskMath Quantitative Statistics Library', () => {
  it('should compute mean, variance, and standard deviation accurately', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const avg = RiskMath.mean(data);
    expect(avg).toBe(5);

    const sVariance = RiskMath.variance(data, true);
    expect(RiskMath.round(sVariance, 4)).toBe(4.5714);

    const sStd = RiskMath.standardDeviation(data, true);
    expect(RiskMath.round(sStd, 4)).toBe(2.1381);
  });

  it('should compute covariance and Pearson correlation coefficient within [-1, 1]', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [2, 4, 6, 8, 10]; // perfectly correlated
    const corrPerfect = RiskMath.correlation(x, y);
    expect(corrPerfect).toBe(1.0);

    const z = [10, 8, 6, 4, 2]; // perfectly negatively correlated
    const corrInverse = RiskMath.correlation(x, z);
    expect(corrInverse).toBe(-1.0);

    const cov = RiskMath.covariance(x, y);
    expect(cov).toBe(5);
  });

  it('should generate symmetric correlation and covariance matrices', () => {
    const s1 = [0.01, 0.02, -0.01, 0.03, 0.00];
    const s2 = [0.02, 0.01, 0.00, 0.02, -0.01];
    const s3 = [-0.01, -0.02, 0.01, -0.01, 0.02];

    const corrMatrix = RiskMath.correlationMatrix([s1, s2, s3]);
    expect(corrMatrix.length).toBe(3);
    expect(corrMatrix[0][0]).toBe(1.0);
    expect(corrMatrix[1][1]).toBe(1.0);
    expect(corrMatrix[2][2]).toBe(1.0);
    expect(corrMatrix[0][1]).toBe(corrMatrix[1][0]);
    expect(corrMatrix[1][2]).toBe(corrMatrix[2][1]);
  });

  it('should extract correct percentiles from sorted returns', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(RiskMath.percentile(sorted, 50)).toBe(5.5);
    expect(RiskMath.percentile(sorted, 0)).toBe(1);
    expect(RiskMath.percentile(sorted, 100)).toBe(10);
  });

  it('should compute maximum drawdown and underwater path', () => {
    const series = [
      { date: '2026-01-01', return: 0.10 }, // Wealth: 1.10, Peak: 1.10, DD: 0%
      { date: '2026-01-02', return: -0.20 }, // Wealth: 0.88, Peak: 1.10, DD: -20%
      { date: '2026-01-03', return: 0.05 }, // Wealth: 0.924, Peak: 1.10, DD: -16%
      { date: '2026-01-04', return: 0.25 }, // Wealth: 1.155, Peak: 1.155, DD: 0%
    ];
    const ddResult = RiskMath.calculateDrawdowns(series);
    expect(ddResult.maxDrawdown).toBe(-20);
    expect(ddResult.peakDate).toBe('2026-01-01');
    expect(ddResult.troughDate).toBe('2026-01-02');
    expect(ddResult.series.length).toBe(4);
  });

  it('should approximate inverse normal CDF with high precision', () => {
    // Standard normal Z-score for 95% one-tailed confidence is ~1.6449
    const z95 = RiskMath.round(RiskMath.inverseNormalCDF(0.95), 4);
    expect(z95).toBe(1.6449);

    // Standard normal Z-score for 99% one-tailed confidence is ~2.3263
    const z99 = RiskMath.round(RiskMath.inverseNormalCDF(0.99), 4);
    expect(z99).toBe(2.3263);

    // Median Z-score is 0
    expect(RiskMath.inverseNormalCDF(0.5)).toBe(0);
  });

  it('should generate reproducible pseudorandom streams with Mulberry32', () => {
    const rand1 = RiskMath.createMulberry32(42);
    const stream1 = [rand1(), rand1(), rand1(), rand1()];

    const rand2 = RiskMath.createMulberry32(42);
    const stream2 = [rand2(), rand2(), rand2(), rand2()];

    expect(stream1).toEqual(stream2);

    const rand3 = RiskMath.createMulberry32(99);
    const stream3 = [rand3(), rand3(), rand3(), rand3()];
    expect(stream1).not.toEqual(stream3);
  });
});
