import { describe, it, expect } from 'vitest';
import { SymbolNormalizer } from '../src/infrastructure/market/symbolNormalizer.js';

describe('SymbolNormalizer', () => {
  it('should correctly normalize Indian equities to Yahoo Finance', () => {
    const r1 = SymbolNormalizer.normalize('RELIANCE');
    expect(r1.symbol).toBe('RELIANCE');
    expect(r1.exchange).toBe('NSE');
    expect(r1.assetType).toBe('EQUITY');
    expect(r1.currency).toBe('INR');
    expect(r1.targetProvider).toBe('yahoo');

    const r2 = SymbolNormalizer.normalize('TCS:NSE');
    expect(r2.symbol).toBe('TCS');
    expect(r2.exchange).toBe('NSE');

    const r3 = SymbolNormalizer.normalize('INFY.NS');
    expect(r3.symbol).toBe('INFY');
    expect(r3.exchange).toBe('NSE');
  });

  it('should normalize Indian indices', () => {
    const n1 = SymbolNormalizer.normalize('NIFTY');
    expect(n1.symbol).toBe('NIFTY 50');
    expect(n1.assetType).toBe('INDEX');
    expect(n1.targetProvider).toBe('yahoo');

    const s1 = SymbolNormalizer.normalize('SENSEX');
    expect(s1.symbol).toBe('SENSEX');
    expect(s1.exchange).toBe('NSE');
  });

  it('should normalize US equities to Yahoo Finance', () => {
    const a1 = SymbolNormalizer.normalize('AAPL');
    expect(a1.symbol).toBe('AAPL');
    expect(a1.assetType).toBe('EQUITY');
    expect(a1.currency).toBe('USD');
    expect(a1.targetProvider).toBe('yahoo');

    const m1 = SymbolNormalizer.normalize('MSFT');
    expect(m1.symbol).toBe('MSFT');
    expect(m1.targetProvider).toBe('yahoo');
  });

  it('should normalize Forex pairs', () => {
    const fx1 = SymbolNormalizer.normalize('USD/INR');
    expect(fx1.symbol).toBe('USD/INR');
    expect(fx1.assetType).toBe('FOREX');
    expect(fx1.currency).toBe('INR');
    expect(fx1.targetProvider).toBe('yahoo');

    const fx2 = SymbolNormalizer.normalize('USDINR');
    expect(fx2.symbol).toBe('USD/INR');
    expect(fx2.assetType).toBe('FOREX');
  });

  it('should normalize Crypto pairs', () => {
    const c1 = SymbolNormalizer.normalize('BTC/USD');
    expect(c1.symbol).toBe('BTC/USD');
    expect(c1.assetType).toBe('CRYPTO');
    expect(c1.targetProvider).toBe('yahoo');

    const c2 = SymbolNormalizer.normalize('BTCUSD');
    expect(c2.symbol).toBe('BTC/USD');
  });
});
