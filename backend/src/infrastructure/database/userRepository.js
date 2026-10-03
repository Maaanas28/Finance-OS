import { getPrismaClient } from './prisma.js';
import { logger } from '../../utils/logger.js';
import { shouldFallbackToMemory } from './resilience.js';
import crypto from 'crypto';

class UserRepository {
  constructor() {
    this.memoryUsers = new Map(); // In-memory fallback if PostgreSQL is not active locally
    this.useMemoryFallback = false;
  }

  async findByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          logger.warn('DB findByEmail failed (connectivity), using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          // P1.7: domain errors (e.g. invalid query) propagate
          throw err;
        }
      }
    }

    for (const user of this.memoryUsers.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  async findById(id) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.user.findUnique({
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
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          logger.warn('DB findById failed (connectivity), using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          throw err;
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
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.user.create({
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
      } catch (err) {
        if (shouldFallbackToMemory(err) || (err.message && err.message.includes('Unknown argument'))) {
          logger.warn('DB create user failed, using in-memory fallback:', { error: err.message });
          this.useMemoryFallback = true;
        } else {
          // P1.7: domain errors (like P2002 unique email violation) propagate
          throw err;
        }
      }
    }

    // In-memory: check for unique email
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

  // P2.2: Increment tokenVersion for real server-side logout
  async incrementTokenVersion(userId) {
    if (!this.useMemoryFallback) {
      try {
        const prisma = getPrismaClient();
        return await prisma.user.update({
          where: { id: userId },
          data: { tokenVersion: { increment: 1 } },
        });
      } catch (err) {
        if (shouldFallbackToMemory(err)) {
          this.useMemoryFallback = true;
        } else {
          throw err;
        }
      }
    }

    const user = this.memoryUsers.get(userId);
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      user.updatedAt = new Date();
    }
  }
}

export const userRepository = new UserRepository();
