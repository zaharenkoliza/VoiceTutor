import { create } from 'zustand';
import { tasks } from '../data/tasks';
import { useRunnerStore } from './runnerStore';

interface EditorState {
  selectedTaskId: string | null;
  code: string;
  taskQueue: string[]; // List of task IDs for the current session
  codeByTaskId: Record<string, string>; // Per-task code, kept so navigating back/forward preserves progress

  selectTask: (taskId: string) => void;
  setCode: (code: string) => void;
  setQueue: (taskIds: string[]) => void;
  nextTask: () => void;
  prevTask: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedTaskId: null,
  code: '',
  taskQueue: [],
  codeByTaskId: {},

  selectTask: (taskId: string) => {
    const state = get();
    const task = tasks.find((t) => t.id === taskId);
    useRunnerStore.getState().resetVerification();
    set({
      selectedTaskId: taskId,
      code: task ? (state.codeByTaskId[taskId] ?? '') : '',
    });
  },

  setCode: (code: string) => {
    const taskId = get().selectedTaskId;
    set((state) => ({
      code,
      codeByTaskId: taskId ? { ...state.codeByTaskId, [taskId]: code } : state.codeByTaskId,
    }));
  },

  setQueue: (taskIds: string[]) => {
    if (taskIds.length > 0) {
      set({ taskQueue: taskIds });
      get().selectTask(taskIds[0]);
    }
  },

  nextTask: () => {
    const state = get();
    if (!state.selectedTaskId || state.taskQueue.length === 0) return;

    const currentIndex = state.taskQueue.indexOf(state.selectedTaskId);
    if (currentIndex >= 0 && currentIndex < state.taskQueue.length - 1) {
      get().selectTask(state.taskQueue[currentIndex + 1]);
    } else {
      // Finished variant
      set({ selectedTaskId: null, taskQueue: [] });
    }
  },

  prevTask: () => {
    const state = get();
    if (!state.selectedTaskId || state.taskQueue.length === 0) return;

    const currentIndex = state.taskQueue.indexOf(state.selectedTaskId);
    if (currentIndex > 0) {
      get().selectTask(state.taskQueue[currentIndex - 1]);
    }
  },
}));
