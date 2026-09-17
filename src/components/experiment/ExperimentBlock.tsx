import React, { useEffect } from 'react';
import { useExperimentStore } from '../../store/experimentStore';
import { useEditorStore } from '../../store/editorStore';
import { useTutorStore } from '../../store/tutorStore';
import { TaskPanel } from '../TaskPanel';
import { TutorPanel } from '../TutorPanel';
import { ExperimentTutorPanel } from './ExperimentTutorPanel';
import { SyncStatusIndicator } from './SyncStatusIndicator';

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const ExperimentBlock: React.FC = () => {
  const session = useExperimentStore((state) => state.session);
  const activeBlockId = useExperimentStore((state) => state.activeBlockId);
  const activeMode = useExperimentStore((state) => state.activeMode);
  const currentTaskIndex = useExperimentStore((state) => state.currentTaskIndex);
  const blockTasks = useExperimentStore((state) => state.blockTasks);
  const blockElapsedMs = useExperimentStore((state) => state.blockElapsedMs);
  const skipTask = useExperimentStore((state) => state.skipTask);
  const endTaskWithTechnicalError = useExperimentStore((state) => state.endTaskWithTechnicalError);
  const selectTask = useEditorStore((state) => state.selectTask);
  const clearTutorHistory = useTutorStore((state) => state.clearHistory);

  const currentTask = blockTasks[currentTaskIndex];

  useEffect(() => {
    if (currentTask) {
      clearTutorHistory();
      selectTask(currentTask.id);
    }
  }, [currentTask, selectTask, clearTutorHistory]);

  if (!currentTask || !session) return null;

  const modeBadgeText = activeMode === 'voice' ? '🎤 Голосовой режим' : '💬 Текстовый режим';
  const modeBadgeBg = activeMode === 'voice' ? '#89b4fa' : '#cba6f7';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#11111b',
      color: '#cdd6f4',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        backgroundColor: '#181825',
        borderBottom: '1px solid #313244',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#f5c2e7' }}>
            Participant: {session.participantId}
          </span>
          <span style={{
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: modeBadgeBg,
            color: '#11111b',
            fontWeight: 700,
            fontSize: '13px',
          }}>
            {modeBadgeText}
          </span>
          <span style={{ fontSize: '14px', color: '#a6adc8' }}>
            {activeBlockId === 'practice' ? 'Тренировка' : `Блок: ${activeBlockId === 'block1' ? '1' : '2'}`} | Задание {currentTaskIndex + 1} из {blockTasks.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeBlockId !== 'practice' && <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#1e1e2e',
            borderRadius: '8px',
            border: '1px solid #313244',
            fontSize: '14px',
            fontWeight: 600,
            color: '#cdd6f4',
          }}>
            <span>⏱️ Время:</span>
            <span style={{ fontFamily: 'monospace', fontSize: '16px' }}>
              {formatTimer(blockElapsedMs)}
            </span>
          </div>}

          <SyncStatusIndicator />

          <button
            onClick={() => {
              if (window.confirm('Вы действительно хотите пропустить это задание?')) {
                skipTask();
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #f38ba8',
              backgroundColor: 'transparent',
              color: '#f38ba8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Пропустить задание ⏭️
          </button>
          <button
            onClick={() => {
              if (window.confirm('Завершить текущую попытку как техническую ошибку?')) endTaskWithTechnicalError();
            }}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fab387', background: 'transparent', color: '#fab387' }}
          >
            Техническая проблема
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <main style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1, borderRight: '1px solid #313244', height: '100%' }}>
          <TaskPanel />
        </div>
        <div style={{ width: '400px', height: '100%', backgroundColor: '#181825' }}>
          {activeBlockId ? <ExperimentTutorPanel task={currentTask} /> : <TutorPanel />}
        </div>
      </main>
    </div>
  );
};
