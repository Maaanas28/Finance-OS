import { getPrismaClient } from './prisma.js';
import { logger } from '../../utils/logger.js';
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
        logger.warn('Prisma findByEmail error, switching to resilient fallback:', { error: err.message });
        this.useMemoryFallback = true;
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
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (err) {
        logger.warn('Prisma findById error, switching to resilient fallback:', { error: err.message });
        this.useMemoryFallback = true;
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
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (err) {
        logger.warn('Prisma create user error, switching to resilient fallback:', { error: err.message });
        this.useMemoryFallback = true;
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
      createdAt: now,
      updatedAt: now,
    };
    this.memoryUsers.set(id, newUser);

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}

export const userRepository = new UserRepository();
