/**
 * Vitest Global Test Setup File
 * P7.1: Blocks any unmocked outbound HTTP calls during offline test runs
 */
import { beforeAll, afterAll, vi } from 'vitest';

process.env.NODE_ENV = 'test';

const originalFetch = global.fetch;

beforeAll(() => {
  if (global.fetch) {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : url?.toString() || '';
      // Allow local supertest requests
      if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
        return originalFetch(url);
      }
      // Return 404 immediately for unmocked external endpoints so providers fail fast without retries
      return new Response(JSON.stringify({ error: 'Unmocked network call blocked in test mode' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});
