import { useEffect } from 'react';
import { useTutorStore } from '../store/tutorStore';
import { useEditorStore } from '../store/editorStore';

export function VoiceButton() {
  const isMuted = useTutorStore((s) => s.isMuted);
  const isLoading = useTutorStore((s) => s.isLoading);
  const toggleMute = useTutorStore((s) => s.toggleMute);
  const initAudio = useTutorStore((s) => s.initAudio);
  const selectedTaskId = useEditorStore((s) => s.selectedTaskId);

  const disabled = !selectedTaskId || isLoading;

  useEffect(() => {
    // Initialize audio recognition engine once
    initAudio();
  }, [initAudio]);

  const handleClick = () => {
    if (disabled) return;
    toggleMute();
  };

  return (
    <button
      className={`voice-btn ${isMuted ? 'is-muted' : 'is-listening'}`}
      onClick={handleClick}
      disabled={disabled}
      title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
    >
      <span className="voice-btn__icon">{isMuted ? '🔇' : '🎙'}</span>
      <span>{isMuted ? 'Микрофон выкл.' : 'Слушаю вас...'}</span>
    </button>
  );
}
