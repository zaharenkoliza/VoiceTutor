import React, { useState } from 'react';
import { useExperimentStore } from '../../store/experimentStore';
import { DEFAULT_CONSENT_CONFIG } from '../../core/experiment/config';

export const ConsentScreen: React.FC = () => {
  const [agreed, setAgreed] = useState(false);
  const setConsent = useExperimentStore((state) => state.setConsent);
  const consentConfig = DEFAULT_CONSENT_CONFIG;

  const handleNext = () => {
    if (agreed) {
      setConsent(true);
    }
  };

  return (
    <div style={{
      maxWidth: '780px',
      margin: '40px auto',
      padding: '32px',
      backgroundColor: '#1e1e2e',
      borderRadius: '16px',
      color: '#cdd6f4',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      fontFamily: 'Inter, system-ui, sans-serif',
      lineHeight: '1.6'
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#f5c2e7',
        marginBottom: '20px',
        borderBottom: '1px solid #313244',
        paddingBottom: '12px'
      }}>
        {consentConfig.studyTitle}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
        <p>{consentConfig.studyDescription}</p>

        <div style={{ backgroundColor: '#181825', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #89b4fa' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#89b4fa' }}>Сбор и использование данных</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#a6adc8' }}>{consentConfig.dataUsageDescription}</p>
        </div>

        <div style={{ backgroundColor: '#181825', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #f9e2af' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f9e2af' }}>Уведомление о сторонних сервисах</h3>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#a6adc8' }}>{consentConfig.speechServiceNotice}</p>
          <p style={{ margin: 0, fontSize: '14px', color: '#a6adc8' }}>{consentConfig.llmProviderNotice}</p>
        </div>

        <p style={{ fontStyle: 'italic', color: '#a6adc8', fontSize: '14px' }}>
          {consentConfig.voluntaryParticipation}
        </p>
      </div>

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #313244' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          fontSize: '15px',
          userSelect: 'none',
        }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: '#cba6f7', cursor: 'pointer' }}
          />
          <span>Я прочитал(а) условия и согласен(на) принять участие в исследовании</span>
        </label>

        <button
          onClick={handleNext}
          disabled={!agreed}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: agreed ? '#cba6f7' : '#45475a',
            color: agreed ? '#11111b' : '#6c7086',
            fontWeight: 700,
            fontSize: '16px',
            cursor: agreed ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          Далее (Ввод кода участника)
        </button>
      </div>
    </div>
  );
};
