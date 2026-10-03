/**
 * Institutional Sector Taxonomy & Security Metadata Provider
 * P3.11: Canonical sector classification mapping and security universe lookup
 */
import { SECURITY_UNIVERSE } from './securityUniverse.js';

export const CANONICAL_SECTORS = Object.freeze([
  'Financial Services',
  'Information Technology',
  'Automobile',
  'Consumer Goods',
  'Energy & Utilities',
  'Healthcare & Pharma',
  'Metals & Mining',
  'Industrial Manufacturing',
  'Telecommunications',
  'Real Estate',
  'Unclassified',
]);

const SECTOR_ALIAS_MAP = {
  'FINANCIALS': 'Financial Services',
  'BANKING': 'Financial Services',
  'FINANCIAL SERVICES': 'Financial Services',
  'FINANCE': 'Financial Services',

  'TECHNOLOGY': 'Information Technology',
  'IT': 'Information Technology',
  'INFORMATION TECHNOLOGY': 'Information Technology',
  'TECH': 'Information Technology',
  'SOFTWARE': 'Information Technology',

  'AUTOMOTIVE': 'Automobile',
  'AUTOMOBILE': 'Automobile',
  'AUTO': 'Automobile',

  'CONSUMER GOODS': 'Consumer Goods',
  'FMCG': 'Consumer Goods',
  'RETAIL': 'Consumer Goods',
  'CONSUMER DURABLES': 'Consumer Goods',

  'ENERGY': 'Energy & Utilities',
  'OIL & GAS': 'Energy & Utilities',
  'UTILITIES': 'Energy & Utilities',

  'HEALTHCARE': 'Healthcare & Pharma',
  'PHARMA': 'Healthcare & Pharma',
  'PHARMACEUTICALS': 'Healthcare & Pharma',

  'METALS': 'Metals & Mining',
  'MINING': 'Metals & Mining',

  'INDUSTRIALS': 'Industrial Manufacturing',
  'MANUFACTURING': 'Industrial Manufacturing',

  'TELECOM': 'Telecommunications',
  'TELECOMMUNICATIONS': 'Telecommunications',

  'REAL ESTATE': 'Real Estate',
  'PROPERTY': 'Real Estate',
};

/**
 * Normalizes any raw sector string into the canonical sector taxonomy
 * @param {string} raw 
 * @returns {string} Canonical sector name
 */
export function canonicalSector(raw) {
  if (!raw || typeof raw !== 'string') return 'Unclassified';
  const clean = raw.trim().toUpperCase();
  if (SECTOR_ALIAS_MAP[clean]) {
    return SECTOR_ALIAS_MAP[clean];
  }
  const match = CANONICAL_SECTORS.find((s) => s.toUpperCase() === clean);
  return match || 'Unclassified';
}

/**
 * Looks up security metadata from the internal security universe
 * @param {string} symbol 
 * @returns {object} Security metadata (symbol, name, sector, exchange, assetType)
 */
export function getSecurityMeta(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return { symbol: 'UNKNOWN', name: 'Unknown Asset', sector: 'Unclassified', exchange: 'NSE', assetType: 'EQUITY' };
  }
  const cleanSymbol = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  const found = (SECURITY_UNIVERSE || []).find((s) => s.symbol.toUpperCase() === cleanSymbol);

  if (found) {
    return {
      symbol: found.symbol,
      name: found.name || found.symbol,
      sector: canonicalSector(found.sector),
      exchange: found.exchange || 'NSE',
      assetType: found.assetType || 'EQUITY',
    };
  }

  return {
    symbol: cleanSymbol,
    name: cleanSymbol,
    sector: 'Unclassified',
    exchange: 'NSE',
    assetType: 'EQUITY',
  };
}
