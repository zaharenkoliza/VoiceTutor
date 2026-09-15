import React from 'react';
import { useExperimentStore } from '../../store/experimentStore';

export const SyncStatusIndicator: React.FC = () => {
  const queueStatus = useExperimentStore((state) => state.queueStatus);
  const pendingEventCount = useExperimentStore((state) => state.pendingEventCount);

  let color = '#a6e3a1'; // green (idle)
  let text = 'Синхронизировано';

  if (queueStatus === 'syncing') {
    color = '#89b4fa'; // blue
    text = `Синхронизация (${pendingEventCount})...`;
  } else if (queueStatus === 'error') {
    color = '#f38ba8'; // red
    text = `Ошибка сети (${pendingEventCount} в очереди)`;
  } else if (queueStatus === 'offline') {
    color = '#fab387'; // orange
    text = `Оффлайн (${pendingEventCount} сохранены локально)`;
  } else if (pendingEventCount > 0) {
    color = '#f9e2af'; // yellow
    text = `${pendingEventCount} событий локально`;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 10px',
      backgroundColor: '#181825',
      borderRadius: '20px',
      border: '1px solid #313244',
      fontSize: '12px',
      color: '#cdd6f4',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: `0 0 6px ${color}`,
      }} />
      <span>{text}</span>
    </div>
  );
};
