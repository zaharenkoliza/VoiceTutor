import { create } from 'zustand';
import type { Task } from '../core/tutor/types';
import { verifyAnswer, type VerificationResult } from '../core/tutor/verifier';
import { useLoggerStore } from './loggerStore';
import type { ErrorCategory } from '../core/logger';

interface RunnerState {
  isRunning: boolean;
  output: string;
  isReady: boolean;

  // Verification
  verificationResult: VerificationResult | null;
  attempts: number;
  isSolved: boolean;

  runCode: (code: string) => void;
  stopCode: () => void;
  clearOutput: () => void;
  initWorker: () => void;
  checkAnswer: (task: Task) => void;
  resetVerification: () => void;
}

let worker: Worker | null = null;
let currentRunId = 0;
/** Tracks number of code runs in the current session for FCRR metric. */
let sessionCodeRunCount = 0;

export const useRunnerStore = create<RunnerState>((set, get) => ({
  isRunning: false,
  output: '',
  isReady: false,

  verificationResult: null,
  attempts: 0,
  isSolved: false,

  initWorker: () => {
    if (worker) {
      worker.terminate();
    }
    worker = new Worker(`${import.meta.env.BASE_URL}pyodideWorker.js`);
    set({ isReady: false });

    worker.onmessage = (event) => {
      const { type, text, error, runId } = event.data;
      
      if (type === 'ready') {
        set({ isReady: true });
      } else if (type === 'stdout' || type === 'stderr') {
        set((state) => ({ output: state.output + text + '\n' }));
      } else if (type === 'done' || type === 'error') {
        if (runId === currentRunId) {
          if (type === 'error') {
            set((state) => ({ output: state.output + '\nError:\n' + error + '\n' }));
          }
          // Classify error category for future error typology analysis
          const errorCategory: ErrorCategory = type === 'error'
            ? (error && /SyntaxError|IndentationError/.test(error) ? 'syntax' : 'runtime')
            : 'none';
          const isFirstRun = sessionCodeRunCount === 1;
          // Log code execution result with error classification
          useLoggerStore.getState().logEvent({
            type: 'code_result',
            content: get().output,
            isFirstRun,
            errorCategory,
          });
          set({ isRunning: false });
        }
      }
    };
  },

  runCode: (code: string) => {
    if (!worker || !get().isReady) return;
    
    currentRunId++;
    sessionCodeRunCount++;
    set({ isRunning: true, output: '', verificationResult: null }); // clear output & previous result on new run
    // Log code submission, marking whether this is the first run in the session
    const isFirstRun = sessionCodeRunCount === 1;
    useLoggerStore.getState().logEvent({ type: 'code_run', content: code, isFirstRun });
    worker.postMessage({ type: 'run', code, runId: currentRunId });
  },

  stopCode: () => {
    if (worker) {
      // The only way to stop a while True loop in a worker is to terminate the worker
      worker.terminate();
      worker = null;
      set((state) => ({ 
        isRunning: false, 
        output: state.output + '\n[Выполнение остановлено пользователем]\n',
        isReady: false 
      }));
      // Restart the worker
      get().initWorker();
    }
  },

  checkAnswer: (task: Task) => {
    const state = get();
    if (!state.output.trim() || state.isRunning) return;

    const newAttempts = state.attempts + 1;
    const isCorrect = verifyAnswer(state.output, task.expectedAnswer);

    // Extract actual answer (last non-empty line)
    const lines = state.output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const actual = lines[lines.length - 1] ?? '';

    const result: VerificationResult = {
      isCorrect,
      expected: task.expectedAnswer,
      actual,
      attempt: newAttempts,
    };

    set({
      verificationResult: result,
      attempts: newAttempts,
      isSolved: isCorrect || state.isSolved, // once solved, stays solved
    });

    // Update firstRunCorrect on session if this is the first check
    if (newAttempts === 1) {
      const loggerState = useLoggerStore.getState();
      if (loggerState.currentSession) {
        useLoggerStore.setState({
          currentSession: {
            ...loggerState.currentSession,
            firstRunCorrect: isCorrect,
          },
        });
      }
    }

    // Dispatch event so the tutor can react
    window.dispatchEvent(
      new CustomEvent('answer-checked', { detail: result })
    );
  },

  resetVerification: () => {
    sessionCodeRunCount = 0; // Reset run counter for new task
    set({
      verificationResult: null,
      attempts: 0,
      isSolved: false,
      output: '',
    });
  },

  clearOutput: () => {
    set({ output: '', verificationResult: null });
  }
}));
