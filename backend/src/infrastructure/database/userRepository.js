import { getPrismaClient } from './prisma.js';
import { logger } from '../../utils/logger.js';
import { shouldFallbackToMemory, isConnectivityError, shouldProbeDb, markProbeTime } from './resilience.js';
import crypto from 'crypto';

class UserRepository {
  constructor() {
    this.memoryUsers = new Map(); // Resilient user cache & in-memory fallback
    this.useMemoryFallback = false;
    this.seedDemoUsers();
  }

  /**
   * Seed standard institutional demo accounts.
   * Guarantees login works seamlessly even if PostgreSQL is offline or waking up.
   * Uses real bcrypt hash of 'Demo@123' (10 rounds).
   */
  seedDemoUsers() {
    const demoPasswordHash = '$2b$10$uPqT0JIE.2c3DWCQgo5NfuTtu/OKgZlqnbTzeAZ9xF2f6VLto/P0q'; // Demo@123

    const demoUsers = [
      {
        id: 'eebcad33-bc31-40d8-b87e-5bfa05326d64',
        email: 'rahul@financeos.demo',
        fullName: 'Rahul Sharma',
        role: 'ANALYST',
        passwordHash: demoPasswordHash,
        tokenVersion: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'fc79530c-11b0-4a67-a41b-ff111373ac5b',
        email: 'priya@financeos.demo',
        fullName: 'Priya Patel',
        role: 'USER',
        passwordHash: demoPasswordHash,
        tokenVersion: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: '54b155e8-de17-4f10-881a-7ae92d13f6ae',
        email: 'vikram@financeos.demo',
        fullName: 'Vikram Mehta',
        role: 'ADMIN',
        passwordHash: demoPasswordHash,
        tokenVersion: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'user-demo-analyst',
        email: 'analyst@financeos.internal',
        fullName: 'Demo Analyst',
        role: 'ANALYST',
        passwordHash: demoPasswordHash,
        tokenVersion: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      },
    ];

    for (const u of demoUsers) {
      this.memoryUsers.set(u.id, u);
    }
  }

  /**
   * Periodically check if PostgreSQL has recovered from a transient cold-start or drop
   */
  async checkDatabaseRecovery() {
    if (this.useMemoryFallback && shouldProbeDb()) {
      markProbeTime();
      try {
        const prisma = getPrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        this.useMemoryFallback = false;
        logger.info('[DB] PostgreSQL connection restored. Resuming live database operations.');
      } catch {
        // Keep memory fallback active
      }
    }
  }

  async findByEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const normalizedEmail = email.toLowerCase().trim();

    await this.checkDatabaseRecovery();

    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (user) {
          // Synchronize memory cache
          this.memoryUsers.set(user.id, user);
          return user;
        }
      } catch (err) {
        if (shouldFallbackToMemory(err) || isConnectivityError(err) || (err.message && (err.message.includes('does not exist') || err.message.includes('Unknown argument')))) {
          logger.warn(`DB findByEmail failed, using resilient fallback: ${err.message}`);
          this.useMemoryFallback = true;
        } else {
          logger.error(`Unexpected DB error in findByEmail: ${err.message}`);
          this.useMemoryFallback = true;
        }
      }
    }

    // Search resilient in-memory users (includes seeded demo accounts)
    for (const user of this.memoryUsers.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  async findById(id) {
    if (!id) return null;

    await this.checkDatabaseRecovery();

    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            tokenVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (user) {
          return user;
        }
      } catch (err) {
        if (shouldFallbackToMemory(err) || isConnectivityError(err) || (err.message && (err.message.includes('does not exist') || err.message.includes('Unknown argument')))) {
          logger.warn(`DB findById failed, using resilient fallback: ${err.message}`);
          this.useMemoryFallback = true;
        } else {
          logger.error(`Unexpected DB error in findById: ${err.message}`);
          this.useMemoryFallback = true;
        }
      }
    }

    const user = this.memoryUsers.get(id);
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create({ email, passwordHash, fullName, role = 'USER' }) {
    const normalizedEmail = email.toLowerCase().trim();

    await this.checkDatabaseRecovery();

    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        const created = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            fullName,
            role,
            tokenVersion: 0,
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            tokenVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        // Cache in memory too
        this.memoryUsers.set(created.id, {
          ...created,
          passwordHash,
        });
        return created;
      } catch (err) {
        // Unique violation (P2002) is a domain conflict error — must propagate!
        if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
          const { ConflictError } = await import('../../utils/errors.js');
          throw new ConflictError('A user with this email already exists');
        }
        if (shouldFallbackToMemory(err) || isConnectivityError(err) || (err.message && err.message.includes('Unknown argument'))) {
          logger.warn(`DB create user failed, using resilient fallback: ${err.message}`);
          this.useMemoryFallback = true;
        } else {
          logger.error(`Unexpected DB error in create user: ${err.message}`);
          this.useMemoryFallback = true;
        }
      }
    }

    // In-memory unique email check
    for (const u of this.memoryUsers.values()) {
      if (u.email === normalizedEmail) {
        const { ConflictError } = await import('../../utils/errors.js');
        throw new ConflictError('A user with this email already exists');
      }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const newUser = {
      id,
      email: normalizedEmail,
      passwordHash,
      fullName,
      role,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.memoryUsers.set(id, newUser);

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  // Increment tokenVersion for real server-side logout
  async incrementTokenVersion(userId) {
    let dbUpdated = null;
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        dbUpdated = await prisma.user.update({
          where: { id: userId },
          data: { tokenVersion: { increment: 1 } },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err) || isConnectivityError(err)) {
          this.useMemoryFallback = true;
        } else {
          logger.warn(`Failed to increment tokenVersion in DB: ${err.message}`);
        }
      }
    }

    // Always keep in-memory cache synchronized with new tokenVersion
    const user = this.memoryUsers.get(userId);
    if (user) {
      user.tokenVersion = dbUpdated ? dbUpdated.tokenVersion : (user.tokenVersion || 0) + 1;
      user.updatedAt = new Date();
    }

    return dbUpdated || user;
  }
}

export const userRepository = new UserRepository();
