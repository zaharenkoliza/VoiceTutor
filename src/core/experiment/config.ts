/**
 * Experiment configuration.
 *
 * Task sets A and B are CANDIDATES for the pilot study.
 * Difficulty equivalence has NOT been verified — this is the purpose of piloting.
 *
 * Block and task time limits are configurable defaults, not scientifically validated durations.
 */

import type {
  ExperimentSessionConfig,
  SurveyQuestion,
  ConsentConfig,
  CounterbalanceScheme,
  InputMode,
} from './types.js';

// ─── App & Schema Versions ─────────────────────────────────────────

export const APP_VERSION = '2.0.0-pilot';
export const SCHEMA_VERSION = '2.0';
export const EXPERIMENT_CONFIG_VERSION = '1.0';
export const PROMPT_VERSION = '1.0';

// ─── Task Sets ─────────────────────────────────────────────────────

/**
 * Task set A — candidate set.
 * Contains one task per target EGE type (17, 25, 27).
 */
export const TASK_SET_A: string[] = [
  'pilot-a-17',
  'pilot-a-24',
];

/**
 * Task set B — candidate set.
 * Contains alternative tasks of the same EGE types.
 */
export const TASK_SET_B: string[] = [
  'pilot-b-17',
  'pilot-b-24',
];

/**
 * Practice tasks — used for familiarization with both modes.
 * Not included in experimental data analysis.
 */
export const PRACTICE_TASKS: string[] = [
  'practice-text',  // Simple task for text mode practice
  'practice-voice', // Simple task for voice mode practice
];

// ─── Counterbalancing ──────────────────────────────────────────────

/** Parse scheme into block assignments */
export function parseScheme(scheme: CounterbalanceScheme): {
  block1: { mode: InputMode; taskSet: 'A' | 'B' };
  block2: { mode: InputMode; taskSet: 'A' | 'B' };
} {
  switch (scheme) {
    case 'text-A_voice-B':
      return { block1: { mode: 'text', taskSet: 'A' }, block2: { mode: 'voice', taskSet: 'B' } };
    case 'voice-A_text-B':
      return { block1: { mode: 'voice', taskSet: 'A' }, block2: { mode: 'text', taskSet: 'B' } };
    case 'text-B_voice-A':
      return { block1: { mode: 'text', taskSet: 'B' }, block2: { mode: 'voice', taskSet: 'A' } };
    case 'voice-B_text-A':
      return { block1: { mode: 'voice', taskSet: 'B' }, block2: { mode: 'text', taskSet: 'A' } };
  }
}

/** Decode scheme from participant code suffix (1-4) */
export function schemeFromCode(code: number): CounterbalanceScheme {
  const schemes: CounterbalanceScheme[] = [
    'text-A_voice-B',
    'voice-A_text-B',
    'text-B_voice-A',
    'voice-B_text-A',
  ];
  return schemes[(code - 1) % 4];
}

// ─── Default Session Config ────────────────────────────────────────

export function createDefaultSessionConfig(scheme: CounterbalanceScheme): ExperimentSessionConfig {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    experimentConfigVersion: EXPERIMENT_CONFIG_VERSION,
    scheme,
    taskSetA: [...TASK_SET_A],
    taskSetB: [...TASK_SET_B],
    practiceTasks: [...PRACTICE_TASKS],
    llmConfig: {
      provider: '',  // Filled from server /api/llm/config
      model: '',
      maxTokens: 300,
      temperature: 0.7,
      promptVersion: PROMPT_VERSION,
      experimentVersion: EXPERIMENT_CONFIG_VERSION,
    },
  };
}

// ─── Surveys ───────────────────────────────────────────────────────

/**
 * Pre-experiment survey: background information.
 */
export const PRE_SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'python_experience',
    text: 'Оцените ваш опыт программирования на Python',
    type: 'likert5',
    pointLabels: ['Нет опыта', 'Начинающий', 'Средний', 'Уверенный', 'Продвинутый'],
    required: true,
  },
  {
    id: 'ege_familiarity',
    text: 'Насколько вы знакомы с заданиями ЕГЭ по информатике?',
    type: 'likert5',
    pointLabels: ['Не знаком(а)', 'Слышал(а)', 'Решал(а) немного', 'Решал(а) много', 'Активно готовлюсь'],
    required: true,
  },
  {
    id: 'voice_assistant_usage',
    text: 'Как часто вы используете голосовых помощников (Алиса, Siri, и т.д.)?',
    type: 'likert5',
    pointLabels: ['Никогда', 'Редко', 'Иногда', 'Часто', 'Ежедневно'],
    required: true,
  },
  {
    id: 'ai_assistant_usage',
    text: 'Как часто вы используете AI-ассистентов (ChatGPT, Copilot, YandexGPT и т.д.)?',
    type: 'likert5',
    pointLabels: ['Никогда', 'Редко', 'Иногда', 'Часто', 'Практически ежедневно'],
    required: true,
  },
];

/**
 * Post-block survey: usability assessment after each block.
 * This is an author-created questionnaire, NOT a standardized instrument (not SUS, not NASA-TLX).
 */
