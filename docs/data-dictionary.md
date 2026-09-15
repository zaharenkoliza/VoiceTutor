# Словарь данных и схема событий (Data Dictionary)

## 1. Общие сведения

Все события экспериментирования структурированы в соответствии со спецификацией **Schema Version 2.0**.
Каждая запись сохраняется в PostgreSQL (`experiment_events`) с единым набором метаданных и полем `payload`. Связанные таблицы являются аналитическими проекциями.

---

## 2. Структура объекта события (`ExperimentEvent`)

| Поле | Тип | Описание |
| :--- | :--- | :--- |
| `eventId` | String (UUID v4) | Уникальный идентификатор события |
| `participantId` | String | Анонимный код участника (например, `P001-1`) |
| `sessionId` | String (UUID v4) | Идентификатор экспериментальной сессии |
| `blockId` | String | Идентификатор блока (`block1`, `block2`, `practice`, `setup`) |
| `taskAttemptId` | String (UUID v4) | Идентификатор текущей попытки решения конкретного задания |
| `requestId` | String или null | Идентификатор корреляции одного пользовательского запроса к LLM; технические повторы не создают новый requestId |
| `schemaVersion` | String | Версия схемы данных (`2.0`) |
| `appVersion` | String | Версия приложения (`2.0.0-pilot`) |
| `experimentConfigVersion` | String | Версия конфигуратора эксперимента (`1.0`) |
| `timestamp` | String (ISO 8601 UTC) | Акрохронометрическое время сервера/клиента |
| `monotonicMs` | Number | Монотонный таймер `performance.now()` (внутристраничный) |
| `type` | String (EventType) | Тип зарегистрированного события |
| `data` | Object | Нагрузка события (payload) |

---

## 3. Реестр типов событий (`EventType`)

### 3.1 Жизненный цикл сессии и блоков
- `session_start`: Начало экспериментальной сессии. `data`: `{ scheme, block1Mode, block1TaskSet, block2Mode, block2TaskSet, browserInfo }`.
- `session_end`: Завершение сессии. `data`: `{ reason }`.
- `block_start`: Запуск экспериментального блока. `data`: `{ blockId, mode, taskSet }`.
- `block_end`: Завершение блока. `data`: `{ blockId, status }` (status: `completed`, `timeout`).
- `task_start`: Открытие конкретной задачи. `data`: `{ taskId, taskTitle, taskIndex, mode }`.
- `task_end`: Завершение задачи. `data`: `{ taskId, status }` (status: `correct`, `skipped`, `timeout`).

### 3.2 Редактирование и выполнение кода
- `code_run`: Запуск кода на выполнение в Pyodide. `data`: `{ code, runId, isFirstRun, codeLength, lineCount }`.
- `code_result`: Результат выполнения в Pyodide. `data`: `{ output, isFirstRun, errorCategory, hasError, errorText }`.
- `code_stop`: Принудительная остановка выполнения кода. `data`: `{ runId }`.
- `answer_submit`: Проверка введенного ответа. `data`: `{ taskId, submittedAnswer, isCorrect }`.

### 3.3 Взаимодействие с AI-Тьютором
- `tutor_request`: Отправка запроса к AI. `data`: `{ taskId, userMessage, hasVoiceQuestion, hasVerificationContext }`.
- `tutor_response`: Получение ответа от AI. `data`: `{ content, latencyMs, model }`.
- `tutor_error`: Ошибка генерации подсказки. `data`: `{ error }`.

### 3.4 Распознавание речи (STT)
- `stt_start`: Начало записи. `data`: `{ taskId, speechStartedAt }`.
- `stt_result`: Результат SpeechKit. `data`: `{ transcript, confidence: null, speechFinishedAt, sttStartedAt, sttFinishedAt, audioDurationMs, status }`.
- `stt_confirm`: Подтверждение. `data`: `{ originalTranscript, submittedText, confidence, edited, editAndConfirmDurationMs }`.
- `stt_error`: Ошибка распознавания речи. `data`: `{ error }`.
- `voice_edit`: устаревший тип, не используется новым исследовательским UI.
- `tts_start` / `tts_result` / `tts_error`: начало, окончание или ошибка SpeechKit TTS; текст совпадает с ответом LLM.
- `audio_playback_start` / `audio_playback_end`: реально наблюдаемые browser audio events.

### 3.5 Опросы и проверки
- `consent`: Фиксация информированного согласия. `data`: `{ given, timestamp }`.
- `system_check`: Результаты автоматической проверки совместимости. `data`: `{ passed, errors }`.
- `survey_response`: Ответы на опросы (Pre, Mid, Post). `data`: `{ surveyId, responses }`.

## 4. Пропуски и показатели

Недоступные значения хранятся как `null`, а не как ноль. Синхронный SpeechKit endpoint не возвращает confidence, поэтому оно равно `null`; это не WER/CER. WER/CER без отдельной эталонной транскрипции не рассчитываются; подтверждённый текст не считается дословным эталоном речи. IRA, in-domain coverage и DCR не входят в основные итоги без отдельной операционализации и разметки. `isFirstRun` относится только к запуску кода и не означает правильность первой отправки ответа.

Основные производные показатели: completion status; время до правильного ответа только для решённых попыток; наблюдаемая длительность всех попыток; числа `answer_submit`, `code_run`, `tutor_request`, `tutor_response`; технические ошибки; ответы авторской анкеты. После reload монотонные значения разных загрузок не вычитаются друг из друга.

CSV кодируется UTF-8 с BOM, связи обеспечивают идентификаторы, а значения, начинающиеся с `=`, `+`, `-`, `@`, получают защитный апостроф. Полный JSON из `experiment_events` остаётся источником для пересчёта сводок.
