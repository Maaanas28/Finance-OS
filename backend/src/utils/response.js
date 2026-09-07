/**
 * Consistent institutional API response envelopes
 */

export function sendSuccess(res, data = null, statusCode = 200, meta = null) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function sendError(res, message = 'An error occurred', statusCode = 500, code = 'ERROR', details = null) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    timestamp: new Date().toISOString(),
  });
}
