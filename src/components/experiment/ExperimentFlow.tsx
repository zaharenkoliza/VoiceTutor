import React from 'react';
import { useExperimentStore } from '../../store/experimentStore';
import { ConsentScreen } from './ConsentScreen';
import { ParticipantCode } from './ParticipantCode';
import { SystemCheck } from './SystemCheck';
import { PreSurvey } from './PreSurvey';
import { BlockSurvey } from './BlockSurvey';
import { PostSurvey } from './PostSurvey';
import { ExperimentBlock } from './ExperimentBlock';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { getSessionEvents, downloadFile } from '../../core/logger';

export const ExperimentFlow: React.FC = () => {
  const currentStep = useExperimentStore((state) => state.currentStep);
  const session = useExperimentStore((state) => state.session);
  const startPracticeBlock = useExperimentStore((state) => state.startPracticeBlock);

  const handleExportLocalEvents = async () => {
    if (!session) return;
    const events = await getSessionEvents(session.sessionId);
    const jsonStr = JSON.stringify(events, null, 2);
    downloadFile(jsonStr, `session_${session.participantId}_${session.sessionId.slice(0, 8)}.json`, 'application/json');
  };

  switch (currentStep) {
    case 'consent':
      return <ConsentScreen />;

    case 'participant_code':
      return <ParticipantCode />;

    case 'system_check':
      return <SystemCheck />;

    case 'pre_survey':
      return <PreSurvey />;

    case 'practice':
      return (
        <div style={{
          maxWidth: '640px',
          margin: '60px auto',
          padding: '36px',
          backgroundColor: '#1e1e2e',
          borderRadius: '16px',
          color: '#cdd6f4',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <h2 style={{ fontSize: '24px', color: '#f5c2e7', marginTop: 0 }}>
            Инструктаж и знакомство
          </h2>
          <p style={{ fontSize: '15px', color: '#a6adc8', lineHeight: '1.6', marginBottom: '24px' }}>
            Вам предстоит решить две серии задач (Блок 1 и Блок 2) по программированию на Python.
            В одном из блоков вы будете отправлять вопросы тьютору <b>текстом</b>, а в другом — <b>голосом</b>.
          </p>
          <div style={{
            backgroundColor: '#181825',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'left',
            marginBottom: '28px',
            borderLeft: '4px solid #a6e3a1',
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#a6e3a1' }}>💡 Важно помнить:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#cdd6f4', lineHeight: '1.6' }}>
              <li>Тьютор не дает готовых решений — он помогает дойти до ответа самостоятельно.</li>
              <li>Кнопка «Запустить» только выполняет ваш код в терминале.</li>
              <li>Кнопка «Проверить» проверяет ваш ответ на правильность.</li>
            </ul>
          </div>
          <button
            onClick={startPracticeBlock}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#cba6f7',
              color: '#11111b',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Начать тренировку 🚀
          </button>
        </div>
      );

    case 'block1':
      return <ExperimentBlock />;

    case 'mid_survey':
      return <BlockSurvey blockId="block1" />;

    case 'block2':
      return <ExperimentBlock />;

    case 'post_survey':
      return <PostSurvey />;

    case 'completion':
      return (
        <div style={{
          maxWidth: '640px',
          margin: '60px auto',
          padding: '40px',
          backgroundColor: '#1e1e2e',
          borderRadius: '16px',
          color: '#cdd6f4',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}>
          <h1 style={{ fontSize: '28px', color: '#a6e3a1', marginTop: 0 }}>
            🎉 Спасибо за участие!
          </h1>
          <p style={{ fontSize: '16px', color: '#a6adc8', lineHeight: '1.6', marginBottom: '32px' }}>
            Ваше участие внесет значительный вклад в исследование НИР-3 по адаптивному AI-тьюторингу.
            Эксперимент завершён. Проверьте индикатор ниже: подтверждение сервера требуется до закрытия страницы.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <SyncStatusIndicator />
            <button
              onClick={handleExportLocalEvents}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: '1px solid #89b4fa',
                backgroundColor: 'transparent',
                color: '#89b4fa',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              📥 Скачать копию данных (JSON)
            </button>
          </div>
        </div>
      );

    default:
      return <ConsentScreen />;
  }
};
