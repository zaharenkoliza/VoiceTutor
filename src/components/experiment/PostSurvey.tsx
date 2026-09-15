import React, { useState } from 'react';
import { useExperimentStore } from '../../store/experimentStore';
import { POST_SURVEY_QUESTIONS } from '../../core/experiment/config';

export const PostSurvey: React.FC = () => {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const submitSurvey = useExperimentStore((state) => state.submitSurvey);

  const handleSelect = (questionId: string, val: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const allRequiredAnswered = POST_SURVEY_QUESTIONS.every(
    (q) => !q.required || answers[q.id] !== undefined
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allRequiredAnswered) {
      submitSurvey('post', answers);
    }
  };

  return (
    <div style={{
      maxWidth: '720px',
      margin: '40px auto',
      padding: '32px',
      backgroundColor: '#1e1e2e',
      borderRadius: '16px',
      color: '#cdd6f4',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid #313244', paddingBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5c2e7', margin: '0 0 6px 0' }}>
          Итоговый опрос исследования
        </h2>
        <p style={{ color: '#a6adc8', fontSize: '14px', margin: 0 }}>
          Пожалуйста, сравните два режима взаимодействия (текстовый и голосовой) и поделитесь финальными впечатлениями.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {POST_SURVEY_QUESTIONS.map((q) => (
          <div key={q.id} style={{ backgroundColor: '#181825', padding: '20px', borderRadius: '12px' }}>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: '#cdd6f4' }}>
              {q.text} {q.required && <span style={{ color: '#f38ba8' }}>*</span>}
            </label>

            {q.type === 'likert7' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#a6adc8' }}>
                  <span>{q.scaleLabels?.low}</span>
                  <span>{q.scaleLabels?.high}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const selected = answers[q.id] === num;
                    return (
                      <button
                        type="button"
                        key={num}
                        onClick={() => handleSelect(q.id, num)}
                        style={{
                          flex: 1,
                          padding: '12px 0',
                          borderRadius: '8px',
                          border: selected ? '2px solid #cba6f7' : '1px solid #313244',
                          backgroundColor: selected ? '#cba6f7' : '#1e1e2e',
                          color: selected ? '#11111b' : '#cdd6f4',
                          fontWeight: 700,
                          fontSize: '15px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {q.type === 'open_text' && (
              <textarea
                value={(answers[q.id] as string) || ''}
                onChange={(e) => handleTextChange(q.id, e.target.value)}
                placeholder="Ваш комментарий..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #313244',
                  backgroundColor: '#1e1e2e',
                  color: '#cdd6f4',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={!allRequiredAnswered}
          style={{
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: allRequiredAnswered ? '#a6e3a1' : '#45475a',
            color: allRequiredAnswered ? '#11111b' : '#6c7086',
            fontWeight: 700,
            fontSize: '16px',
            cursor: allRequiredAnswered ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          Завершить исследование
        </button>
      </form>
    </div>
  );
};