export const BLOCK_SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'ease_of_use',
    text: 'Насколько удобным был способ обращения к тьютору в этом блоке?',
    type: 'likert7',
    scaleLabels: { low: 'Совсем неудобно', high: 'Очень удобно' },
    pointLabels: ['1 — Совсем неудобно', '2', '3', '4 — Нейтрально', '5', '6', '7 — Очень удобно'],
    required: true,
  },
  {
    id: 'formulation_ease',
    text: 'Насколько легко было сформулировать вопрос тьютору в этом режиме?',
    type: 'likert7',
    scaleLabels: { low: 'Очень сложно', high: 'Очень легко' },
    pointLabels: ['1 — Очень сложно', '2', '3', '4 — Нейтрально', '5', '6', '7 — Очень легко'],
    required: true,
  },
  {
    id: 'effort',
    text: 'Сколько усилий потребовало взаимодействие с тьютором?',
    type: 'likert7',
    scaleLabels: { low: 'Минимум усилий', high: 'Очень много усилий' },
    pointLabels: ['1 — Минимум усилий', '2', '3', '4 — Умеренно', '5', '6', '7 — Очень много усилий'],
    required: true,
  },
  {
    id: 'perceived_speed',
    text: 'Как вы оцениваете скорость получения ответа от тьютора?',
    type: 'likert7',
    scaleLabels: { low: 'Очень медленно', high: 'Очень быстро' },
    pointLabels: ['1 — Очень медленно', '2', '3', '4 — Нейтрально', '5', '6', '7 — Очень быстро'],
    required: true,
  },
  {
    id: 'satisfaction',
    text: 'Насколько вы удовлетворены взаимодействием с тьютором в этом блоке?',
    type: 'likert7',
    scaleLabels: { low: 'Совсем не удовлетворён(а)', high: 'Полностью удовлетворён(а)' },
    pointLabels: ['1 — Совсем нет', '2', '3', '4 — Нейтрально', '5', '6', '7 — Полностью'],
    required: true,
  },
  {
    id: 'block_comment',
    text: 'Есть ли у вас комментарии по этому блоку? (необязательно)',
    type: 'open_text',
    required: false,
  },
];

/**
 * Final survey: preference between modes.
 */
export const POST_SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'mode_preference',
    text: 'Какой способ обращения к тьютору вы предпочитаете?',
    type: 'likert7',
    scaleLabels: { low: 'Определённо текст', high: 'Определённо голос' },
    pointLabels: [
      '1 — Определённо текст', '2', '3', '4 — Без предпочтения', '5', '6', '7 — Определённо голос',
    ],
    required: true,
  },
  {
    id: 'perceived_speed_preference',
    text: 'В каком режиме ответы тьютора приходили быстрее?',
    type: 'likert7',
    scaleLabels: { low: 'Определённо в текстовом', high: 'Определённо в голосовом' },
    pointLabels: [
      '1 — Определённо текст', '2', '3', '4 — Одинаково', '5', '6', '7 — Определённо голос',
    ],
    required: true,
  },
  {
    id: 'formulation_preference',
    text: 'В каком режиме было легче формулировать вопрос тьютору?',
    type: 'likert7',
    scaleLabels: { low: 'Определённо в текстовом', high: 'Определённо в голосовом' },
    pointLabels: [
      '1 — Определённо текст', '2', '3', '4 — Одинаково', '5', '6', '7 — Определённо голос',
    ],
    required: true,
  },
  {
    id: 'preference_reason',
    text: 'Почему вы предпочитаете выбранный режим? Опишите кратко.',
    type: 'open_text',
    required: true,
  },
  {
    id: 'final_comment',
    text: 'Любые дополнительные комментарии об участии в исследовании (необязательно)',
    type: 'open_text',
    required: false,
  },
];

// ─── Consent Configuration ────────────────────────────────────────

/**
 * Default consent text. All contact info and conditions are configurable.
 * Researcher must update these before conducting the study.
 */
export const DEFAULT_CONSENT_CONFIG: ConsentConfig = {
  studyTitle: 'Исследование способов взаимодействия с AI-тьютором',
  studyDescription:
    'Вы приглашены принять участие в пилотном исследовании, в котором сравниваются два способа обращения к AI-тьютору при решении задач по информатике: текстовый ввод и голосовой ввод. Исследование займёт примерно 40–60 минут.',
  dataUsageDescription:
    'Мы собираем анонимные данные о ходе решения задач: действия в редакторе, запросы к тьютору, время выполнения и ваши оценки удобства. Данные используются исключительно в исследовательских целях.',
  speechServiceNotice:
    'В голосовом режиме запись реплики передаётся через наш сервер в Yandex SpeechKit для распознавания. Аудиозапись не сохраняется приложением. Ответ тьютора передаётся в Yandex SpeechKit для озвучивания.',
  llmProviderNotice:
    'Тексты ваших вопросов тьютору передаются провайдеру языковой модели для генерации подсказок.',
  dataRetentionInfo: '[Укажите условия хранения данных]',
  researcherContact: '[Укажите контактные данные исследователя]',
  voluntaryParticipation:
    'Участие добровольное. Вы можете прекратить в любой момент без объяснения причин.',
};
