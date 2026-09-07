import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import { userRepository } from '../infrastructure/database/userRepository.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (jwtErr) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User session is invalid or user not found');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, config.JWT_SECRET);
          const user = await userRepository.findById(decoded.userId);
          if (user) {
            req.user = user;
          }
        } catch {
          // Ignore invalid token in optional auth
        }
      }
    }
    next();
  } catch {
    next();
  }
}
