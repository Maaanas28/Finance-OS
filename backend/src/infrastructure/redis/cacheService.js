import { logger } from '../../utils/logger.js';

export class CacheService {
  async get(key) {
    throw new Error('Method get() must be implemented');
  }
  async set(key, value, ttlSeconds) {
    throw new Error('Method set() must be implemented');
  }
  async del(key) {
    throw new Error('Method del() must be implemented');
  }
  async clear() {
    throw new Error('Method clear() must be implemented');
  }
  isReady() {
    throw new Error('Method isReady() must be implemented');
  }
}

class InMemoryCacheService extends CacheService {
  constructor() {
    super();
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    if (!this.store.has(key)) return null;

    const expiry = this.ttls.get(key);
    if (expiry && Date.now() > expiry) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }

    return this.store.get(key);
  }

  async set(key, value, ttlSeconds = 300) {
    this.store.set(key, value);
    if (ttlSeconds > 0) {
      this.ttls.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return true;
  }

  async clear() {
    this.store.clear();
    this.ttls.clear();
    return true;
  }

  isReady() {
    return true;
  }
}

/**
 * Cache factory - returns an in-memory cache ready for Redis replacement
 */
export function createCacheService() {
  logger.info('Initializing Cache Service (In-Memory driver active, Redis interface ready)');
  return new InMemoryCacheService();
}

export const cacheService = createCacheService();
