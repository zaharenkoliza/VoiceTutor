import { useRef, useState } from 'react';
import type { Task } from '../../core/tutor/types';
import { useEditorStore } from '../../store/editorStore';
import { useExperimentStore } from '../../store/experimentStore';
import { useTutorStore } from '../../store/tutorStore';
import { playAudio, startPcmRecording, synthesizeSpeech, transcribePcm, type PcmRecording } from '../../core/speech/yandexSpeech';

export function ExperimentTutorPanel({ task }: { task: Task }) {
  const mode = useExperimentStore((state) => state.activeMode);
  const log = useExperimentStore((state) => state.logExperimentEvent);
  const hints = useTutorStore((state) => state.hints);
  const loading = useTutorStore((state) => state.isLoading);
  const error = useTutorStore((state) => state.error);
  const requestHint = useTutorStore((state) => state.requestHint);
  const [draft, setDraft] = useState('');
  const [original, setOriginal] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const sttReceived = useRef<number | null>(null);
  const recording = useRef<PcmRecording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = async () => {
    const session = useExperimentStore.getState().session;
    const authToken = useExperimentStore.getState().authToken;
    if (!session || !authToken) return;
    if (!recording.current) {
      try {
        recording.current = await startPcmRecording();
        setIsRecording(true);
        await log('stt_start', { taskId: task.id, speechStartedAt: new Date().toISOString() });
      } catch {
        await log('stt_error', { taskId: task.id, errorType: 'microphone_unavailable' });
      }
      return;
    }
    const speechFinishedAt = new Date().toISOString();
    const captured = await recording.current.stop();
    recording.current = null;
    setIsRecording(false);
    const sttStartedAt = new Date().toISOString();
    try {
      const transcript = await transcribePcm(captured.pcm, captured.sampleRate, session.participantId, authToken);
      const sttFinishedAt = new Date().toISOString();
      setOriginal(transcript); setDraft(transcript); setConfidence(null); sttReceived.current = performance.now();
      await log('stt_result', { taskId: task.id, transcript, confidence: null,
        speechFinishedAt, sttStartedAt, sttFinishedAt, audioDurationMs: captured.durationMs, status: 'success' });
    } catch {
      await log('stt_error', { taskId: task.id, speechFinishedAt, sttStartedAt,
        sttFinishedAt: new Date().toISOString(), errorType: 'speechkit_unavailable' });
    }
  };

  const send = async () => {
    const sentText = draft.trim();
    if (!sentText || loading) return;
    const now = performance.now();
    if (mode === 'voice' && original !== null) {
      await log('stt_confirm', {
        originalTranscript: original,
        submittedText: sentText,
        confidence,
        edited: original.trim() !== sentText,
        editAndConfirmDurationMs: sttReceived.current == null ? null : now - sttReceived.current,
      });
    }
    const response = await requestHint(task, useEditorStore.getState().code, sentText);
    if (mode === 'voice' && response) {
      const session = useExperimentStore.getState().session;
      const authToken = useExperimentStore.getState().authToken;
      if (session && authToken) {
        const ttsStartedAt = new Date().toISOString();
        await log('tts_start', { taskId: task.id, ttsStartedAt, text: response });
        try {
          const audio = await synthesizeSpeech(response, session.participantId, authToken);
          await log('tts_result', { taskId: task.id, ttsStartedAt, ttsFinishedAt: new Date().toISOString(), text: response, status: 'success' });
          await playAudio(audio,
            () => { void log('audio_playback_start', { taskId: task.id, audioPlaybackStartedAt: new Date().toISOString() }); },
            () => { void log('audio_playback_end', { taskId: task.id, audioPlaybackFinishedAt: new Date().toISOString() }); });
        } catch {
          await log('tts_error', { taskId: task.id, ttsStartedAt, ttsFinishedAt: new Date().toISOString(), errorType: 'speechkit_unavailable' });
        }
      }
    }
    setDraft('');
    setOriginal(null);
    setConfidence(null);
  };

  return <div className="tutor-panel" style={{ padding: 16, boxSizing: 'border-box' }}>
    <h3>AI-тьютор · {mode === 'voice' ? 'голосовой ввод' : 'текстовый ввод'}</h3>
    <div className="hints-section" style={{ flex: 1 }}>
      {hints.map((hint, index) => <div className="hint-item" key={index}>{hint}</div>)}
      {loading && <div className="hint-item">Думаю…</div>}
    </div>
    {error && <div style={{ color: '#f38ba8', marginBottom: 8 }}>{error}</div>}
    {mode === 'voice' && <button type="button" onClick={toggleRecording} disabled={loading}>
      {isRecording ? 'Закончить запись' : 'Начать запись реплики'}
    </button>}
    <textarea
      aria-label={mode === 'voice' ? 'Подтверждённый текст вопроса' : 'Вопрос тьютору'}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder={mode === 'voice' ? 'Здесь появится транскрипция — её можно исправить' : 'Введите вопрос'}
      rows={4}
      style={{ width: '100%', marginTop: 8, boxSizing: 'border-box' }}
    />
    <button type="button" onClick={send} disabled={!draft.trim() || loading || (mode === 'voice' && original === null)}>
      Подтвердить и отправить
    </button>
  </div>;
}
