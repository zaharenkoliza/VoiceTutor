import { create } from 'zustand';
import { useLoggerStore } from './loggerStore';
import type { DialogMessage, Task } from '../core/tutor/types';
import { buildSystemPrompt, buildUserMessage } from '../core/tutor/prompt';
import { sendToAI } from '../core/tutor/anthropic';
import { speak, stopSpeaking } from '../core/speech/tts';
import { 
  initSpeechRecognition, 
  startContinuousListening, 
  stopContinuousListening,
  pauseContinuousListening,
  resumeContinuousListening
} from '../core/speech/stt';

interface TutorState {
  dialogHistory: DialogMessage[];
  hints: string[];
  isLoading: boolean;
  isSpeaking: boolean;
  
  // Audio state
  isMuted: boolean;       // User explicitly muted the mic
  interimTranscript: string; // What user is currently saying
  lastVoiceConfidence: number | undefined; // STT confidence for last voice query

  error: string | null;

  requestHint: (task: Task, code: string, voiceQuestion?: string, verificationContext?: { isCorrect: boolean; attempt: number }, isIdleCheck?: boolean) => Promise<void>;
  toggleMute: () => void;
  initAudio: () => void;
  clearHistory: () => void;
  setIsSpeaking: (v: boolean) => void;
  clearError: () => void;
  interruptAI: () => void;
}

export const useTutorStore = create<TutorState>((set, get) => ({
  dialogHistory: [],
  hints: [],
  isLoading: false,
  isSpeaking: false,
  
  isMuted: true, // Start muted until user joins "call"
  interimTranscript: '',
  lastVoiceConfidence: undefined,
  error: null,

  initAudio: () => {
    initSpeechRecognition(
      (text: string, isFinal: boolean, confidence?: number) => {
        const state = get();
        // If AI is speaking or mic is muted, ignore input
        if (state.isMuted || state.isSpeaking) return;

        if (isFinal) {
          set({ interimTranscript: '', lastVoiceConfidence: confidence });
          // Stop AI if it's talking (user interrupted)
          if (state.isSpeaking) {
            get().interruptAI();
          }
          // We need the latest code/task, so we dispatch a custom event or let the UI handle it.
          // Better yet, we can store a global ref to task/code, or just emit an event
          window.dispatchEvent(new CustomEvent('voice-question-ready', { detail: text }));
        } else {
          set({ interimTranscript: text });
        }
      },
      (err: string) => set({ error: err })
    );
  },

  toggleMute: () => {
    const state = get();
    if (state.isMuted) {
      startContinuousListening();
      set({ isMuted: false, error: null });
    } else {
      stopContinuousListening();
      set({ isMuted: true, interimTranscript: '' });
    }
  },

  interruptAI: () => {
    stopSpeaking();
    set({ isSpeaking: false });
    resumeContinuousListening();
  },

  requestHint: async (task: Task, code: string, voiceQuestion?: string, verificationContext?: { isCorrect: boolean; attempt: number }, isIdleCheck?: boolean) => {
    const state = get();
    if (state.isLoading || state.isSpeaking) return;

    const codeContent = code.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).join('').trim();
    if (!codeContent && !voiceQuestion && !verificationContext && !isIdleCheck) return;

    set({ isLoading: true, error: null });

    try {
      // Log voice query if present, with STT confidence and timestamp for future WER/CER/latency analysis
      if (voiceQuestion) {
        const sttEndTimestamp = new Date().toISOString();
        useLoggerStore.getState().logEvent({
          type: 'voice_query',
          content: voiceQuestion,
          confidence: state.lastVoiceConfidence,
          sttEndTimestamp,
        });
        // Increment voiceQueryCount on the current session
        const loggerState = useLoggerStore.getState();
        if (loggerState.currentSession) {
          useLoggerStore.setState({
            currentSession: {
              ...loggerState.currentSession,
              voiceQueryCount: loggerState.currentSession.voiceQueryCount + 1,
            },
          });
        }
      }

      const userMessage = buildUserMessage(task, code, voiceQuestion, verificationContext, isIdleCheck);
      const systemPrompt = buildSystemPrompt();

      const messages: DialogMessage[] = [
        ...state.dialogHistory,
        { role: 'user', content: userMessage },
      ];

      const aiStartTime = Date.now();
      const response = await sendToAI(systemPrompt, messages);
      const latencyMs = Date.now() - aiStartTime;

      // Log tutor response with latency
      useLoggerStore.getState().logEvent({ type: 'tutor_response', content: response, latencyMs });

      // Increment hintCount on the current session
      const loggerState = useLoggerStore.getState();
      if (loggerState.currentSession) {
        useLoggerStore.setState({
          currentSession: {
            ...loggerState.currentSession,
            hintCount: loggerState.currentSession.hintCount + 1,
          },
        });
      }

      set((prev) => ({
        dialogHistory: [
          ...prev.dialogHistory,
          { role: 'user' as const, content: userMessage },
          { role: 'assistant' as const, content: response },
        ],
        hints: [...prev.hints, response],
        isLoading: false,
      }));

      // Speak response
      // Mute microphone temporarily while AI speaks to prevent echo loop
      set({ isSpeaking: true });
      pauseContinuousListening();
      try {
        await speak(response);
      } finally {
        // Only resume if we are still marked as speaking (not interrupted)
        if (get().isSpeaking) {
          set({ isSpeaking: false });
          resumeContinuousListening();
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      set({ isLoading: false, error: errorMessage });
    }
  },

  clearHistory: () => {
    stopSpeaking();
    set({
      dialogHistory: [],
      hints: [],
      isLoading: false,
      isSpeaking: false,
      interimTranscript: '',
      lastVoiceConfidence: undefined,
      error: null,
    });
  },

  setIsSpeaking: (v: boolean) => {
    set({ isSpeaking: v });
  },

  clearError: () => {
    set({ error: null });
  },
}));
