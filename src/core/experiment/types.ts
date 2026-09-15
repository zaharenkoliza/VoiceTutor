/**
 * Experiment types — core data structures for the within-subjects study.
 *
 * Two conditions: text input vs voice input for tutor questions.
 * Voice mode uses SpeechKit TTS; text mode renders the same LLM response without audio.
 */

/** Input mode for tutor interaction */
export type InputMode = 'text' | 'voice';

/** Counterbalancing scheme: mode/taskSet for block1 → block2 */
export type CounterbalanceScheme =
  | 'text-A_voice-B'
  | 'voice-A_text-B'
  | 'text-B_voice-A'
  | 'voice-B_text-A';

/** Task completion status */
export type CompletionStatus =
  | 'correct'       // Correct answer submitted
  | 'skipped'       // Participant chose to skip
  | 'timeout'       // Time limit reached
  | 'interrupted'   // Session interrupted (page close, etc.)
  | 'technical_error'; // Technical failure

/** Experiment flow step */
export type ExperimentStep =
  | 'consent'
  | 'participant_code'
  | 'system_check'
  | 'pre_survey'
  | 'practice'
  | 'block1'
  | 'mid_survey'
  | 'block2'
  | 'post_survey'
  | 'completion';

/** LLM configuration — frozen at session start */
export interface LLMConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
  promptVersion: string;
  experimentVersion: string;
}

/** Experiment session configuration — immutable after session start */
export interface ExperimentSessionConfig {
  schemaVersion: string;
  appVersion: string;
  experimentConfigVersion: string;

  scheme: CounterbalanceScheme;
  taskSetA: string[];
  taskSetB: string[];
  practiceTasks: string[];

  blockTimeLimitMs: number;
  taskTimeLimitMs: number;

  llmConfig: LLMConfig;
}

/** Experiment session state */
export interface ExperimentSession {
  participantId: string;
  sessionId: string;
  config: ExperimentSessionConfig;
  currentStep: ExperimentStep;
  block1Mode: InputMode;
  block1TaskSet: 'A' | 'B';
  block2Mode: InputMode;
  block2TaskSet: 'A' | 'B';
  startedAt: string;
  authToken: string;
  consentGiven: boolean;
  systemCheckPassed: boolean;

  /** Browser info for logging */
  browserInfo: {
    userAgent: string;
    language: string;
    speechRecognitionAvailable: boolean;
    speechSynthesisAvailable: boolean;
  };
}

/** Survey question definition */
export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'likert5' | 'likert7' | 'open_text';
  /** Labels for scale endpoints */
  scaleLabels?: { low: string; high: string };
  /** All point labels for likert scales */
  pointLabels?: string[];
  required: boolean;
}

/** Survey response */
export interface SurveyResponse {
  questionId: string;
  questionText: string;
  response: string | number;
  timestamp: string;
}

/** Pre-survey data */
export interface PreSurveyData {
  pythonExperience: number; // 1-5
  egeTasksFamiliarity: number; // 1-5
  voiceAssistantUsage: number; // 1-5
}

/** Consent info — configurable, not hardcoded */
export interface ConsentConfig {
  studyTitle: string;
  studyDescription: string;
  dataUsageDescription: string;
  speechServiceNotice: string;
  llmProviderNotice: string;
  dataRetentionInfo: string;
  researcherContact: string;
  voluntaryParticipation: string;
}
