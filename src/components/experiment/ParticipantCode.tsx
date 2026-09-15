import React, { useState } from 'react';
import { useExperimentStore } from '../../store/experimentStore';

export const ParticipantCode: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const initParticipant = useExperimentStore((state) => state.initParticipant);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError('Пожалуйста, введите код участника');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await initParticipant(cleanCode);
    setIsLoading(false);

    if (!success) {
      setError('Не удалось инициализировать сессию. Попробуйте еще раз.');
    }
  };

  return (
    <div style={{
      maxWidth: '540px',
      margin: '60px auto',
      padding: '36px',
      backgroundColor: '#1e1e2e',
      borderRadius: '16px',
      color: '#cdd6f4',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5c2e7', marginTop: 0, marginBottom: '12px' }}>
        Ввод кода участника
      </h2>
      <p style={{ color: '#a6adc8', fontSize: '14px', marginBottom: '24px' }}>
        Введите ваш индивидуальный код исследования (например, <b>P001-1</b>). Цифра после дефиса определяет последовательность экспериментальных условий.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#cdd6f4' }}>
            Код участника
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="P001-1"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '2px solid #313244',
              backgroundColor: '#181825',
              color: '#cdd6f4',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '1px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(243, 139, 168, 0.15)',
            border: '1px solid #f38ba8',
            borderRadius: '8px',
            color: '#f38ba8',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !code.trim()}
          style={{
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: code.trim() ? '#cba6f7' : '#45475a',
            color: code.trim() ? '#11111b' : '#6c7086',
            fontWeight: 700,
            fontSize: '16px',
            cursor: code.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? 'Проверка...' : 'Начать экcперимент'}
        </button>
      </form>
    </div>
  );
};
