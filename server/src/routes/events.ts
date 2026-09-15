/**
 * Event ingestion route.
 * POST /api/events — store experiment events
 * POST /api/session — create a session and get auth token
 *
 * Events are deduplicated by eventId.
 * Client sends batches of unconfirmed events.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { StoredEvent } from '../storage/fileStore.js';
import type { EventStore } from '../storage/eventStore.js';
import { eventsRateLimit, sessionRateLimit } from '../middleware/rateLimit.js';
import { requireSessionAuth, generateSessionToken } from '../middleware/auth.js';
import { validateEventsBody } from '../middleware/validate.js';
import type { ServerConfig } from '../config.js';

interface CreateSessionBody {
  participantId: string;
}

export function createEventsRouter(store: EventStore, config: ServerConfig): Router {
  const router = Router();

  /**
   * POST /api/session — create a session token for a participant.
   * No registration — just generates a token from participantId + secret.
   */
  router.post(
    '/session',
    sessionRateLimit,
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body as CreateSessionBody;

      if (!body.participantId || typeof body.participantId !== 'string') {
        res.status(400).json({ error: 'participantId is required' });
        return;
      }

      // Basic validation: alphanumeric, dashes, underscores, 3-50 chars
      if (!/^[a-zA-Z0-9_-]{3,50}$/.test(body.participantId)) {
        res.status(400).json({ error: 'Invalid participantId format (3-50 alphanumeric chars, dashes, underscores)' });
        return;
      }
      if (!config.allowedParticipantCodes.has(body.participantId.toUpperCase())) {
        res.status(403).json({ error: 'Participant code is not enabled for this study' });
        return;
      }

      const token = generateSessionToken(body.participantId, config.sessionSecret);

      res.json({
        participantId: body.participantId,
        token,
      });
    },
  );

  /**
   * POST /api/events — receive a batch of events.
   * Deduplicates by eventId, returns count of new vs duplicate events.
   */
  router.post(
    '/events',
    eventsRateLimit,
    requireSessionAuth(config),
    validateEventsBody,
    async (req: Request, res: Response): Promise<void> => {
      const participantId = (req as Request & { participantId: string }).participantId;
      const events = req.body.events as StoredEvent[] | undefined;

      if (!Array.isArray(events) || events.length === 0) {
        res.status(400).json({ error: 'events must be a non-empty array' });
        return;
      }

      if (events.length > 200) {
        res.status(400).json({ error: 'Too many events in batch (max 200)' });
        return;
      }

      // Validate that all events belong to this participant
      const invalidEvents = events.filter((e) => e.participantId !== participantId);
      if (invalidEvents.length > 0) {
        res.status(403).json({ error: 'Events must belong to the authenticated participant' });
        return;
      }

      // Validate required fields on each event
      for (const event of events) {
        if (!event.eventId || !event.type || !event.timestamp || !event.sessionId) {
          res.status(400).json({ error: 'Each event must have eventId, type, timestamp, and sessionId' });
          return;
        }
      }

      try {
        const result = await store.storeEvents(events);

        res.json({
          stored: result.stored,
          duplicates: result.duplicates,
          total: events.length,
        });
      } catch (err) {
        console.error('Event storage error:', err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'Failed to store events' });
      }
    },
  );

  return router;
}
