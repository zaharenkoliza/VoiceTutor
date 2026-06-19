import { useState, useEffect } from 'react';
import { tasks } from '../data/tasks';
import { useEditorStore } from '../store/editorStore';
import { useTutorStore } from '../store/tutorStore';
import { useLoggerStore } from '../store/loggerStore';

export function TaskSelector() {
  const setQueue = useEditorStore((s) => s.setQueue);
  const clearHistory = useTutorStore((s) => s.clearHistory);
  const startSession = useLoggerStore((s) => s.startSession);
  const exportCSV = useLoggerStore((s) => s.exportCSV);
  const allSessions = useLoggerStore((s) => s.allSessions);
  const clearAllSessions = useLoggerStore((s) => s.clearAllSessions);
  const init = useLoggerStore((s) => s.init);
  
  const [mode, setMode] = useState<'initial' | 'practice'>('initial');

  // Load sessions from localStorage on mount
  useEffect(() => {
    init();
  }, [init]);

  const handleSelectTask = (taskId: string) => {
    clearHistory();
    const task = tasks.find((t) => t.id === taskId);
    if (task) startSession(task);
    setQueue([taskId]); // queue of 1
  };

  const startFullVariant = () => {
    clearHistory();
    // One of each unique task number
    const uniqueTasks = new Map<number, string>();
    tasks.forEach(t => {
      if (!uniqueTasks.has(t.number)) {
        uniqueTasks.set(t.number, t.id);
      }
    });
    const queue = Array.from(uniqueTasks.values()).sort((a, b) => {
      const ta = tasks.find(t => t.id === a)!;
      const tb = tasks.find(t => t.id === b)!;
      return ta.number - tb.number;
    });
    // Start session for the first task in queue
    const firstTask = tasks.find(t => t.id === queue[0]);
    if (firstTask) startSession(firstTask);
    setQueue(queue);
  };

  const handleClearSessions = () => {
    if (window.confirm('Удалить все сохранённые сессии? Это действие нельзя отменить.')) {
      clearAllSessions();
    }
  };

  if (mode === 'practice') {
    return (
      <div className="task-selector">
        <button className="task-description__back" onClick={() => setMode('initial')} style={{alignSelf: 'flex-start', marginBottom: 20}}>
          ← Назад
        </button>
        <h2 className="task-selector__title">Выберите задание</h2>
        <div className="task-cards">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="task-card"
              onClick={() => handleSelectTask(task.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSelectTask(task.id);
                }
              }}
              id={`task-card-${task.id}`}
            >
              <div className="task-card__number">Задание №{task.number}</div>
              <div className="task-card__title">{task.title}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="task-selector">
      <div className="task-selector__glow" />
      <span className="task-selector__eyebrow">
        <span className="task-selector__eyebrow-dot" />
        AI-репетитор на связи
      </span>
      <h1 className="task-selector__title">VoiceTutor</h1>
      <p className="task-selector__subtitle">
        Голосовой AI-репетитор по информатике — объясняет, подсказывает и слушает
        вас в реальном времени, как живой преподаватель на созвоне.
      </p>

      <div style={{display: 'flex', gap: '20px', marginTop: '40px'}}>
        <div 
          className="task-card" 
          style={{width: '300px', textAlign: 'center', padding: '40px 20px'}}
          onClick={startFullVariant}
        >
          <div className="task-card__number">Режим</div>
          <div className="task-card__title" style={{fontSize: '1.4rem'}}>Случайный вариант</div>
          <p style={{color: 'var(--vt-text-secondary)', fontSize: '0.85rem', marginTop: 10}}>
            Прорешать все доступные типы заданий по очереди
          </p>
        </div>

        <div 
          className="task-card" 
          style={{width: '300px', textAlign: 'center', padding: '40px 20px'}}
          onClick={() => setMode('practice')}
        >
          <div className="task-card__number">Режим</div>
          <div className="task-card__title" style={{fontSize: '1.4rem'}}>Тренировка заданий</div>
          <p style={{color: 'var(--vt-text-secondary)', fontSize: '0.85rem', marginTop: 10}}>
            Выбрать конкретный номер задания для отработки
          </p>
        </div>
      </div>

      {/* Session data controls */}
      {allSessions.length > 0 && (
        <div className="session-data-controls">
          <span className="session-data-controls__count">
            📊 Записано сессий: {allSessions.length}
          </span>
          <button
            className="export-btn"
            onClick={exportCSV}
            id="export-csv-button"
          >
            📥 Экспорт CSV
          </button>
          <button
            className="export-btn export-btn--danger"
            onClick={handleClearSessions}
            id="clear-sessions-button"
          >
            🗑 Очистить
          </button>
        </div>
      )}
    </div>
  );
}
