import { useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../store/editorStore';
import { useTutorStore } from '../store/tutorStore';
import { useRunnerStore } from '../store/runnerStore';
import { tasks } from '../data/tasks';

const DEBOUNCE_MS = 8000;

export function TaskPanel() {
  const selectedTaskId = useEditorStore((s) => s.selectedTaskId);
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const selectTask = useEditorStore((s) => s.selectTask);
  const requestHint = useTutorStore((s) => s.requestHint);
  const clearHistory = useTutorStore((s) => s.clearHistory);
  
  const initWorker = useRunnerStore((s) => s.initWorker);
  const runCode = useRunnerStore((s) => s.runCode);
  const stopCode = useRunnerStore((s) => s.stopCode);
  const clearOutput = useRunnerStore((s) => s.clearOutput);
  const isRunning = useRunnerStore((s) => s.isRunning);
  const isReady = useRunnerStore((s) => s.isReady);
  const output = useRunnerStore((s) => s.output);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentCodeRef = useRef<string>('');

  const task = tasks.find((t) => t.id === selectedTaskId);

  const handleBack = () => {
    clearHistory();
    // Reset to no task selected
    selectTask('');
    useEditorStore.setState({ selectedTaskId: null, code: '' });
  };

  const triggerHint = useCallback(
    (currentCode: string) => {
      if (!task) return;
      // Don't re-send the same code
      if (currentCode === lastSentCodeRef.current) return;
      lastSentCodeRef.current = currentCode;
      requestHint(task, currentCode);
    },
    [task, requestHint],
  );

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? '';
      setCode(newCode);

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        triggerHint(newCode);
      }, DEBOUNCE_MS);
    },
    [setCode, triggerHint],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Listen for voice events to trigger hint immediately with voice context
  useEffect(() => {
    const handleVoiceEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const voiceText = customEvent.detail;
      if (!task) return;
      
      // Clear debounce since we send immediately
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      
      const currentCode = useEditorStore.getState().code;
      lastSentCodeRef.current = currentCode;
      requestHint(task, currentCode, voiceText);
    };

    window.addEventListener('voice-question-ready', handleVoiceEvent);
    return () => window.removeEventListener('voice-question-ready', handleVoiceEvent);
  }, [task, requestHint]);

  // Init Pyodide worker
  useEffect(() => {
    initWorker();
    return () => {
      // optional cleanup
    };
  }, [initWorker]);

  if (!task) return null;

  return (
    <div className="task-panel">
      <div className="task-description">
        <div className="task-description__header">
          <span className="task-description__badge">
            Задание №{task.number}
          </span>
          <div style={{display: 'flex', gap: '8px'}}>
            {useEditorStore.getState().taskQueue.length > 1 && (
              <button
                className="task-description__back"
                onClick={() => useEditorStore.getState().nextTask()}
                style={{color: 'var(--vt-accent-light)'}}
              >
                Следующее задание →
              </button>
            )}
            <button
              className="task-description__back"
              onClick={handleBack}
              id="back-button"
            >
              Завершить сессию
            </button>
          </div>
        </div>
        <div className="task-description__text">{task.description}</div>
      </div>
      <div className="workspace-container">
        <div className="editor-container">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            options={{
              fontSize: 14,
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              minimap: { enabled: false },
              lineNumbers: 'on',
              padding: { top: 12 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              tabSize: 4,
              renderLineHighlight: 'gutter',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
            }}
          />
        </div>
        <div className="terminal-container">
          <div className="terminal-container__header">
            <span>Терминал (Python 3.11) {isRunning ? '— Выполняется...' : ''} {!isReady ? '(Загрузка Pyodide...)' : ''}</span>
            <div className="terminal-controls">
              <button className="terminal-btn" onClick={() => clearOutput()}>Очистить</button>
              {isRunning ? (
                <button className="terminal-btn" style={{color: 'var(--vt-error)', borderColor: 'var(--vt-error)'}} onClick={stopCode}>Остановить</button>
              ) : (
                <button className="terminal-btn" style={{color: 'var(--vt-success)', borderColor: 'var(--vt-success)'}} disabled={!isReady} onClick={() => runCode(code)}>▶ Запустить</button>
              )}
            </div>
          </div>
          <div className="terminal-content">
            {output || 'Нет вывода...'}
          </div>
        </div>
      </div>
    </div>
  );
}
