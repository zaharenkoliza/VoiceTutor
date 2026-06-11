import { useEditorStore } from '../store/editorStore';
import { TaskSelector } from './TaskSelector';
import { TaskPanel } from './TaskPanel';
import { TutorPanel } from './TutorPanel';
import { StatusBar } from './StatusBar';

export function App() {
  const selectedTaskId = useEditorStore((s) => s.selectedTaskId);

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
      <TutorPanel />
      <StatusBar />
    </div>
  );
}
