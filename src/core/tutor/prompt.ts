import type { Task } from './types.js';

/**
 * Builds the user message with the current task, code, and optional question.
 * Task text and current code are always inserted fresh (not stored in history).
 */
export function buildUserMessage(
  task: Task,
  code: string,
  question?: string,
  verificationContext?: { isCorrect: boolean; attempt: number },
): string {
  let message = `Задание №${task.number}: ${task.title}
${task.description}

Текущий код ученика:
\`\`\`python
${code}
\`\`\``;

  if (question) {
    message += `\n\nВопрос ученика: ${question}`;
  }

  if (verificationContext) {
    if (verificationContext.isCorrect) {
      message += `\n\nСистема проверки: ответ ученика ВЕРНЫЙ (попытка №${verificationContext.attempt}). Похвали ученика!`;
    } else {
      message += `\n\nСистема проверки: ответ ученика НЕВЕРНЫЙ (попытка №${verificationContext.attempt}). Подскажи где может быть ошибка в логике, но НЕ давай правильный ответ и НЕ давай готовый код.`;
    }
  }

  return message;
}

