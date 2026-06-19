import { useEditorStore } from '../store/editorStore';
import { TaskSelector } from './TaskSelector';
import { TaskPanel } from './TaskPanel';
import { TutorPanel } from './TutorPanel';
import { TutorPanelCall } from './TutorPanelCall';
import { StatusBar } from './StatusBar';

export function App() {
  const selectedTaskId = useEditorStore((s) => s.selectedTaskId);
  // Design draft toggle — visit with ?design=call to preview the video-call style TutorPanel.
  // Default behavior (no param) is the existing TutorPanel, unchanged.
  const useCallDesign = new URLSearchParams(window.location.search).get('design') === 'call';

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
