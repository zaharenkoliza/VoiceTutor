/**
 * Middleware: simple session-based auth for research sessions.
 * No DB, no user accounts — just token validation.
 *
 * - Participants use a session token generated from participantId + sessionSecret
 * - Researcher endpoints use RESEARCHER_SECRET directly
 */

import type { Request, Response, NextFunction } from 'express';
import { createHmac } from 'node:crypto';
import type { ServerConfig } from '../config.js';

/**
 * Generate a session token for a participant.
 * Used by the client to authenticate subsequent requests.
 */
export function generateSessionToken(participantId: string, secret: string): string {
  return createHmac('sha256', secret).update(participantId).digest('hex').substring(0, 32);
}

/**
 * Middleware: validate participant session token from Authorization header.
 * Expects: Authorization: Bearer <participantId>:<token>
 */
export function requireSessionAuth(config: ServerConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization required' });
      return;
    }

    const tokenPart = auth.slice(7);
    const colonIdx = tokenPart.indexOf(':');
    if (colonIdx < 1) {
      res.status(401).json({ error: 'Invalid authorization format' });
      return;
    }

    const participantId = tokenPart.substring(0, colonIdx);
    const token = tokenPart.substring(colonIdx + 1);
    const expected = generateSessionToken(participantId, config.sessionSecret);

    if (token !== expected) {
      res.status(403).json({ error: 'Invalid session token' });
      return;
    }

    // Attach participantId to request for downstream use
    (req as Request & { participantId: string }).participantId = participantId;
    next();
  };
}

/**
 * Middleware: validate researcher secret for admin endpoints.
 * Expects: Authorization: Bearer researcher:<secret>
 */
export function requireResearcherAuth(config: ServerConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer researcher:')) {
      res.status(401).json({ error: 'Researcher authorization required' });
      return;
    }

    const secret = auth.slice('Bearer researcher:'.length);
    if (secret !== config.researcherSecret) {
      res.status(403).json({ error: 'Invalid researcher secret' });
      return;
    }

    next();
  };
}
