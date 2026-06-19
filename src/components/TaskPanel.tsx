import { useEffect, useRef, useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../store/editorStore';
import { useTutorStore } from '../store/tutorStore';
import { useRunnerStore } from '../store/runnerStore';
import { useLoggerStore } from '../store/loggerStore';
import { tasks } from '../data/tasks';


export function TaskPanel() {
  const selectedTaskId = useEditorStore((s) => s.selectedTaskId);
  const code = useEditorStore((s) => s.code);
  const setCode = useEditorStore((s) => s.setCode);
  const selectTask = useEditorStore((s) => s.selectTask);
  const requestHint = useTutorStore((s) => s.requestHint);
  const clearHistory = useTutorStore((s) => s.clearHistory);
  const isLoading = useTutorStore((s) => s.isLoading);
  const isSpeaking = useTutorStore((s) => s.isSpeaking);
  
  const initWorker = useRunnerStore((s) => s.initWorker);
  const runCode = useRunnerStore((s) => s.runCode);
  const stopCode = useRunnerStore((s) => s.stopCode);
  const isRunning = useRunnerStore((s) => s.isRunning);
  const isReady = useRunnerStore((s) => s.isReady);
  const output = useRunnerStore((s) => s.output);
  const checkAnswer = useRunnerStore((s) => s.checkAnswer);
  const verificationResult = useRunnerStore((s) => s.verificationResult);
  const attempts = useRunnerStore((s) => s.attempts);
  const isSolved = useRunnerStore((s) => s.isSolved);
  const resetVerification = useRunnerStore((s) => s.resetVerification);

  const endSession = useLoggerStore((s) => s.endSession);
  const startSession = useLoggerStore((s) => s.startSession);
  const currentSession = useLoggerStore((s) => s.currentSession);

  const lastSentCodeRef = useRef<string>('');

  // Idle detection: ask "нужна помощь?" if the student is inactive for too long
  const IDLE_TIMEOUT_MS = 90_000;
  const lastActivityRef = useRef<number>(Date.now());
  const idleHintSentRef = useRef(false);

  // Resizable panels: heights in percent of total container.
  // The terminal stays small by default but is always present — proportions are set once
  // by the user (drag) and never auto-change on code run or task switch.
  const panelRef = useRef<HTMLDivElement>(null);
  const [descPct, setDescPct] = useState(55);    // task description %
  const [editorPct, setEditorPct] = useState(30); // editor %
  // terminal = 100 - descPct - editorPct (15% by default)

  const draggingRef = useRef<'desc-editor' | 'editor-terminal' | null>(null);
  const startYRef = useRef(0);
  const startDescPctRef = useRef(0);
  const startEditorPctRef = useRef(0);

  const task = tasks.find((t) => t.id === selectedTaskId);

  const handleBack = () => {
    clearHistory();
    resetVerification();
    // End session if active (unsolved by default when leaving)
    if (currentSession) {
      endSession('unsolved', code);
    }
    // Reset to no task selected
    selectTask('');
    useEditorStore.setState({ selectedTaskId: null, code: '' });
  };

  const handleEndTask = (result: 'solved' | 'unsolved') => {
    if (currentSession) {
      endSession(result, code);
    }

    const editorState = useEditorStore.getState();
    const queue = editorState.taskQueue;
    const currentIndex = queue.indexOf(selectedTaskId ?? '');

    // If there are more tasks in queue, go to next
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      clearHistory();
      resetVerification();
      const nextTaskId = queue[currentIndex + 1];
      const nextTask = tasks.find(t => t.id === nextTaskId);
      if (nextTask) startSession(nextTask);
      editorState.selectTask(nextTaskId);
    } else {
      // Finished — go back to selector
      clearHistory();
      resetVerification();
      selectTask('');
      useEditorStore.setState({ selectedTaskId: null, code: '', taskQueue: [] });
    }
  };

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setCode(value ?? '');
      lastActivityRef.current = Date.now();
    },
    [setCode],
  );

  // ── Resize handlers ───────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (handle: 'desc-editor' | 'editor-terminal', e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = handle;
      startYRef.current = e.clientY;
      startDescPctRef.current = descPct;
      startEditorPctRef.current = editorPct;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    },
    [descPct, editorPct],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !panelRef.current) return;
      const containerH = panelRef.current.getBoundingClientRect().height;
      if (containerH === 0) return;

      const deltaY = e.clientY - startYRef.current;
      const deltaPct = (deltaY / containerH) * 100;

      const MIN = 10; // minimum panel size in %

      if (draggingRef.current === 'desc-editor') {
        const termPct = 100 - startDescPctRef.current - startEditorPctRef.current;
        let newDesc = startDescPctRef.current + deltaPct;
        newDesc = Math.max(MIN, Math.min(newDesc, 100 - termPct - MIN));
        const newEditor = startDescPctRef.current + startEditorPctRef.current - newDesc;
        setDescPct(newDesc);
        setEditorPct(newEditor);
      } else {
        let newEditor = startEditorPctRef.current + deltaPct;
        const termPct = 100 - startDescPctRef.current - newEditor;
        if (termPct < MIN) newEditor = 100 - startDescPctRef.current - MIN;
        if (newEditor < MIN) newEditor = MIN;
        setEditorPct(newEditor);
      }
    };

    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Listen for voice events to trigger hint immediately with voice context
  useEffect(() => {
    const handleVoiceEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const voiceText = customEvent.detail;
      lastActivityRef.current = Date.now();
      if (!task) return;

      const currentCode = useEditorStore.getState().code;
      lastSentCodeRef.current = currentCode;
      requestHint(task, currentCode, voiceText);
    };

    window.addEventListener('voice-question-ready', handleVoiceEvent);
    return () => window.removeEventListener('voice-question-ready', handleVoiceEvent);
  }, [task, requestHint]);

  // Reset idle tracking whenever the task changes
  useEffect(() => {
    lastActivityRef.current = Date.now();
    idleHintSentRef.current = false;
  }, [selectedTaskId]);

  // Treat the end of a tutor response as activity, so the idle clock restarts after it
  useEffect(() => {
    if (!isSpeaking) {
      lastActivityRef.current = Date.now();
    }
  }, [isSpeaking]);

  // Periodically check for inactivity and proactively ask if help is needed
  useEffect(() => {
    const interval = setInterval(() => {
      if (!task || idleHintSentRef.current || isLoading || isSpeaking) return;
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        idleHintSentRef.current = true;
        requestHint(task, useEditorStore.getState().code, undefined, undefined, true);
      }
    }, 5_000);
    return () => clearInterval(interval);
  }, [task, isLoading, isSpeaking, requestHint]);

  // Init Pyodide worker
  useEffect(() => {
    initWorker();
    return () => {
      // optional cleanup
    };
  }, [initWorker]);

  if (!task) return null;

  const canCheck = isReady && !isRunning && output.trim().length > 0 && !isSolved;
  const termPct = 100 - descPct - editorPct;

  return (
    <div className="task-panel" ref={panelRef}>
      {/* ─── Task Description ─── */}
      <div className="task-description" style={{ height: `${descPct}%`, maxHeight: 'none' }}>
        <div className="task-description__header">
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <span className="task-description__badge">
              Задание №{task.number}
            </span>
            {isSolved && (
              <span className="task-solved-badge">✅ Решено</span>
            )}
            {!isSolved && attempts > 0 && (
              <span className="task-attempts-badge">
                Попыток: {attempts}
              </span>
            )}
          </div>
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            {/* Session result buttons */}
            <div className="session-controls">
              <button
                className="session-btn session-btn--solved"
                onClick={() => handleEndTask('solved')}
                id="mark-solved-button"
                title="Задача решена"
              >
                ✅ Решено
              </button>
              <button
                className="session-btn session-btn--unsolved"
                onClick={() => handleEndTask('unsolved')}
                id="mark-unsolved-button"
                title="Задача не решена"
              >
                ❌ Не решено
              </button>
            </div>
            <div className="session-controls__divider" />
            {useEditorStore.getState().taskQueue.indexOf(selectedTaskId ?? '') > 0 && (
              <button
                className="task-description__back"
                onClick={() => {
                  resetVerification();
                  useEditorStore.getState().prevTask();
                }}
                style={{color: 'var(--vt-accent-light)'}}
              >
                ← Предыдущее задание
              </button>
            )}
            {useEditorStore.getState().taskQueue.length > 1 && (
              <button
                className="task-description__back"
                onClick={() => {
                  resetVerification();
                  useEditorStore.getState().nextTask();
                }}
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

      {/* ─── Resize Handle: Description ↔ Editor ─── */}
      <div
        className="resize-handle"
        onMouseDown={(e) => handleMouseDown('desc-editor', e)}
      >
        <div className="resize-handle__grip" />
      </div>

      {/* ─── Code Editor ─── */}
      <div className="editor-container" style={{ height: `${editorPct}%` }}>
        <div className="editor-toolbar">
          {isRunning ? (
            <button className="terminal-btn" style={{color: 'var(--vt-error)', borderColor: 'var(--vt-error)'}} onClick={stopCode}>Остановить</button>
          ) : (
            <button className="terminal-btn run-btn" disabled={!isReady} onClick={() => runCode(code)}>▶ Запустить</button>
          )}
          <button
            className={`terminal-btn check-btn ${isSolved ? 'check-btn--solved' : ''}`}
            disabled={!canCheck}
            onClick={() => checkAnswer(task)}
            id="check-answer-button"
          >
            ✓ Проверить
          </button>
        </div>
        <div className="editor-container__monaco">
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
      </div>

      {/* ─── Resize Handle: Editor ↔ Terminal ─── */}
      <div
        className="resize-handle"
        onMouseDown={(e) => handleMouseDown('editor-terminal', e)}
      >
        <div className="resize-handle__grip" />
      </div>

      {/* ─── Terminal ─── */}
      <div className="terminal-container" style={{ height: `${termPct}%` }}>
        <div className="terminal-container__header">
          <span>Терминал (Python 3.11) {isRunning ? '— Выполняется...' : ''} {!isReady ? '(Загрузка Pyodide...)' : ''}</span>
        </div>
        <div className="terminal-content">
          {output || 'Нет вывода...'}
        </div>
        {verificationResult && (
          <div className={`verification-banner ${verificationResult.isCorrect ? 'verification-banner--correct' : 'verification-banner--incorrect'}`}>
            {verificationResult.isCorrect ? (
              <span>✅ Верно! Ответ: <strong>{verificationResult.actual}</strong></span>
            ) : (
              <span>❌ Неверно (попытка {verificationResult.attempt}). Ваш ответ: <strong>{verificationResult.actual}</strong></span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
