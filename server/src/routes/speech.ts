import express, { Router } from 'express';
import type { Request, Response } from 'express';
import type { ServerConfig } from '../config.js';
import type { SpeechKitClient } from '../speech/client.js';
import { requireSessionAuth } from '../middleware/auth.js';
import { llmRateLimit } from '../middleware/rateLimit.js';

export function createSpeechRouter(speech: SpeechKitClient, config: ServerConfig): Router {
  const router = Router();
  router.post('/stt', llmRateLimit, requireSessionAuth(config),
    express.raw({ type: 'application/octet-stream', limit: '1mb' }), async (req: Request, res: Response) => {
      const sampleRate = Number(req.header('x-audio-sample-rate'));
      if (!Buffer.isBuffer(req.body) || req.body.length === 0 || ![8000, 16000, 48000].includes(sampleRate)) {
        res.status(400).json({ error: 'PCM audio and a supported sample rate are required' }); return;
      }
      try { res.json({ transcript: await speech.recognizePcm(req.body, sampleRate) }); }
      catch { res.status(502).json({ error: 'Speech recognition is temporarily unavailable' }); }
    });
  router.post('/tts', llmRateLimit, requireSessionAuth(config), async (req: Request, res: Response) => {
    const text = req.body?.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 5000) {
      res.status(400).json({ error: 'Text must contain 1–5000 characters' }); return;
    }
    try {
      const audio = await speech.synthesize(text);
      res.type('audio/ogg').send(Buffer.from(audio));
    } catch { res.status(502).json({ error: 'Speech synthesis is temporarily unavailable' }); }
  });
  return router;
}
