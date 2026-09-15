/**
 * Middleware: request validation helpers.
 */

import type { Request, Response, NextFunction } from 'express';

/** Maximum request body size for event ingestion (100KB) */
const MAX_EVENTS_BODY_SIZE = 100 * 1024;

/** Maximum request body size for LLM chat (50KB) */
const MAX_LLM_BODY_SIZE = 50 * 1024;

/**
 * Validate that the request body is not too large.
 */
export function validateBodySize(maxBytes: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
    if (contentLength > maxBytes) {
      res.status(413).json({ error: 'Request body too large' });
      return;
    }
    next();
  };
}

export const validateEventsBody = validateBodySize(MAX_EVENTS_BODY_SIZE);
export const validateLLMBody = validateBodySize(MAX_LLM_BODY_SIZE);

/**
 * Validate that required fields exist in the body.
 */
export function requireFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((f) => !(f in req.body));
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
      return;
    }
    next();
  };
}
