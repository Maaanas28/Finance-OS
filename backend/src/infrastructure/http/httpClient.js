import { logger } from '../../utils/logger.js';

export class HttpError extends Error {
  constructor(message, statusCode, body = null, url = '') {
    // Sanitize any API key from URL before storing in error
    const sanitizedUrl = url.replace(/([?&](?:apikey|api_key|token)=)[^&]+/gi, '$1[REDACTED]');
    super(`${message} (HTTP ${statusCode} on ${sanitizedUrl})`);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.body = body;
    this.sanitizedUrl = sanitizedUrl;
    this.isRateLimit = statusCode === 429;
  }
}

export async function secureFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const sanitizedUrl = url.replace(/([?&](?:apikey|api_key|token)=)[^&]+/gi, '$1[REDACTED]');

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text().catch(() => null);
      }
    } else {
      data = await response.text().catch(() => null);
    }

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn(`Rate limit triggered on external provider: [${sanitizedUrl}]`);
      } else {
        logger.warn(`External HTTP status [${response.status}] from [${sanitizedUrl}]`);
      }

      throw new HttpError(
        response.status === 429 ? 'Rate limit exceeded' : 'External request failed',
        response.status,
        data,
        url
      );
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      logger.warn(`External request timed out after ${timeoutMs}ms on [${sanitizedUrl}]`);
      throw new HttpError('Request timeout', 408, null, url);
    }
    if (err instanceof HttpError) {
      throw err;
    }
    throw new HttpError(err.message || 'Network request failed', 500, null, url);
  }
}
