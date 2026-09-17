import { useRef, useState } from 'react';
import type { Task } from '../../core/tutor/types';
import { useEditorStore } from '../../store/editorStore';
import { useExperimentStore } from '../../store/experimentStore';
import { useTutorStore } from '../../store/tutorStore';
import { playAudio, startPcmRecording, synthesizeSpeech, transcribePcm, type PcmRecording } from '../../core/speech/yandexSpeech';

type VoicePhase = 'idle' | 'recording' | 'stt' | 'thinking' | 'tts' | 'playing' | 'error';

export function ExperimentTutorPanel({ task }: { task: Task }) {
  const mode = useExperimentStore((state) => state.activeMode);
  const log = useExperimentStore((state) => state.logExperimentEvent);
  const hints = useTutorStore((state) => state.hints);
  const loading = useTutorStore((state) => state.isLoading);
  const error = useTutorStore((state) => state.error);
  const requestHint = useTutorStore((state) => state.requestHint);
  const [draft, setDraft] = useState('');
  const recording = useRef<PcmRecording | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [soundTipDismissed, setSoundTipDismissed] = useState(false);

  /** Full voice pipeline: toggle recording → STT → LLM → TTS → playback */
  const toggleRecording = async () => {
    const session = useExperimentStore.getState().session;
    const authToken = useExperimentStore.getState().authToken;
    if (!session || !authToken) return;

    // ── Start recording ──
    if (!recording.current) {
      try {
        recording.current = await startPcmRecording();
        setVoicePhase('recording');
        setVoiceError(null);
        await log('stt_start', { taskId: task.id, speechStartedAt: new Date().toISOString() });
      } catch {
        await log('stt_error', { taskId: task.id, errorType: 'microphone_unavailable' });
        setVoiceError('Микрофон недоступен');
        setVoicePhase('error');
      }
      return;
    }

    // ── Stop recording → auto pipeline ──
    const speechFinishedAt = new Date().toISOString();
    const captured = await recording.current.stop();
    recording.current = null;

    // 1. STT
    setVoicePhase('stt');
    const sttStartedAt = new Date().toISOString();
    let transcript: string;
    try {
      transcript = await transcribePcm(captured.pcm, captured.sampleRate, session.participantId, authToken);
      const sttFinishedAt = new Date().toISOString();
      await log('stt_result', { taskId: task.id, transcript, confidence: null,
        speechFinishedAt, sttStartedAt, sttFinishedAt, audioDurationMs: captured.durationMs, status: 'success' });
    } catch {
      await log('stt_error', { taskId: task.id, speechFinishedAt, sttStartedAt,
        sttFinishedAt: new Date().toISOString(), errorType: 'speechkit_unavailable' });
      setVoiceError('Не удалось распознать речь, попробуйте ещё раз');
      setVoicePhase('error');
      return;
    }

    if (!transcript.trim()) {
      setVoiceError('Не удалось распознать речь, попробуйте ещё раз');
      setVoicePhase('error');
      return;
    }

    // 2. LLM
    setVoicePhase('thinking');
    const response = await requestHint(task, useEditorStore.getState().code, transcript);
    if (!response) {
      setVoicePhase('idle');
      return;
    }

    // 3. TTS + playback
    setVoicePhase('tts');
    const ttsStartedAt = new Date().toISOString();
    await log('tts_start', { taskId: task.id, ttsStartedAt, text: response });
    try {
      const audio = await synthesizeSpeech(response, session.participantId, authToken);
      await log('tts_result', { taskId: task.id, ttsStartedAt, ttsFinishedAt: new Date().toISOString(), text: response, status: 'success' });
      setVoicePhase('playing');
      await playAudio(audio,
        () => { void log('audio_playback_start', { taskId: task.id, audioPlaybackStartedAt: new Date().toISOString() }); },
        () => { void log('audio_playback_end', { taskId: task.id, audioPlaybackFinishedAt: new Date().toISOString() }); });
      setVoicePhase('idle');
    } catch {
      await log('tts_error', { taskId: task.id, ttsStartedAt, ttsFinishedAt: new Date().toISOString(), errorType: 'speechkit_unavailable' });
      setVoiceError('Не удалось автоматически воспроизвести ответ. Проверьте звук и разрешение браузера.');
      setVoicePhase('error');
    }
  };

  /** Text-mode send */
  const send = async () => {
    const sentText = draft.trim();
    if (!sentText || loading) return;
    await requestHint(task, useEditorStore.getState().code, sentText);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const micBusy = voicePhase !== 'idle' && voicePhase !== 'recording' && voicePhase !== 'error';
  const isProcessing = voicePhase === 'stt' || voicePhase === 'thinking' || voicePhase === 'tts';

  // ── Voice-mode status label ──
  const statusLabel = (() => {
    switch (voicePhase) {
      case 'recording': return 'Говорите. Нажмите ещё раз, чтобы отправить';
      case 'stt': return 'Распознаю речь…';
      case 'thinking': return 'Думаю…';
      case 'tts': return 'Озвучиваю ответ…';
      case 'playing': return 'Тьютор отвечает…';
      case 'error': return null;
      default: return 'Нажмите, чтобы говорить';
    }
  })();

  /* ── AI Avatar (SVG) ── */
  const aiAvatar = (
    <div className={`vt-ai-avatar ${voicePhase === 'playing' ? 'vt-ai-avatar--speaking' : ''}`}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" fill="#1e1e2e" stroke="#89b4fa" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="14" fill="rgba(137,180,250,0.1)" />
        {/* Face */}
        <circle cx="14" cy="17" r="2" fill="#89b4fa" />
        <circle cx="26" cy="17" r="2" fill="#89b4fa" />
        <path d="M14 25 Q20 29 26 25" stroke="#89b4fa" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Antenna */}
        <line x1="20" y1="6" x2="20" y2="2" stroke="#89b4fa" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="1.5" r="1.5" fill="#89b4fa" />
      </svg>
    </div>
  );

  return <div className="tutor-panel" style={{ padding: 16, boxSizing: 'border-box' }}>
    <h3>AI-тьютор · {mode === 'voice' ? 'голосовой ввод' : 'текстовый ввод'}</h3>

    {/* Sound tip — shown once on first voice-mode entry */}
    {mode === 'voice' && !soundTipDismissed && (
      <div className="vt-sound-tip">
        <span>🔊 Проверьте, что звук устройства включён — ответы тьютора воспроизводятся голосом.</span>
        <button type="button" onClick={() => setSoundTipDismissed(true)} className="vt-sound-tip__close" aria-label="Закрыть">✕</button>
      </div>
    )}

    {/* Hints / history — shown in BOTH text and voice modes */}
    <div className="hints-section" style={{ flex: 1 }}>
      {hints.map((hint, index) => <div className="hint-item" key={index}>{hint}</div>)}
      {loading && <div className="hint-item">Думаю…</div>}
    </div>

    {error && <div style={{ color: '#f38ba8', marginBottom: 8 }}>{error}</div>}
    {voiceError && <div style={{ color: '#f38ba8', marginBottom: 8, fontSize: '0.9em' }}>{voiceError}</div>}

    {mode === 'voice' ? (
      <div className="vt-voice-controls">
        {/*
          Stable-height AI status area — always rendered to prevent layout jitter.
          Content changes based on phase but the container stays the same height.
        */}
        <div className="vt-ai-status">
          {aiAvatar}
          {voicePhase === 'playing' && (
            <div className="vt-speaking-waves">
              <span className="vt-wave" /><span className="vt-wave" /><span className="vt-wave" /><span className="vt-wave" /><span className="vt-wave" />
            </div>
          )}
          {isProcessing && (
            <div className="vt-processing-dots">
              <span className="vt-dot" /><span className="vt-dot" /><span className="vt-dot" />
            </div>
          )}
        </div>

        {/* Mic button */}
        <button
          type="button"
          className={`vt-mic-btn ${voicePhase === 'recording' ? 'vt-mic-btn--recording' : ''}`}
          onClick={toggleRecording}
          disabled={loading || micBusy}
          aria-label={voicePhase === 'recording' ? 'Остановить запись' : 'Начать запись'}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>

        {/* Status hint */}
        <span className="vt-mic-hint">{statusLabel ?? '\u00A0'}</span>
      </div>
    ) : (
      <div className="vt-text-input-area">
        <textarea
          className="vt-text-input"
          aria-label="Вопрос тьютору"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос тьютору…"
          rows={3}
        />
        <button
          type="button"
          className="vt-send-btn"
          onClick={send}
          disabled={!draft.trim() || loading}
          aria-label="Отправить"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    )}
  </div>;
}
