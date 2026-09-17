import { create } from 'zustand';
import type { DialogMessage, Task } from '../core/tutor/types';
import { buildUserMessage } from '../core/tutor/prompt';
import { createSession, fetchLLMConfig, sendToAI } from '../core/tutor/llmClient';
import { speak, stopSpeaking } from '../core/speech/tts';
import { 
  initSpeechRecognition, 
  startContinuousListening, 
  stopContinuousListening,
  pauseContinuousListening,
  resumeContinuousListening
} from '../core/speech/stt';
import { useExperimentStore } from './experimentStore';

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

  requestHint: (task: Task, code: string, voiceQuestion?: string, verificationContext?: { isCorrect: boolean; attempt: number }) => Promise<string | undefined>;
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
        const expState = useExperimentStore.getState();

        // If in text mode or mic is muted or AI is speaking, ignore
        if (expState.session && expState.activeMode === 'text') return;
        if (state.isMuted || state.isSpeaking) return;

        if (isFinal) {
          set({ interimTranscript: '', lastVoiceConfidence: confidence });
          if (state.isSpeaking) {
            get().interruptAI();
          }
          expState.logExperimentEvent('stt_result', {
            originalTranscript: text,
            confidence: confidence ?? null,
            isFinal: true,
          });
          if (expState.session) {
            window.dispatchEvent(new CustomEvent('voice-transcript-ready', {
              detail: { text, confidence: confidence ?? null },
            }));
          } else {
            window.dispatchEvent(new CustomEvent('voice-question-ready', { detail: text }));
          }
        } else {
          set({ interimTranscript: text });
        }
      },
      (err: string) => {
        set({ error: err });
        useExperimentStore.getState().logExperimentEvent('stt_error', { error: err });
      }
    );
  },

  toggleMute: () => {
    const state = get();
    const expState = useExperimentStore.getState();

    // Do not allow unmuting if mode is text in experiment
    if (expState.session && expState.activeMode === 'text') {
      return;
    }

    if (state.isMuted) {
      startContinuousListening();
      set({ isMuted: false, error: null });
      expState.logExperimentEvent('stt_start', { mode: 'continuous' });
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

  requestHint: async (task: Task, code: string, voiceQuestion?: string, verificationContext?: { isCorrect: boolean; attempt: number }) => {
    const state = get();
    if (state.isLoading || state.isSpeaking) return;

    const codeContent = code.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#')).join('').trim();
    if (!codeContent && !voiceQuestion && !verificationContext) return;

    set({ isLoading: true, error: null });

    const expState = useExperimentStore.getState();
    const requestId = crypto.randomUUID();

    try {
      if (voiceQuestion) {
        // The experimental confirmation UI logs original and submitted text.
      }

      const userMessage = buildUserMessage(task, code, voiceQuestion, verificationContext);
      const messages: DialogMessage[] = [
        ...state.dialogHistory,
        { role: 'user', content: userMessage },
      ];

      expState.logExperimentEvent('tutor_request', {
        taskId: task.id,
        question: voiceQuestion ?? null,
        inputMode: expState.session ? expState.activeMode : 'voice',
        userMessage,
        hasVerificationContext: !!verificationContext,
      }, requestId);

      const participantId = expState.session?.participantId || 'demo';
      const authToken = expState.authToken ?? (await createSession(participantId)).token;
      const expectedConfig = expState.session?.config.llmConfig ?? await fetchLLMConfig();
      const responseObj = await sendToAI(messages, authToken, participantId, expectedConfig);
      const response = responseObj.content;

      expState.logExperimentEvent('tutor_response', {
        content: response,
        latencyMs: responseObj.latencyMs,
        model: responseObj.model,
        technicalRetryCount: responseObj.retryCount,
        usage: responseObj.usage ?? null,
      }, requestId);

      set((prev) => ({
        dialogHistory: [
          ...prev.dialogHistory,
          { role: 'user' as const, content: userMessage },
          { role: 'assistant' as const, content: response },
        ],
        hints: [...prev.hints, response],
        isLoading: false,
      }));

      // Research voice mode is synthesized explicitly through SpeechKit by its UI.
      // Browser TTS remains only for the legacy free-training screen.
      const isExpBlock = expState.activeBlockId === 'block1' || expState.activeBlockId === 'block2';
      const shouldSpeak = !expState.session && !isExpBlock;

      if (shouldSpeak) {
        set({ isSpeaking: true });
        pauseContinuousListening();
        try {
          await speak(response);
        } finally {
          if (get().isSpeaking) {
            set({ isSpeaking: false });
            resumeContinuousListening();
          }
        }
      }
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      set({ isLoading: false, error: errorMessage });
      expState.logExperimentEvent('tutor_error', { error: errorMessage }, requestId);
      return undefined;
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
