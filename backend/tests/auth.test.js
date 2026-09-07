import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Auth Module (/api/v1/auth)', () => {
  const testEmail = `quant_${Date.now()}@financeos.internal`;
  const testPassword = 'StrongPassword123';
  let authToken = null;

  it('should reject registration when email is invalid', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: testPassword,
      fullName: 'Quant Analyst',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject registration when password lacks letters or numbers', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      password: 'onlylettersnopass',
      fullName: 'Quant Analyst',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully register a new user and return user object without passwordHash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      password: testPassword,
      fullName: 'Alexander Hamilton',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.data.user.fullName).toBe('Alexander Hamilton');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.token).toBeDefined();
    authToken = res.body.data.token;
  });

  it('should prevent duplicate registration with the same email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: testEmail,
      password: testPassword,
      fullName: 'Alexander Hamilton Duplicate',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should authenticate user with valid credentials via login', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
  });

  it('should reject login with an invalid password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: 'WrongPassword999',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject access to /api/v1/auth/me without a Bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow access to /api/v1/auth/me with a valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
  });
});
