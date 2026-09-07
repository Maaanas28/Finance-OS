import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export function errorHandler(err, req, res, next) {
  logger.error(`API Error on [${req.method} ${req.originalUrl}]:`, {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
  });

  // Handle Custom Domain/App Errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation Error', 400, 'VALIDATION_ERROR', formattedErrors);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid or expired authentication token', 401, 'UNAUTHORIZED');
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Malformed JSON payload', 400, 'BAD_REQUEST');
  }

  // Default Internal Server Error
  const isProd = process.env.NODE_ENV === 'production';
  return sendError(
    res,
    isProd ? 'Internal Server Error' : err.message,
    500,
    'INTERNAL_ERROR',
    isProd ? null : { stack: err.stack }
  );
}
