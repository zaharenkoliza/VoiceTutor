CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiment_sessions (
  session_id uuid PRIMARY KEY,
  participant_id text NOT NULL,
  condition text CHECK (condition IN ('voice', 'text')),
  task_id text,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  finish_reason text,
  experiment_version text NOT NULL,
  llm_model text NOT NULL,
  llm_temperature double precision NOT NULL,
  llm_max_tokens integer NOT NULL,
  system_prompt_version text NOT NULL,
  session_config jsonb NOT NULL,
  browser_info jsonb
);

CREATE TABLE IF NOT EXISTS experiment_events (
  event_id uuid PRIMARY KEY,
  participant_id text NOT NULL,
  session_id uuid NOT NULL,
  block_id text,
  task_attempt_id text,
  request_id uuid,
  schema_version text NOT NULL,
  app_version text NOT NULL,
  experiment_version text NOT NULL,
  occurred_at timestamptz NOT NULL,
  monotonic_ms double precision,
  event_type text NOT NULL,
  payload jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS experiment_events_session_time_idx ON experiment_events(session_id, occurred_at);

CREATE TABLE IF NOT EXISTS messages (
  message_id bigserial PRIMARY KEY,
  event_id uuid UNIQUE NOT NULL REFERENCES experiment_events(event_id),
  session_id uuid NOT NULL,
  task_id text,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  input_mode text CHECK (input_mode IN ('voice', 'text')),
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS llm_requests (
  request_id uuid PRIMARY KEY,
  session_id uuid NOT NULL,
  task_id text,
  model text NOT NULL,
  started_at timestamptz NOT NULL,
  first_token_at timestamptz,
  finished_at timestamptz,
  input_tokens integer,
  output_tokens integer,
  status text NOT NULL,
  error_type text,
  technical_retry_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS voice_events (
  voice_event_id bigserial PRIMARY KEY,
  event_id uuid UNIQUE NOT NULL REFERENCES experiment_events(event_id),
  session_id uuid NOT NULL,
  task_id text,
  transcript text,
  speech_started_at timestamptz,
  speech_finished_at timestamptz,
  stt_started_at timestamptz,
  stt_finished_at timestamptz,
  tts_started_at timestamptz,
  tts_finished_at timestamptz,
  audio_playback_started_at timestamptz,
  audio_playback_finished_at timestamptz,
  audio_duration_ms double precision,
  status text,
  error_type text
);

CREATE TABLE IF NOT EXISTS task_results (
  task_attempt_id text PRIMARY KEY,
  session_id uuid NOT NULL,
  task_id text NOT NULL,
  condition text CHECK (condition IN ('voice', 'text')),
  task_started_at timestamptz NOT NULL,
  task_finished_at timestamptz,
  final_answer text,
  is_correct boolean,
  completion_status text,
  hints_count integer NOT NULL DEFAULT 0,
  messages_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ui_events (
  ui_event_id bigserial PRIMARY KEY,
  event_id uuid UNIQUE NOT NULL REFERENCES experiment_events(event_id),
  session_id uuid NOT NULL,
  task_id text,
  event_name text NOT NULL,
  created_at timestamptz NOT NULL,
  payload jsonb NOT NULL
);
