/**
 * LLM Client — sends requests to our backend API proxy.
 * API key is stored on the server only — never in the client bundle.
 */

import type { DialogMessage } from './types.js';

/** API base URL — configured via env, defaults to localhost for dev */
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error('VITE_API_URL must be set at build time');

export interface LLMResponse {
  content: string;
  model: string;
  latencyMs: number;
  requestId: string;
  retryCount: number;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface LLMConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
  experimentVersion: string;
  promptVersion: string;
}

/**
 * Send a chat request to the LLM via our server proxy.
 * Returns the model's text response with metadata.
 */
export async function sendToAI(
  messages: DialogMessage[],
  authToken: string,
  participantId: string,
  expectedConfig: LLMConfig,
): Promise<LLMResponse> {
  const requestId = crypto.randomUUID();

  const response = await fetch(`${API_URL}/api/llm/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${participantId}:${authToken}`,
    },
    body: JSON.stringify({
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      requestId,
      expectedConfig,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    const message = errorData.error ?? `API error (${response.status})`;

    if (response.status === 429) {
      throw new Error('Лимит запросов исчерпан. Подождите минуту.');
    }
    if (response.status === 504) {
      throw new Error('Превышено время ожидания ответа AI. Попробуйте ещё раз.');
    }

    throw new Error(message);
  }

  const data = await response.json() as LLMResponse;

  if (!data.content) {
    throw new Error('Пустой ответ от AI');
  }

  return data;
}

/**
 * Fetch LLM config from server (non-secret info: provider, model, params).
 */
export async function fetchLLMConfig(): Promise<LLMConfig> {
  const response = await fetch(`${API_URL}/api/llm/config`);
  if (!response.ok) {
    throw new Error('Не удалось получить конфигурацию AI');
  }
  return response.json() as Promise<LLMConfig>;
}

/**
 * Create a session on the server and get auth token.
 */
export async function createSession(participantId: string): Promise<{ token: string }> {
  const response = await fetch(`${API_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
    throw new Error(errorData.error ?? 'Не удалось создать сессию');
  }

  return response.json() as Promise<{ token: string }>;
}

/**
 * Check if the API server is available.
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
