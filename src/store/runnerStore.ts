import { create } from 'zustand';
import type { Task } from '../core/tutor/types';
import { verifyAnswer, type VerificationResult } from '../core/tutor/verifier';
import type { ErrorCategory } from '../core/logger';
import { useExperimentStore } from './experimentStore';

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
  checkAnswer: (task: Task, submittedAnswerOverride?: string) => void;
  resetVerification: () => void;
}

let worker: Worker | null = null;
let currentRunId = 0;
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
          const errorCategory: ErrorCategory = type === 'error'
            ? (error && /SyntaxError|IndentationError/.test(error) ? 'syntax' : 'runtime')
            : 'none';
          const isFirstRun = sessionCodeRunCount === 1;

          useExperimentStore.getState().logExperimentEvent('code_result', {
            output: get().output,
            isFirstRun,
            errorCategory,
            hasError: type === 'error',
            errorText: error ?? null,
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
    set({ isRunning: true, output: '', verificationResult: null });

    const isFirstRun = sessionCodeRunCount === 1;
    useExperimentStore.getState().logExperimentEvent('code_run', {
      code,
      runId: currentRunId,
      isFirstRun,
      codeLength: code.length,
      lineCount: code.split('\n').length,
    });

    worker.postMessage({ type: 'run', code, runId: currentRunId });
  },

  stopCode: () => {
    if (worker) {
      worker.terminate();
      worker = null;
      set((state) => ({ 
        isRunning: false, 
        output: state.output + '\n[Выполнение остановлено пользователем]\n',
        isReady: false 
      }));
      useExperimentStore.getState().logExperimentEvent('code_stop', { runId: currentRunId });
      get().initWorker();
    }
  },

  checkAnswer: (task: Task, submittedAnswerOverride?: string) => {
    const state = get();
    if (state.isRunning) return;

    let answerToCheck = submittedAnswerOverride?.trim();

    if (!answerToCheck) {
      const lines = state.output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      answerToCheck = lines[lines.length - 1] ?? '';
    }

    if (!answerToCheck) return;

    const newAttempts = state.attempts + 1;
    const isCorrect = verifyAnswer(answerToCheck, task.expectedAnswer);

    const result: VerificationResult = {
      isCorrect,
      expected: task.expectedAnswer,
      actual: answerToCheck,
      attempt: newAttempts,
    };

    set({
      verificationResult: result,
      attempts: newAttempts,
      isSolved: isCorrect || state.isSolved,
    });

    useExperimentStore.getState().submitTaskAnswer(answerToCheck, isCorrect);

    window.dispatchEvent(
      new CustomEvent('answer-checked', { detail: result })
    );
  },

  resetVerification: () => {
    sessionCodeRunCount = 0;
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
