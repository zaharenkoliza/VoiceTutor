import React, { useState } from 'react';
import { useExperimentStore } from '../../store/experimentStore';

export const SystemCheck: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const runSystemCheck = useExperimentStore((state) => state.runSystemCheck);

  const handleCheck = async () => {
    setChecking(true);
    setErrors([]);
    const res = await runSystemCheck();
    setChecking(false);
    if (!res.success) {
      setErrors(res.errors);
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '50px auto',
      padding: '32px',
      backgroundColor: '#1e1e2e',
      borderRadius: '16px',
      color: '#cdd6f4',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5c2e7', marginTop: 0 }}>
        Проверка системы и браузера
      </h2>
      <p style={{ color: '#a6adc8', fontSize: '14px', marginBottom: '24px' }}>
        Перед началом исследования проверим микрофон, Web Audio API, Pyodide и соединение с backend.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#181825',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          <span style={{ fontSize: '18px' }}>🎤</span>
          <span>Доступность микрофона и Web Audio API</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#181825',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          <span style={{ fontSize: '18px' }}>🐍</span>
          <span>Исполнитель Python (Pyodide WebWorker)</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: '#181825',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          <span style={{ fontSize: '18px' }}>🌐</span>
          <span>Соединение с сервером AI-тьютора</span>
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(243, 139, 168, 0.15)',
          border: '1px solid #f38ba8',
          borderRadius: '10px',
          color: '#f38ba8',
          marginBottom: '24px',
          fontSize: '14px',
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>Обнаружены проблемы:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleCheck}
        disabled={checking}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: '#cba6f7',
          color: '#11111b',
          fontWeight: 700,
          fontSize: '16px',
          cursor: checking ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {checking ? 'Выполняется проверка...' : 'Запустить проверку'}
      </button>
    </div>
  );
};
