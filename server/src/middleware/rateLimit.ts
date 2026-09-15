/**
 * Middleware: rate limiting.
 */

import rateLimit from 'express-rate-limit';

/** Rate limit for LLM proxy: 30 requests per minute per IP */
export const llmRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Лимит запросов к AI исчерпан. Подождите минуту.' },
});

/** Rate limit for event ingestion: 100 requests per minute per IP */
export const eventsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

/** Rate limit for session creation: 10 per minute per IP */
export const sessionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many session creation requests' },
});
