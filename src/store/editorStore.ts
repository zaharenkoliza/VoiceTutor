import { create } from 'zustand';
import { tasks } from '../data/tasks';

interface EditorState {
  selectedTaskId: string | null;
  code: string;
  taskQueue: string[]; // List of task IDs for the current session

  selectTask: (taskId: string) => void;
  setCode: (code: string) => void;
  setQueue: (taskIds: string[]) => void;
  nextTask: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  selectedTaskId: null,
  code: '',
  taskQueue: [],

  selectTask: (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    set({
      selectedTaskId: taskId,
      code: task?.starterCode ?? '',
    });
  },

  setCode: (code: string) => {
    set({ code });
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
  }
}));
