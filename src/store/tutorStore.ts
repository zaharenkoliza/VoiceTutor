import { create } from 'zustand';
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

  error: string | null;

  requestHint: (task: Task, code: string, voiceQuestion?: string) => Promise<void>;
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
  error: null,

  initAudio: () => {
    initSpeechRecognition(
      (text: string, isFinal: boolean) => {
        const state = get();
        // If AI is speaking or mic is muted, ignore input
        if (state.isMuted || state.isSpeaking) return;

        if (isFinal) {
          set({ interimTranscript: '' });
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

  requestHint: async (task: Task, code: string, voiceQuestion?: string) => {
    const state = get();
    if (state.isLoading) return;

    const codeContent = code.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).join('').trim();
    if (!codeContent && !voiceQuestion) return;

    set({ isLoading: true, error: null });

    try {
      const userMessage = buildUserMessage(task, code, voiceQuestion);
      const systemPrompt = buildSystemPrompt();

      const messages: DialogMessage[] = [
        ...state.dialogHistory,
        { role: 'user', content: userMessage },
      ];

      const response = await sendToAI(systemPrompt, messages);

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
