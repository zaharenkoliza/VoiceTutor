import type { DialogMessage } from './types';

/**
 * Groq API — free tier with generous PER-USER limits:
 * - 30 requests/min, 14400 requests/day
 * - llama-3.3-70b-versatile: fast, good at Russian
 * In dev, proxied through Vite (see vite.config.ts) to dodge the dev-server origin.
 * In production (static build, no backend) we call Groq directly — Groq's API
 * sends `Access-Control-Allow-Origin: *`, so this works without a server-side proxy.
 */
const API_URL = import.meta.env.DEV
  ? '/api/groq/openai/v1/chat/completions'
  : 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 300;

interface GroqResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

/** Sleep for ms milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a request to Groq API via Vite proxy.
 * Returns the model's text response.
 */
export async function sendToAI(
  systemPrompt: string,
  messages: DialogMessage[],
): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string;

  if (!apiKey || apiKey.includes('...')) {
    throw new Error(
      'API ключ не настроен. Создайте файл .env с переменной VITE_GROQ_API_KEY.\n' +
      'Получите бесплатный ключ на https://console.groq.com/keys',
    );
  }

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ],
  });

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 + 1000 : 10000;
      console.warn(`Groq rate limit, retrying in ${delay / 1000}s...`);
      await sleep(delay);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error('Лимит запросов исчерпан. Подождите 10 секунд.');
      }
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Пустой ответ от AI');
    }

    return text;
  }

  throw new Error('Лимит запросов исчерпан. Подождите минуту.');
}
