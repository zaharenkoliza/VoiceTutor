import { useState, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { TaskSelector } from './TaskSelector';
import { TaskPanel } from './TaskPanel';
import { TutorPanel } from './TutorPanel';
import { TutorPanelCall } from './TutorPanelCall';
import { StatusBar } from './StatusBar';
import { ExperimentFlow } from './experiment/ExperimentFlow';
import { useExperimentStore } from '../store/experimentStore';

export function App() {
  const selectedTaskId = useEditorStore((s) => s.selectedTaskId);
  const experimentSession = useExperimentStore((s) => s.session);
  const useCallDesign = new URLSearchParams(window.location.search).get('design') === 'call';

  const [isExperiment, setIsExperiment] = useState(
    window.location.hash.includes('/experiment') || !!experimentSession
  );

  useEffect(() => {
    const handleHashChange = () => {
      setIsExperiment(window.location.hash.includes('/experiment') || !!useExperimentStore.getState().session);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!experimentSession && localStorage.getItem('voicetutor_active_experiment')) {
      if (window.confirm('Найдена незавершённая исследовательская сессия. Восстановить её?')) {
        useExperimentStore.getState().restoreSession();
      }
    }
  }, [experimentSession]);

  if (isExperiment || experimentSession) {
    return <ExperimentFlow />;
  }

  // No task selected — show task selector
  if (!selectedTaskId) {
    return (
      <div className="app-layout" style={{ gridTemplateColumns: '1fr' }}>
        <TaskSelector />
      </div>
    );
  }

  // Task selected — show editor + tutor
  return (
    <div className="app-layout">
      <TaskPanel />
      {useCallDesign ? <TutorPanelCall /> : <TutorPanel />}
      <StatusBar />
    </div>
  );
}
