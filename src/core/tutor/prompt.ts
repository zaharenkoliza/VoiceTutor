import type { Task } from './types';

/**
 * System prompt: defines tutor behavior.
 * The tutor must never give the answer directly — only guiding hints.
 */
export function buildSystemPrompt(): string {
  return `Ты — опытный репетитор по информатике, помогаешь ученику решить задачу ЕГЭ.
Твои правила:
- НИКОГДА не давай готовый ответ или готовый код.
- Задавай наводящие вопросы, чтобы ученик сам догадался.
- Если видишь ошибку в коде — укажи на конкретную строку и опиши проблему, но не исправляй её.
- Будь краток: одна подсказка за раз, максимум 1-2 предложения.
- Отвечай на русском языке.
- Если ученик ещё не начал писать код — подскажи с чего начать, но не давай код.
- Если код правильный — похвали и скажи об этом.`;
}

/**
 * Builds the user message with the current task, code, and optional voice question.
 * Task text and current code are always inserted fresh (not stored in history).
 */
export function buildUserMessage(
  task: Task,
  code: string,
  voiceQuestion?: string,
  verificationContext?: { isCorrect: boolean; attempt: number },
  isIdleCheck?: boolean,
): string {
  let message = `Задание №${task.number}: ${task.title}
${task.description}

Текущий код ученика:
\`\`\`python
${code}
\`\`\``;

  if (voiceQuestion) {
    message += `\n\nВопрос ученика: ${voiceQuestion}`;
  }

  if (verificationContext) {
    if (verificationContext.isCorrect) {
      message += `\n\nСистема проверки: ответ ученика ВЕРНЫЙ (попытка №${verificationContext.attempt}). Похвали ученика!`;
    } else {
      message += `\n\nСистема проверки: ответ ученика НЕВЕРНЫЙ (попытка №${verificationContext.attempt}). Подскажи где может быть ошибка в логике, но НЕ давай правильный ответ и НЕ давай готовый код.`;
    }
  }

  if (isIdleCheck && !voiceQuestion && !verificationContext) {
    message += `\n\nУченик уже какое-то время молчит и не меняет код. Коротко (одно предложение) спроси, не нужна ли ему помощь или подсказка.`;
  }

  return message;
}

