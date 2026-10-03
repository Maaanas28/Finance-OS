/**
 * P1.7: Database resilience helpers
 * Controls when/whether to fall back to in-memory storage.
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

// Prisma connectivity error codes
const CONNECTIVITY_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017']);

/**
 * Returns true only for genuine database connectivity errors.
 * Domain errors (unique violations, FK constraints, validation) return false.
 */
export function isConnectivityError(err) {
  if (!err) return false;
  // PrismaClientInitializationError = cannot reach DB at startup
  if (err.name === 'PrismaClientInitializationError') return true;
  // Prisma error codes for connection failures
  if (err.code && CONNECTIVITY_CODES.has(err.code)) return true;
  // "Can't reach database server" message pattern
  if (err.message && /can't reach database|connection refused|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(err.message)) {
    return true;
  }
  return false;
}

/**
 * Decides whether memory fallback is allowed.
 * Fallback allowed ONLY when:
 *  - NODE_ENV is not 'production'
 *  - ALLOW_MEMORY_FALLBACK=true in env
 *  - The error is a connectivity error (not a domain error)
 */
export function shouldFallbackToMemory(err) {
  if (config.NODE_ENV === 'production') return false;
  if (config.ALLOW_MEMORY_FALLBACK !== 'true') return false;
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
