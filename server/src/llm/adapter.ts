/**
 * Yandex AI Studio client using its OpenAI-compatible chat endpoint.
 * Configured via LLM_BASE_URL, LLM_MODEL, LLM_API_KEY.
 *
 * Key design decisions:
 * - Uses fetch (no SDK) for minimal dependencies
 * - Never logs API key or full responses
 * - Retries on 429 with exponential backoff
 * - Timeouts to prevent hanging requests
 */

import type { ServerConfig } from '../config.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  retryCount: number;
}

export interface LLMAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  getConfig(): { provider: string; model: string; maxTokens: number; temperature: number; experimentVersion: string; promptVersion: string };
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

export function createLLMAdapter(config: ServerConfig): LLMAdapter {
  const { llmProvider, llmBaseUrl, llmModel, llmApiKey, llmMaxTokens, llmTemperature } = config;

  async function chat(request: ChatRequest): Promise<ChatResponse> {
    if (!llmProvider || !llmBaseUrl || !llmModel || !llmApiKey) {
      throw new Error('LLM is not configured on the server');
    }
    const maxTokens = request.maxTokens ?? llmMaxTokens;
    const temperature = request.temperature ?? llmTemperature;

    const body = JSON.stringify({
      model: llmModel,
      max_tokens: maxTokens,
      temperature,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const url = `${llmBaseUrl.replace(/\/+$/, '')}/chat/completions`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmApiKey}`,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 + 1000 : 10000;
          console.warn(`LLM rate limit hit (attempt ${attempt + 1}), retrying in ${delay}ms`);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'unknown error');
          throw new Error(`LLM API error (${response.status}): ${sanitizeError(errorText)}`);
        }

        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
          model?: string;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from LLM');
        }

        return {
          content,
          model: data.model ?? llmModel,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          } : undefined,
          retryCount: attempt,
        };
      } catch (err) {
        clearTimeout(timeout);

        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new Error(`LLM request timed out after ${REQUEST_TIMEOUT_MS}ms`, { cause: err });
        }

        throw new Error(err instanceof Error ? err.message : 'LLM request failed', { cause: err });
      }
    }

    throw new Error('LLM rate limit exceeded after retries');
  }

  function getConfig() {
    return { provider: llmProvider, model: llmModel, maxTokens: llmMaxTokens, temperature: llmTemperature,
      experimentVersion: config.experimentVersion, promptVersion: config.systemPromptVersion };
  }

  return { chat, getConfig };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Remove potential API keys from error messages */
function sanitizeError(text: string): string {
  return text.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/(?:Api-Key|Bearer)\s+\S+/gi, '[REDACTED]')
    .substring(0, 500);
}
