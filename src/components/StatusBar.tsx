import { useEffect } from 'react';
import { useTutorStore } from '../store/tutorStore';
import { VoiceButton } from './VoiceButton';

export function StatusBar() {
  const isLoading = useTutorStore((s) => s.isLoading);
  const isSpeaking = useTutorStore((s) => s.isSpeaking);
  const isMuted = useTutorStore((s) => s.isMuted);
  const error = useTutorStore((s) => s.error);
  const clearError = useTutorStore((s) => s.clearError);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const getStatusText = (): string => {
    if (isLoading) return 'Анализирую код...';
    if (isSpeaking) return 'Говорю...';
    if (!isMuted) return 'Микрофон включен, слушаю вас...';
    return 'Готов помочь (микрофон выключен)';
  };

  const getStatusClass = (): string => {
    if (isLoading) return 'loading';
    if (isSpeaking) return 'speaking';
    if (!isMuted) return 'listening';
    if (error) return 'error';
    return '';
  };

  return (
    <>
      <div className="status-bar">
        <div className="status-bar-content">
          <div className="status-bar__left">
            <div className="status-indicator">
              <div className={`status-dot ${getStatusClass()}`} />
              <span>{getStatusText()}</span>
            </div>
          </div>
          <div className="status-bar__right">
            <VoiceButton />
          </div>
        </div>
      </div>
      {error && (
        <div className="error-toast" onClick={clearError} role="alert">
          {error}
        </div>
      )}
    </>
  );
}
