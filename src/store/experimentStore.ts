import { create } from 'zustand';
import type {
  ExperimentSession,
  ExperimentStep,
  InputMode,
  CompletionStatus,
  CounterbalanceScheme,
} from '../core/experiment/types';
import {
  createDefaultSessionConfig,
  parseScheme,
  schemeFromCode,
} from '../core/experiment/config';
import {
  createEvent,
  storeEventLocally,
  type ExperimentEvent,
  type EventType,
} from '../core/logger';
import { EventQueue } from '../core/eventQueue';
import { fetchLLMConfig, createSession as createServerSession } from '../core/tutor/llmClient';
import { getTaskById } from '../data/tasks';
import type { Task } from '../core/tutor/types';

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error('VITE_API_URL must be set at build time');

interface EventContext {
  participantId: string;
  sessionId: string;
  blockId: string;
  taskAttemptId: string;
}

interface ExperimentState {
  // Session State
  session: ExperimentSession | null;
  currentStep: ExperimentStep;
  authToken: string | null;

  // Sync Queue
  eventQueue: EventQueue | null;
  queueStatus: 'idle' | 'syncing' | 'error' | 'offline';
  pendingEventCount: number;

  // Active Block / Task Tracking
  activeBlockId: string; // 'block1' | 'block2' | 'practice' | ''
  activeMode: InputMode; // 'text' | 'voice'
  currentTaskIndex: number;
  blockTasks: Task[];
  activeTaskAttemptId: string;

  // Timers
  blockTimeRemainingMs: number;
  taskTimeRemainingMs: number;
  isTimerRunning: boolean;

  // Actions
  initParticipant: (participantCode: string) => Promise<boolean>;
  setConsent: (consentGiven: boolean) => Promise<void>;
  runSystemCheck: () => Promise<{ success: boolean; errors: string[] }>;
  submitPreSurvey: (responses: Record<string, string | number>) => Promise<void>;
  startPracticeBlock: () => void;
  startBlock: (blockId: 'block1' | 'block2') => void;
  startNextTask: () => void;
  submitTaskAnswer: (submittedAnswer: string, isCorrect: boolean) => Promise<void>;
  skipTask: () => Promise<void>;
  endTaskWithTechnicalError: () => Promise<void>;
  submitSurvey: (surveyId: 'block1' | 'block2' | 'post', responses: Record<string, string | number>) => Promise<void>;
  finishExperiment: () => Promise<void>;
  restoreSession: () => boolean;

  // Event logging helper
  logExperimentEvent: (type: EventType, data?: Record<string, unknown>, requestId?: string) => Promise<ExperimentEvent | null>;
  
  // Timer tick
  tickTimer: (deltaMs: number) => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  session: null,
  currentStep: 'consent',
  authToken: null,

  eventQueue: null,
  queueStatus: 'idle',
  pendingEventCount: 0,

  activeBlockId: '',
  activeMode: 'text',
  currentTaskIndex: 0,
  blockTasks: [],
  activeTaskAttemptId: '',

  blockTimeRemainingMs: 0,
  taskTimeRemainingMs: 0,
  isTimerRunning: false,

  logExperimentEvent: async (type: EventType, data = {}, requestId) => {
    const { session, activeBlockId, activeTaskAttemptId } = get();
    if (!session) return null;

    const context: EventContext = {
      participantId: session.participantId,
      sessionId: session.sessionId,
      blockId: activeBlockId || 'setup',
      taskAttemptId: activeTaskAttemptId || 'none',
    };

    const event = createEvent(context, type, data, requestId);
    event.experimentConfigVersion = session.config.experimentConfigVersion;
    await storeEventLocally(event);
    
    // Trigger quick sync check if eventQueue exists
    const { eventQueue } = get();
    if (eventQueue) {
      eventQueue.sync().catch(() => {});
    }

    return event;
  },

