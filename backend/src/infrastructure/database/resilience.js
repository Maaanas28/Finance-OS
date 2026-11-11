/**
 * P1.7: Database resilience helpers
 * Controls when/whether to fall back to in-memory storage.
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// Prisma connectivity error codes
const CONNECTIVITY_CODES = new Set([
  'P1000', // Authentication failed
  'P1001', // Can't reach database server
  'P1002', // The database server was reached but timed out
  'P1003', // Database does not exist / not found
  'P1008', // Operations timed out
  'P1011', // Error opening a TLS connection
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the connection pool
  'P2010', // Raw query failed due to connection termination
]);

const CONNECTIVITY_PATTERNS = [
  /can't reach database/i,
  /cant reach database/i,
  /connection refused/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /terminating connection/i,
  /connection closed/i,
  /connection terminated/i,
  /server closed the connection/i,
  /ssl connection closed/i,
  /timed out fetching a new connection/i,
  /operation timed out/i,
  /pool timeout/i,
  /socket hang up/i,
  /broken pipe/i,
  /endpoint is disabled/i,
  /compute is suspended/i,
  /neon/i,
];

/**
 * Returns true only for genuine database connectivity errors.
 * Domain errors (unique violations, FK constraints, validation) return false.
 */
export function isConnectivityError(err) {
  if (!err) return false;
  // PrismaClientInitializationError = cannot reach DB at startup
  if (err.name === 'PrismaClientInitializationError') return true;
  if (err.name === 'PrismaClientRustPanicError') return true;
  if (err.name === 'PrismaClientUnknownRequestError' && err.message && CONNECTIVITY_PATTERNS.some((p) => p.test(err.message))) return true;
  // Prisma error codes for connection failures
  if (err.code && CONNECTIVITY_CODES.has(err.code)) return true;
  // Connection and network timeout message patterns
  if (err.message && CONNECTIVITY_PATTERNS.some((p) => p.test(err.message))) {
    return true;
  }
  return false;
}

/**
 * Decides whether memory fallback is allowed.
 * Fallback allowed when:
 *  - ALLOW_MEMORY_FALLBACK=true in env, OR NODE_ENV is not 'production'
 *  - The error is a connectivity error (not a domain constraint violation)
 */
export function shouldFallbackToMemory(err) {
  if (config.ALLOW_MEMORY_FALLBACK === 'true') {
    return isConnectivityError(err);
  }
  if (config.NODE_ENV === 'production') return false;
  return isConnectivityError(err);
}

/**
 * Creates a per-resource async mutex for in-memory atomic operations.
 * Returns a function `lock(key)` that returns a promise resolving when it's safe to proceed,
 * and must be released by calling the returned `release()`.
 */
export function createMutex() {
  const queues = new Map();

  function lock(key) {
    const prev = queues.get(key) || Promise.resolve();
    let release;
    const next = new Promise((resolve) => { release = resolve; });
    queues.set(key, prev.then(() => next));
    return prev.then(() => release);
  }

  return { lock };
}

// Singleton mutex for portfolio operations
export const portfolioMutex = createMutex();

/**
 * Circuit breaker state for DB probe
 */
let _lastProbeAt = 0;
let _dbState = 'UNKNOWN'; // 'CONNECTED' | 'DEGRADED_MEMORY' | 'DOWN'

export function getDbState() { return _dbState; }
export function setDbState(state) {
  if (_dbState !== state) {
    logger.warn(`[DB] Database state changed: ${_dbState} → ${state}`);
    _dbState = state;
  }
}

/**
 * Should we probe the DB again? (once every 30s)
 */
export function shouldProbeDb() {
  return Date.now() - _lastProbeAt > 30000;
}

export function markProbeTime() {
  _lastProbeAt = Date.now();
}
