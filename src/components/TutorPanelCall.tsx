import { useTutorStore } from '../store/tutorStore';
import './TutorPanelCall.css';

/**
 * Design draft: "video call" framing instead of the landing-style hints feed.
 * The tutor's presence is a compact tile (avatar placeholder + name/status),
 * not a full-height stage — most of the panel stays free for captions/hints.
 * Opt-in via ?design=call so the default TutorPanel is untouched.
 */
export function TutorPanelCall() {
  const hints = useTutorStore((s) => s.hints);
  const isLoading = useTutorStore((s) => s.isLoading);
  const isSpeaking = useTutorStore((s) => s.isSpeaking);
  const isMuted = useTutorStore((s) => s.isMuted);
  const interimTranscript = useTutorStore((s) => s.interimTranscript);

  const lastHint = hints[hints.length - 1];
  const statusText = isSpeaking ? 'говорит' : isMuted ? 'микрофон выкл.' : 'на связи';

  return (
    <div className="call-panel">
      <div className="call-card">
        {/* Placeholder for a future real avatar/illustration */}
        <div className={`call-card__avatar ${isSpeaking ? 'is-speaking' : ''}`}>🎓</div>
        <div className="call-card__body">
          <div className="call-card__title-row">
            <span className="call-card__dot" />
            <span className="call-card__title">AI-репетитор</span>
          </div>
          <span className="call-card__status">{statusText}</span>
        </div>
      </div>

      <div className="call-panel__captions">
        {interimTranscript ? (
          <p className="call-panel__caption call-panel__caption--you">Вы: {interimTranscript}</p>
        ) : isLoading ? (
          <p className="call-panel__caption call-panel__caption--loading">Репетитор думает…</p>
        ) : lastHint ? (
          <p className="call-panel__caption">{lastHint}</p>
        ) : (
          <p className="call-panel__caption call-panel__caption--empty">
            Начните писать код — репетитор подключится сам.
          </p>
        )}
      </div>
    </div>
  );
}