  initParticipant: async (participantCode: string) => {
    try {
      const codeClean = participantCode.trim().toUpperCase();
      let schemeNumber = 1;
      const match = codeClean.match(/-(\d)$/);
      if (match) {
        schemeNumber = parseInt(match[1], 10);
      } else {
        // Fallback: hash code string to 1..4
        let hash = 0;
        for (let i = 0; i < codeClean.length; i++) {
          hash = (hash << 5) - hash + codeClean.charCodeAt(i);
        }
        schemeNumber = (Math.abs(hash) % 4) + 1;
      }

      const scheme: CounterbalanceScheme = schemeFromCode(schemeNumber);
      const parsed = parseScheme(scheme);

      const sessionRes = await createServerSession(codeClean);
      const authToken = sessionRes.token;
      const llmConfigData = await fetchLLMConfig();
      if (!llmConfigData.provider || !llmConfigData.model) {
        throw new Error('LLM is not configured on the server');
      }

      const sessionId = crypto.randomUUID();
      const config = createDefaultSessionConfig(scheme);
      config.llmConfig = { ...config.llmConfig, ...llmConfigData };
      config.experimentConfigVersion = llmConfigData.experimentVersion;

      // Initialize EventQueue
      const queue = new EventQueue(API_URL, codeClean, authToken);
      queue.onStatusChange((status, pendingCount) => {
        set({ queueStatus: status, pendingEventCount: pendingCount });
      });
      queue.start();

      const session: ExperimentSession = {
        participantId: codeClean,
        sessionId,
        config,
        currentStep: 'participant_code',
        block1Mode: parsed.block1.mode,
        block1TaskSet: parsed.block1.taskSet,
        block2Mode: parsed.block2.mode,
        block2TaskSet: parsed.block2.taskSet,
        startedAt: new Date().toISOString(),
        authToken,
        consentGiven: true,
        systemCheckPassed: false,
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          speechRecognitionAvailable: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
          speechSynthesisAvailable: 'speechSynthesis' in window,
        },
      };

      set({
        session,
        authToken,
        eventQueue: queue,
        currentStep: 'system_check',
      });

      // Log session start
      const state = get();
      await state.logExperimentEvent('session_start', {
        scheme,
        block1Mode: parsed.block1.mode,
        block1TaskSet: parsed.block1.taskSet,
        block2Mode: parsed.block2.mode,
        block2TaskSet: parsed.block2.taskSet,
        browserInfo: session.browserInfo,
        sessionConfig: config,
      });

      return true;
    } catch (err) {
      console.error('Failed to init participant:', err);
      return false;
    }
  },

  setConsent: async (consentGiven: boolean) => {
    const { session } = get();
    set({ session: session ? { ...session, consentGiven } : null,
      currentStep: consentGiven ? 'participant_code' : 'consent' });

    if (consentGiven) {
      await get().logExperimentEvent('consent', { given: true, timestamp: new Date().toISOString() });
    }
  },

  runSystemCheck: async () => {
    const errors: string[] = [];
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      errors.push('Браузер не поддерживает запись аудио через Web Audio API.');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch { errors.push('Не удалось получить доступ к микрофону.'); }
    try {
      const response = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) errors.push('API недоступен или вернул ошибку.');
    } catch { errors.push('Нет соединения с API исследования.'); }
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
      errors.push('Выполнение Python недоступно в этом браузере.');
    } else {
      try {
        await new Promise<void>((resolve, reject) => {
          const worker = new Worker(`${import.meta.env.BASE_URL}pyodideWorker.js`);
          const timeout = window.setTimeout(() => { worker.terminate(); reject(new Error('timeout')); }, 20_000);
          worker.onmessage = (event) => {
            if (event.data?.type === 'ready') {
              window.clearTimeout(timeout); worker.terminate(); resolve();
            }
          };
          worker.onerror = () => { window.clearTimeout(timeout); worker.terminate(); reject(new Error('worker')); };
        });
      } catch { errors.push('Pyodide не загрузился или не инициализировался.'); }
    }

    const pass = errors.length === 0;
    const { session } = get();

    if (session) {
      set({
        session: { ...session, systemCheckPassed: pass },
        currentStep: pass ? 'pre_survey' : 'system_check',
      });
      await get().logExperimentEvent('system_check', { passed: pass, errors });
    }

    return { success: pass, errors };
  },

  submitPreSurvey: async (responses: Record<string, string | number>) => {
    await get().logExperimentEvent('survey_response', { surveyId: 'pre_survey', responses });
    set({ currentStep: 'practice' });
  },

  startPracticeBlock: () => {
    const practiceTaskIds = ['practice-text', 'practice-voice'];
    const tasks = practiceTaskIds.map((id) => getTaskById(id)).filter((t): t is Task => t !== undefined);

    set({
      activeBlockId: 'practice',
      activeMode: 'text',
      currentTaskIndex: 0,
      blockTasks: tasks,
      activeTaskAttemptId: crypto.randomUUID(),
      currentStep: 'practice',
    });

    get().logExperimentEvent('block_start', { blockId: 'practice', mode: 'practice' });
    if (tasks.length > 0) {
      get().logExperimentEvent('task_start', { taskId: tasks[0].id, taskTitle: tasks[0].title });
    }
  },

  startBlock: (blockId: 'block1' | 'block2') => {
    const { session } = get();
    if (!session) return;

    const isBlock1 = blockId === 'block1';
    const mode = isBlock1 ? session.block1Mode : session.block2Mode;
    const taskSetLetter = isBlock1 ? session.block1TaskSet : session.block2TaskSet;
    const taskIds = taskSetLetter === 'A' ? session.config.taskSetA : session.config.taskSetB;

    const tasks = taskIds.map((id) => getTaskById(id)).filter((t): t is Task => t !== undefined);
    const taskAttemptId = crypto.randomUUID();

    set({
      activeBlockId: blockId,
      activeMode: mode,
      currentTaskIndex: 0,
      blockTasks: tasks,
      activeTaskAttemptId: taskAttemptId,
      currentStep: blockId,
      blockTimeRemainingMs: session.config.blockTimeLimitMs,
      taskTimeRemainingMs: session.config.taskTimeLimitMs,
      isTimerRunning: true,
    });

    // Start timer interval
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      get().tickTimer(1000);
    }, 1000);

    get().logExperimentEvent('block_start', { blockId, mode, taskSet: taskSetLetter });
    if (tasks.length > 0) {
      get().logExperimentEvent('task_start', {
        taskId: tasks[0].id,
        taskTitle: tasks[0].title,
        taskIndex: 0,
        mode,
      });
    }
  },

  startNextTask: () => {
    const { currentTaskIndex, blockTasks, activeMode, session, activeBlockId } = get();
    const nextIndex = currentTaskIndex + 1;

    if (nextIndex < blockTasks.length) {
      const nextTask = blockTasks[nextIndex];
      const taskAttemptId = crypto.randomUUID();
      const nextMode = activeBlockId === 'practice' && nextIndex === 1 ? 'voice' : activeMode;

      set({
        currentTaskIndex: nextIndex,
        activeMode: nextMode,
        activeTaskAttemptId: taskAttemptId,
        taskTimeRemainingMs: session?.config.taskTimeLimitMs ?? 600000,
      });

      get().logExperimentEvent('task_start', {
        taskId: nextTask.id,
        taskTitle: nextTask.title,
        taskIndex: nextIndex,
        mode: nextMode,
      });
    } else {
      // Block completed!
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      set({ isTimerRunning: false });

      get().logExperimentEvent('block_end', { blockId: activeBlockId, status: 'completed' });

      if (activeBlockId === 'block1') {
        set({ currentStep: 'mid_survey' });
      } else if (activeBlockId === 'block2') {
        set({ currentStep: 'post_survey' });
      } else if (activeBlockId === 'practice') {
        get().startBlock('block1');
      }
    }
  },

  submitTaskAnswer: async (submittedAnswer: string, isCorrect: boolean) => {
    const { currentTaskIndex, blockTasks } = get();
    const currentTask = blockTasks[currentTaskIndex];

    await get().logExperimentEvent('answer_submit', {
      taskId: currentTask?.id,
      submittedAnswer,
      isCorrect,
    });

    if (isCorrect) {
      await get().logExperimentEvent('task_end', {
        taskId: currentTask?.id,
        status: 'correct' as CompletionStatus,
      });
      get().startNextTask();
    }
  },

  skipTask: async () => {
    const { currentTaskIndex, blockTasks } = get();
    const currentTask = blockTasks[currentTaskIndex];

    await get().logExperimentEvent('task_end', {
      taskId: currentTask?.id,
      status: 'skipped' as CompletionStatus,
    });

    get().startNextTask();
  },

  endTaskWithTechnicalError: async () => {
    const { currentTaskIndex, blockTasks } = get();
    const currentTask = blockTasks[currentTaskIndex];
    await get().logExperimentEvent('technical_error', { taskId: currentTask?.id, source: 'participant_or_researcher' });
    await get().logExperimentEvent('task_end', { taskId: currentTask?.id, status: 'technical_error' as CompletionStatus });
    get().startNextTask();
  },

  submitSurvey: async (surveyId: 'block1' | 'block2' | 'post', responses: Record<string, string | number>) => {
    await get().logExperimentEvent('survey_response', { surveyId, responses });

    if (surveyId === 'block1') {
      get().startBlock('block2');
    } else if (surveyId === 'block2' || surveyId === 'post') {
      await get().finishExperiment();
    }
  },

  finishExperiment: async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    await get().logExperimentEvent('session_end', { reason: 'completed' });

    // Force queue sync
    const { eventQueue } = get();
    if (eventQueue) {
      await eventQueue.sync();
    }
    set({ currentStep: 'completion', isTimerRunning: false });
    localStorage.removeItem('voicetutor_active_experiment');
  },

  restoreSession: () => {
    try {
      const raw = localStorage.getItem('voicetutor_active_experiment');
      if (!raw) return false;
      const snapshot = JSON.parse(raw) as Partial<ExperimentState>;
      if (!snapshot.session || !snapshot.authToken) return false;
      const queue = new EventQueue(API_URL, snapshot.session.participantId, snapshot.authToken);
      queue.onStatusChange((queueStatus, pendingEventCount) => set({ queueStatus, pendingEventCount }));
      queue.start();
      set({
        session: snapshot.session,
        authToken: snapshot.authToken,
        currentStep: snapshot.currentStep ?? snapshot.session.currentStep,
        activeBlockId: snapshot.activeBlockId ?? '',
        activeMode: snapshot.activeMode ?? 'text',
        currentTaskIndex: snapshot.currentTaskIndex ?? 0,
        blockTasks: snapshot.blockTasks ?? [],
        activeTaskAttemptId: snapshot.activeTaskAttemptId ?? '',
        blockTimeRemainingMs: snapshot.blockTimeRemainingMs ?? 0,
        taskTimeRemainingMs: snapshot.taskTimeRemainingMs ?? 0,
        isTimerRunning: snapshot.activeBlockId === 'block1' || snapshot.activeBlockId === 'block2',
        eventQueue: queue,
      });
      if (snapshot.activeBlockId === 'block1' || snapshot.activeBlockId === 'block2') {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => get().tickTimer(1000), 1000);
      }
      get().logExperimentEvent('session_resume', {
        timingNote: 'Monotonic durations from before and after reload must not be combined.',
      });
      return true;
    } catch { return false; }
  },

  tickTimer: (deltaMs: number) => {
    const { blockTimeRemainingMs, taskTimeRemainingMs, isTimerRunning } = get();
    if (!isTimerRunning) return;

    const newBlockTime = Math.max(0, blockTimeRemainingMs - deltaMs);
    const newTaskTime = Math.max(0, taskTimeRemainingMs - deltaMs);

    set({
      blockTimeRemainingMs: newBlockTime,
      taskTimeRemainingMs: newTaskTime,
    });

    if (newBlockTime <= 0) {
      // Block timeout
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      set({ isTimerRunning: false });

      const { activeBlockId, currentTaskIndex, blockTasks } = get();
      const currentTask = blockTasks[currentTaskIndex];
      get().logExperimentEvent('task_end', { taskId: currentTask?.id, status: 'timeout' as CompletionStatus });
      get().logExperimentEvent('block_end', { blockId: activeBlockId, status: 'timeout' });

      if (activeBlockId === 'block1') {
        set({ currentStep: 'mid_survey' });
      } else {
        set({ currentStep: 'post_survey' });
      }
    }
  },
}));

if (typeof window !== 'undefined') {
  useExperimentStore.subscribe((state) => {
    if (!state.session || state.currentStep === 'completion') return;
    localStorage.setItem('voicetutor_active_experiment', JSON.stringify({
      session: state.session, authToken: state.authToken, currentStep: state.currentStep,
      activeBlockId: state.activeBlockId, activeMode: state.activeMode,
      currentTaskIndex: state.currentTaskIndex, blockTasks: state.blockTasks,
      activeTaskAttemptId: state.activeTaskAttemptId,
      blockTimeRemainingMs: state.blockTimeRemainingMs, taskTimeRemainingMs: state.taskTimeRemainingMs,
    }));
  });
  window.addEventListener('pagehide', () => {
    void useExperimentStore.getState().logExperimentEvent('session_interrupt', { reason: 'page_unload' });
  });
}
