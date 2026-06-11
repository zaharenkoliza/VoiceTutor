import { useEffect, useRef } from 'react';
import { TutorAvatar } from './TutorAvatar';
import { useTutorStore } from '../store/tutorStore';

export function TutorPanel() {
  const hints = useTutorStore((s) => s.hints);
  const isLoading = useTutorStore((s) => s.isLoading);
  const interimTranscript = useTutorStore((s) => s.interimTranscript);
  const hintsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest hint
  useEffect(() => {
    if (hintsEndRef.current) {
      hintsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [hints]);

  return (
    <div className="tutor-panel">
      <div className="tutor-avatar-section">
        <TutorAvatar />
        <div className="tutor-label">AI-репетитор</div>
      </div>
      <div className="hints-section" id="hints-log">
        {hints.length === 0 && !isLoading ? (
          <div className="hints-empty">
            Начните писать код,
            <br />и я помогу вам решить задачу 💡
          </div>
        ) : (
          <>
            {hints.map((hint, index) => (
              <div key={index} className="hint-item">
                {hint}
              </div>
            ))}
            {isLoading && (
              <div className="hint-item" style={{ opacity: 0.5 }}>
                Думаю...
              </div>
            )}
            <div ref={hintsEndRef} />
          </>
        )}
      </div>
      {interimTranscript && (
        <div className="interim-transcript">
          {interimTranscript}
        </div>
      )}
    </div>
  );
}
