import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { userRepository } from '../../infrastructure/database/userRepository.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

import { portfolioRepository } from '../../infrastructure/database/portfolioRepository.js';

// P2.2: bcrypt rounds = 12
const BCRYPT_ROUNDS = 12;

// P2.2: Dummy hash used for constant-time comparison when user not found
// Prevents timing attacks that reveal whether an email exists
const DUMMY_HASH = '$2a$12$dummy.hash.for.constant.time.comparison.only.xxxxxxxxxxx';

export class AuthService {
  // P2.2: Pin algorithm to HS256
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        // P2.2: tokenVersion embedded in token
        tokenVersion: user.tokenVersion || 0,
      },
      config.JWT_SECRET,
      {
        expiresIn: config.JWT_EXPIRES_IN,
        algorithm: 'HS256',
      }
    );
  }

  // P1.4: register always creates USER role; ignores any role in input
  async register({ email, password, fullName }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await userRepository.create({
      email,
      passwordHash,
      fullName,
      role: 'USER', // P1.4: Always USER, never trust client
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

    // P2.2: Always run bcrypt compare to prevent timing attacks
    // If user not found, compare against dummy hash to consume same time
    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValidPassword) {
      logger.warn(`Failed login attempt for: [${email}]`);
      throw new UnauthorizedError('Invalid email or password');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
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

  // P2.2: Real server-side logout by incrementing tokenVersion
  async logout(userId) {
    await userRepository.incrementTokenVersion(userId);
    logger.info(`User [${userId}] logged out; token version incremented`);
  }
}

export const authService = new AuthService();
