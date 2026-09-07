/**
 * Base MarketDataProvider Contract
 */

export class MarketDataProvider {
  constructor(name = 'BaseProvider') {
    this.name = name;
  }

  async getQuote(normalizedInfo, options = {}) {
    throw new Error(`getQuote() not implemented on ${this.name}`);
  }

  async getHistoricalPrices(normalizedInfo, options = {}) {
    throw new Error(`getHistoricalPrices() not implemented on ${this.name}`);
  }

  async getTopMovers(options = {}) {
    throw new Error(`getTopMovers() not implemented on ${this.name}`);
  }

  async searchSymbols(query, options = {}) {
    throw new Error(`searchSymbols() not implemented on ${this.name}`);
  }

  async getMarketStatus(options = {}) {
    throw new Error(`getMarketStatus() not implemented on ${this.name}`);
  }

  async healthCheck() {
    return { status: 'UNKNOWN', configured: false };
  }
}
