import { authService } from './auth.service.js';
import { registerSchema, loginSchema } from './auth.validation.js';
import { sendSuccess } from '../../utils/response.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const validated = registerSchema.parse(req.body);
      // P1.4: register always ignores any role in body — service enforces USER
      const result = await authService.register(validated);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      return sendSuccess(res, { user }, 200);
    } catch (err) {
      next(err);
    }
  }

  // P2.2: Real server-side logout — increments tokenVersion, invalidates existing tokens
  async logout(req, res, next) {
    try {
      if (req.user?.id) {
        await authService.logout(req.user.id);
      }
      return sendSuccess(res, { message: 'Logged out successfully' }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
