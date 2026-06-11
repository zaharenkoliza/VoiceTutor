import { create } from 'zustand';

interface RunnerState {
  isRunning: boolean;
  output: string;
  isReady: boolean;
  
  runCode: (code: string) => void;
  stopCode: () => void;
  clearOutput: () => void;
  initWorker: () => void;
}

let worker: Worker | null = null;
let currentRunId = 0;

export const useRunnerStore = create<RunnerState>((set, get) => ({
  isRunning: false,
  output: '',
  isReady: false,

  initWorker: () => {
    if (worker) {
      worker.terminate();
    }
    worker = new Worker('/pyodideWorker.js');
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
          set({ isRunning: false });
        }
      }
    };
  },

  runCode: (code: string) => {
    if (!worker || !get().isReady) return;
    
    currentRunId++;
    set({ isRunning: true, output: '' }); // clear output on new run
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

  clearOutput: () => {
    set({ output: '' });
  }
}));
