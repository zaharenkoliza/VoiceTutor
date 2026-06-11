import { useTutorStore } from '../store/tutorStore';

export function TutorAvatar() {
  const isSpeaking = useTutorStore((s) => s.isSpeaking);
  const interruptAI = useTutorStore((s) => s.interruptAI);

  return (
    <div 
      className={`avatar-container ${isSpeaking ? 'is-speaking' : ''}`}
      onClick={() => {
        if (isSpeaking) {
          interruptAI();
        }
      }}
      style={{ cursor: isSpeaking ? 'pointer' : 'default' }}
      title={isSpeaking ? 'Нажмите, чтобы перебить' : ''}
    >
      <div className="avatar-ring" />
      <div className="avatar-core">🎓</div>
      <div className="avatar-waves">
        <div className="avatar-wave-bar" />
        <div className="avatar-wave-bar" />
        <div className="avatar-wave-bar" />
        <div className="avatar-wave-bar" />
        <div className="avatar-wave-bar" />
      </div>
    </div>
  );
}
