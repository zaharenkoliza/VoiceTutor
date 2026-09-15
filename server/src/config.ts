/**
 * Server configuration — loaded from environment variables.
 * All secrets stay on the server side only.
 */

export interface ServerConfig {
  port: number;

  // LLM
  llmProvider: string;
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
  llmMaxTokens: number;
  llmTemperature: number;
  yandexFolderId: string;
  yandexApiKey: string;
  speechkitSttModel: string;
  speechkitTtsVoice: string;

  // CORS
  allowedOrigins: string[];

  // Auth
  sessionSecret: string;
  researcherSecret: string;
  allowedParticipantCodes: Set<string>;

  databaseUrl: string;
  databaseSsl: boolean;
  experimentVersion: string;
  systemPromptVersion: string;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

export function loadConfig(): ServerConfig {
  const configuredOrigins = process.env['ALLOWED_ORIGINS'] ?? process.env['FRONTEND_ORIGIN'];
  if (process.env['NODE_ENV'] === 'production' && !configuredOrigins) {
    console.error('ALLOWED_ORIGINS or FRONTEND_ORIGIN is required in production');
    process.exit(1);
  }
  return {
    port: parseInt(process.env['PORT'] ?? '3001', 10),

    llmProvider: 'yandex-ai-studio',
    llmBaseUrl: 'https://ai.api.cloud.yandex.net/v1',
    llmModel: process.env['LLM_MODEL'] ?? '',
    llmApiKey: process.env['YANDEX_CLOUD_API_KEY'] ?? '',
    llmMaxTokens: parseInt(process.env['LLM_MAX_TOKENS'] ?? '300', 10),
    llmTemperature: parseFloat(process.env['LLM_TEMPERATURE'] ?? '0.7'),
    yandexFolderId: requireEnv('YANDEX_CLOUD_FOLDER_ID'),
    yandexApiKey: requireEnv('YANDEX_CLOUD_API_KEY'),
    speechkitSttModel: process.env['SPEECHKIT_STT_MODEL'] ?? 'general',
    speechkitTtsVoice: process.env['SPEECHKIT_TTS_VOICE'] ?? 'marina',

    allowedOrigins: (configuredOrigins ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),

    sessionSecret: requireEnv('SESSION_SECRET'),
    researcherSecret: requireEnv('RESEARCHER_SECRET'),
    allowedParticipantCodes: new Set(requireEnv('ALLOWED_PARTICIPANT_CODES').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)),

    databaseUrl: requireEnv('DATABASE_URL'),
    databaseSsl: process.env['DATABASE_SSL'] === 'true',
    experimentVersion: requireEnv('EXPERIMENT_VERSION'),
    systemPromptVersion: requireEnv('SYSTEM_PROMPT_VERSION'),
  };
}
