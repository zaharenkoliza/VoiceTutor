/**
 * Express server entry point.
 * Wires up all routes, middleware, CORS, and storage.
 */

import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { createLLMAdapter } from './llm/adapter.js';
import { createPool } from './db/pool.js';
import { PostgresEventStore } from './storage/postgresStore.js';
import { createLLMRouter } from './routes/llm.js';
import { createEventsRouter } from './routes/events.js';
import { createExportRouter } from './routes/export.js';
import { SpeechKitClient } from './speech/client.js';
import { createSpeechRouter } from './routes/speech.js';

async function main(): Promise<void> {
  const config = loadConfig();

  // Initialize storage
  const store = new PostgresEventStore(createPool(config));
  await store.init();

  // Initialize LLM adapter
  const llm = createLLMAdapter(config);
  const speech = new SpeechKitClient(config);

  // Create Express app
  const app = express();

  // CORS
  app.use(cors({
    origin: config.allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }));

  // Body parsing with size limits
  app.use(express.json({ limit: '200kb' }));

  // Routes
  app.use('/api/llm', createLLMRouter(llm, config));
  app.use('/api/speech', createSpeechRouter(speech, config));
  app.use('/api', createEventsRouter(store, config));
  app.use('/api/export', createExportRouter(store, config));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      llm: { provider: config.llmProvider, model: config.llmModel },
    });
  });

  // Start server
  app.listen(config.port, () => {
    console.log(`VoiceTutor API server running on port ${config.port}`);
    console.log(`  LLM: ${config.llmProvider} / ${config.llmModel}`);
    console.log(`  CORS origins: ${config.allowedOrigins.join(', ')}`);
    console.log('  Storage: PostgreSQL');
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
