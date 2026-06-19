import { create } from 'zustand';
import type { Task } from '../core/tutor/types';
import {
  generateSessionId,
  loadSessions,
  saveSessions,
  exportSessionsToCSV,
  downloadCSV,
} from '../core/logger';
import type { Session, LogEvent, Condition, SessionResult } from '../core/logger';

interface LoggerState {
  currentSession: Session | null;
  allSessions: Session[];
  condition: Condition;

  init: () => void;
  startSession: (task: Task) => void;
  logEvent: (event: Omit<LogEvent, 'timestamp'>) => void;
  endSession: (result: SessionResult, finalCode: string) => void;
  exportCSV: () => void;
  clearAllSessions: () => void;
}

export const useLoggerStore = create<LoggerState>((set, get) => ({
  currentSession: null,
  allSessions: [],
  // Kept on the Session/CSV schema for future НИР-3 A/B experiment groundwork,
  // but the in-app toggle was removed — always logged as 'with_tutor' for now.
  condition: 'with_tutor',

  init: () => {
    const sessions = loadSessions();
    set({ allSessions: sessions });
  },

  startSession: (task: Task) => {
    const state = get();

    const session: Session = {
      id: generateSessionId(),
      taskId: task.id,
      taskNumber: task.number,
      taskTitle: task.title,
      condition: state.condition,
      startedAt: new Date().toISOString(),
      endedAt: null,
      events: [],
      finalCode: '',
      result: null,
      hintCount: 0,
      firstRunCorrect: null,
      dialogCompleted: null,
      voiceQueryCount: 0,
    };

    set({ currentSession: session });
  },

  logEvent: (event: Omit<LogEvent, 'timestamp'>) => {
    const state = get();
    if (!state.currentSession) return;

    const fullEvent: LogEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    set({
      currentSession: {
        ...state.currentSession,
        events: [...state.currentSession.events, fullEvent],
      },
    });
  },

  endSession: (result: SessionResult, finalCode: string) => {
    const state = get();
    if (!state.currentSession) return;

    const finished: Session = {
      ...state.currentSession,
      endedAt: new Date().toISOString(),
      finalCode,
      result,
    };

    const updated = [...state.allSessions, finished];
    saveSessions(updated);

    set({
      currentSession: null,
      allSessions: updated,
    });
  },

  exportCSV: () => {
    const { allSessions } = get();
    if (allSessions.length === 0) return;

    const csv = exportSessionsToCSV(allSessions);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadCSV(csv, `voicetutor_sessions_${timestamp}.csv`);
  },

  clearAllSessions: () => {
    saveSessions([]);
    set({ allSessions: [] });
  },
}));
