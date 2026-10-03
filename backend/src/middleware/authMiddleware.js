import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { userRepository } from '../infrastructure/database/userRepository.js';

// P2.2: Pin JWT algorithm to HS256
const JWT_ALGORITHMS = ['HS256'];

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
      // P2.2: Always verify with explicit algorithm list
      decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: JWT_ALGORITHMS });
    } catch (jwtErr) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User session is invalid or user not found');
    }

    // P2.2: Check tokenVersion — incremented on logout, invalidating existing tokens
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion || 0)) {
      throw new UnauthorizedError('Session has been revoked. Please log in again.');
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
          const decoded = jwt.verify(token, config.JWT_SECRET, { algorithms: JWT_ALGORITHMS });
          const user = await userRepository.findById(decoded.userId);
          if (user) {
            // P2.2: Check tokenVersion in optional auth too
            if (decoded.tokenVersion === undefined || decoded.tokenVersion === (user.tokenVersion || 0)) {
              req.user = user;
            }
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

/**
 * P1.4: Role-based access control middleware factory.
 * Usage: router.use(requireRole('ADMIN', 'ANALYST'))
 */
export function requireRole(...roles) {
  return async function (req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
