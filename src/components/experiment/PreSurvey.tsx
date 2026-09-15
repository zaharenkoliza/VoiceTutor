import React, { useState } from 'react';
import { useExperimentStore } from '../../store/experimentStore';
import { PRE_SURVEY_QUESTIONS } from '../../core/experiment/config';

export const PreSurvey: React.FC = () => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const submitPreSurvey = useExperimentStore((state) => state.submitPreSurvey);

  const handleSelect = (questionId: string, val: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const allAnswered = PRE_SURVEY_QUESTIONS.every((q) => !q.required || answers[q.id] !== undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allAnswered) {
      submitPreSurvey(answers);
    }
  };

  return (
    <div style={{
      maxWidth: '680px',
      margin: '40px auto',
      padding: '32px',
      backgroundColor: '#1e1e2e',
      borderRadius: '16px',
      color: '#cdd6f4',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f5c2e7', marginTop: 0, marginBottom: '12px' }}>
        Входной опрос
      </h2>
      <p style={{ color: '#a6adc8', fontSize: '14px', marginBottom: '28px' }}>
        Пожалуйста, ответьте на несколько вопросов о вашем предыдущем опыте.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {PRE_SURVEY_QUESTIONS.map((q) => (
          <div key={q.id} style={{ backgroundColor: '#181825', padding: '20px', borderRadius: '12px' }}>
            <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: '#cdd6f4' }}>
              {q.text} {q.required && <span style={{ color: '#f38ba8' }}>*</span>}
            </label>

            {q.type === 'likert5' && q.pointLabels && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.pointLabels.map((label, idx) => {
                  const val = idx + 1;
                  const selected = answers[q.id] === val;
                  return (
                    <label
                      key={val}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: selected ? 'rgba(203, 166, 247, 0.2)' : '#1e1e2e',
                        border: selected ? '1px solid #cba6f7' : '1px solid #313244',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={val}
                        checked={selected}
                        onChange={() => handleSelect(q.id, val)}
                        style={{ accentColor: '#cba6f7', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', color: selected ? '#f5c2e7' : '#cdd6f4' }}>
                        {val}. {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={!allAnswered}
          style={{
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: allAnswered ? '#cba6f7' : '#45475a',
            color: allAnswered ? '#11111b' : '#6c7086',
            fontWeight: 700,
            fontSize: '16px',
            cursor: allAnswered ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          Далее (Переход к треку)
        </button>
      </form>
    </div>
  );
};
