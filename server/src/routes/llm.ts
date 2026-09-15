/**
 * LLM proxy route.
 * POST /api/llm/chat
 *
 * Proxies chat requests to the configured LLM provider.
 * API key stays on the server — never sent to the client.
 * Logs request metadata (no secrets, no full content).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { LLMAdapter } from '../llm/adapter.js';
import { llmRateLimit } from '../middleware/rateLimit.js';
import { requireSessionAuth } from '../middleware/auth.js';
import { validateLLMBody, requireFields } from '../middleware/validate.js';
import type { ServerConfig } from '../config.js';
import { SYSTEM_PROMPT } from '../llm/prompt.js';

interface ChatRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  requestId: string;
  expectedConfig: { provider: string; model: string; maxTokens: number; temperature: number;
    experimentVersion: string; promptVersion: string };
}

export function createLLMRouter(llm: LLMAdapter, config: ServerConfig): Router {
  const router = Router();

  router.post(
    '/chat',
    llmRateLimit,
    requireSessionAuth(config),
    validateLLMBody,
    requireFields(['messages', 'requestId', 'expectedConfig']),
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body as ChatRequestBody;

      // Validate messages array
      if (!Array.isArray(body.messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
      }
      if (typeof body.requestId !== 'string' || body.requestId.length > 100 ||
          body.messages.some((message) =>
            !message || !['user', 'assistant'].includes(message.role) ||
            typeof message.content !== 'string' || message.content.length > 20_000)) {
        res.status(400).json({ error: 'Invalid chat request' });
        return;
      }

      if (body.messages.length > 50) {
        res.status(400).json({ error: 'Too many messages in history (max 50)' });
        return;
      }
      const currentConfig = llm.getConfig();
      if (!body.expectedConfig || body.expectedConfig.provider !== currentConfig.provider ||
          body.expectedConfig.model !== currentConfig.model ||
          body.expectedConfig.maxTokens !== currentConfig.maxTokens ||
          body.expectedConfig.temperature !== currentConfig.temperature ||
          body.expectedConfig.experimentVersion !== currentConfig.experimentVersion ||
          body.expectedConfig.promptVersion !== currentConfig.promptVersion) {
        res.status(409).json({ error: 'Session LLM configuration no longer matches the server; end this session.' });
        return;
      }

      const startTime = Date.now();

      try {
        const result = await llm.chat({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...body.messages,
          ],
        });

        const latencyMs = Date.now() - startTime;

        // Log metadata only — no content, no secrets
        console.log(`LLM request ${body.requestId}: ${latencyMs}ms, model=${result.model}, tokens=${result.usage?.totalTokens ?? 'unknown'}`);

        res.json({
          content: result.content,
          model: result.model,
          latencyMs,
          usage: result.usage,
          requestId: body.requestId,
          retryCount: result.retryCount,
        });
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        const message = err instanceof Error ? err.message : 'Unknown LLM error';
        console.error(`LLM error ${body.requestId}: ${latencyMs}ms`);

        const status = message.includes('rate limit') ? 429
          : message.includes('timed out') ? 504
          : 502;

        res.status(status).json({
          error: message.includes('not configured') ? message : 'LLM provider request failed',
          requestId: body.requestId,
        });
      }
    },
  );

  // GET /api/llm/config — returns non-secret LLM configuration
  router.get('/config', (_req: Request, res: Response) => {
    const llmConfig = llm.getConfig();
    res.json({
      provider: llmConfig.provider,
      model: llmConfig.model,
      maxTokens: llmConfig.maxTokens,
      temperature: llmConfig.temperature,
      experimentVersion: llmConfig.experimentVersion,
      promptVersion: llmConfig.promptVersion,
    });
  });

  return router;
}
