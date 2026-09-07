import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { userRepository } from '../../infrastructure/database/userRepository.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

import { portfolioRepository } from '../../infrastructure/database/portfolioRepository.js';

export class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
  }

  async register({ email, password, fullName, role = 'USER' }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await userRepository.create({
      email,
      passwordHash,
      fullName,
      role,
    });

    // Create primary empty portfolio for the new user
    try {
      await portfolioRepository.createPortfolio({
        userId: user.id,
        name: `${fullName}'s Primary Portfolio`,
        description: 'Personal virtual investment portfolio',
        currency: 'INR',
        benchmarkSymbol: 'NIFTY 50',
        initialCash: 0,
      });
    } catch (err) {
      logger.warn(`Failed to create default portfolio for [${user.email}]: ${err.message}`);
    }

    logger.info(`User successfully registered with clean portfolio: [${user.email}]`);
    const token = this.generateToken(user);

    return { user, token };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      logger.warn(`Failed login attempt for non-existent user: [${email}]`);
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt (bad password) for user: [${email}]`);
      throw new UnauthorizedError('Invalid email or password');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    logger.info(`User successfully authenticated: [${safeUser.email}]`);
    const token = this.generateToken(safeUser);

    return { user: safeUser, token };
  }

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }
    return user;
  }
}

export const authService = new AuthService();
