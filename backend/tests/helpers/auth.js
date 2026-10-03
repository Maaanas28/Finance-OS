/**
 * Shared test helpers for Finance OS backend tests.
 * P1.5: All authenticated tests use registerAndLogin() to get a real token.
 * P1.5: Tests that relied on 'portfolio-model-alpha' (anonymous/demo) now create their own data.
 */

import request from 'supertest';
import app from '../../src/app.js';

let userCounter = 0;

/**
 * Register a new user and log in, returning token + userId + portfolioId.
 * Creates a unique user per call so parallel tests don't conflict.
 */
export async function registerAndLogin() {
  userCounter++;
  const rand = Math.random().toString(36).substring(2, 8);
  const email = `test_user_${userCounter}_${Date.now()}_${rand}@financeos.test`;
  const password = 'TestPassword123';
  const fullName = `Test User ${userCounter}`;

  const registerRes = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    fullName,
  });

  if (registerRes.status !== 201) {
    throw new Error(`registerAndLogin failed: ${JSON.stringify(registerRes.body)}`);
  }

  const token = registerRes.body.data.token;
  const userId = registerRes.body.data.user.id;

  // Get or create the primary portfolio
  const summaryRes = await request(app)
    .get('/api/v1/portfolio/summary')
    .set('Authorization', `Bearer ${token}`);

  if (summaryRes.status !== 200) {
    throw new Error(`getSummary in registerAndLogin failed (${summaryRes.status}): ${JSON.stringify(summaryRes.body)}`);
  }

  const portfolioId = summaryRes.body.data?.portfolio?.id || summaryRes.body.data?.id || null;

  return { token, userId, email, portfolioId };
}

/**
 * Deposit cash into a portfolio via API.
 */
export async function depositCash(token, portfolioId, amount) {
  const res = await request(app)
    .post('/api/v1/portfolio/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      portfolioId,
      type: 'DEPOSIT',
      amount,
    });

  if (res.status !== 201) {
    throw new Error(`depositCash failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

/**
 * Execute a BUY transaction via API.
 */
export async function buyStock(token, portfolioId, symbol, quantity) {
  const res = await request(app)
    .post('/api/v1/portfolio/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      portfolioId,
      type: 'BUY',
      symbol,
      quantity,
    });

  if (res.status !== 201) {
    throw new Error(`buyStock failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

/**
 * Get the Authorization header string for use with supertest .set()
 */
export function authHeader(token) {
  return `Bearer ${token}`;
}
