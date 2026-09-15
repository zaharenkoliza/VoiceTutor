import type { Pool, PoolClient } from 'pg';
import type { EventStore } from './eventStore.js';
import type { StoredEvent } from './fileStore.js';

export class PostgresEventStore implements EventStore {
  constructor(private readonly pool: Pool) {}

  async init(): Promise<void> { await this.pool.query('SELECT 1'); }

  async storeEvents(events: StoredEvent[]): Promise<{ stored: number; duplicates: number }> {
    const client = await this.pool.connect();
    let stored = 0;
    try {
      await client.query('BEGIN');
      for (const event of events) {
        const result = await client.query(
          `INSERT INTO experiment_events(event_id, participant_id, session_id, block_id, task_attempt_id,
             request_id, schema_version, app_version, experiment_version, occurred_at, monotonic_ms, event_type, payload)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT(event_id) DO NOTHING`,
          [event.eventId, event.participantId, event.sessionId, event.blockId, event.taskAttemptId || null,
            event.requestId || null, event.schemaVersion, event.appVersion, event.experimentConfigVersion,
            event.timestamp, event.monotonicMs, event.type, event.data],
        );
        if (!result.rowCount) continue;
        stored++;
        await this.projectEvent(client, event);
      }
      await client.query('COMMIT');
      return { stored, duplicates: events.length - stored };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async loadAllEvents(): Promise<StoredEvent[]> {
    const result = await this.pool.query(`SELECT event_id, participant_id, session_id, block_id,
      task_attempt_id, request_id, schema_version, app_version, experiment_version, occurred_at,
      monotonic_ms, event_type, payload FROM experiment_events ORDER BY occurred_at`);
    return result.rows.map((row) => ({
      eventId: row.event_id, participantId: row.participant_id, sessionId: row.session_id,
      blockId: row.block_id ?? '', taskAttemptId: row.task_attempt_id ?? '', requestId: row.request_id ?? undefined,
      schemaVersion: row.schema_version, appVersion: row.app_version,
      experimentConfigVersion: row.experiment_version, timestamp: new Date(row.occurred_at).toISOString(),
      monotonicMs: row.monotonic_ms == null ? 0 : Number(row.monotonic_ms), type: row.event_type, data: row.payload,
    }));
  }

  private async projectEvent(client: PoolClient, event: StoredEvent): Promise<void> {
    const d = event.data ?? {};
    if (event.type === 'session_start') {
      const config = d['sessionConfig'] as Record<string, unknown> | undefined;
      const llm = config?.['llmConfig'] as Record<string, unknown> | undefined;
      await client.query(`INSERT INTO experiment_sessions(session_id, participant_id, started_at,
        experiment_version, llm_model, llm_temperature, llm_max_tokens, system_prompt_version, session_config, browser_info)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(session_id) DO NOTHING`,
      [event.sessionId, event.participantId, event.timestamp, event.experimentConfigVersion,
        llm?.['model'] ?? '', llm?.['temperature'] ?? 0, llm?.['maxTokens'] ?? 0,
        llm?.['promptVersion'] ?? '', config ?? {}, d['browserInfo'] ?? null]);
    } else if (event.type === 'session_end') {
      await client.query('UPDATE experiment_sessions SET finished_at=$2, finish_reason=$3 WHERE session_id=$1',
        [event.sessionId, event.timestamp, d['reason'] ?? null]);
    }

    if (event.type === 'task_start') {
      await client.query(`INSERT INTO task_results(task_attempt_id,session_id,task_id,condition,task_started_at)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(task_attempt_id) DO NOTHING`,
        [event.taskAttemptId, event.sessionId, d['taskId'], d['mode'], event.timestamp]);
    } else if (event.type === 'answer_submit') {
      await client.query(`UPDATE task_results SET final_answer=$2,is_correct=$3 WHERE task_attempt_id=$1`,
        [event.taskAttemptId, d['submittedAnswer'] ?? null, d['isCorrect'] ?? null]);
    } else if (event.type === 'task_end') {
      await client.query(`UPDATE task_results SET task_finished_at=$2,completion_status=$3 WHERE task_attempt_id=$1`,
        [event.taskAttemptId, event.timestamp, d['status'] ?? null]);
    }

    if (event.type === 'tutor_request' && event.requestId) {
      await client.query(`INSERT INTO llm_requests(request_id,session_id,task_id,model,started_at,status)
        SELECT $1,$2,$3,llm_model,$4,'started' FROM experiment_sessions WHERE session_id=$2
        ON CONFLICT(request_id) DO NOTHING`, [event.requestId, event.sessionId, d['taskId'] ?? null, event.timestamp]);
      await this.insertMessage(client, event, 'user', String(d['question'] ?? d['userMessage'] ?? ''), String(d['inputMode'] ?? 'text'));
    } else if (event.type === 'tutor_response' && event.requestId) {
      const usage = d['usage'] as Record<string, unknown> | undefined;
      await client.query(`UPDATE llm_requests SET finished_at=$2,input_tokens=$3,output_tokens=$4,status='success',
        technical_retry_count=$5 WHERE request_id=$1`, [event.requestId, event.timestamp,
        usage?.['promptTokens'] ?? null, usage?.['completionTokens'] ?? null, d['technicalRetryCount'] ?? 0]);
      await this.insertMessage(client, event, 'assistant', String(d['content'] ?? ''), null);
    } else if (event.type === 'tutor_error' && event.requestId) {
      await client.query(`UPDATE llm_requests SET finished_at=$2,status='error',error_type=$3 WHERE request_id=$1`,
        [event.requestId, event.timestamp, d['errorType'] ?? 'provider_error']);
    }

    if (event.type.startsWith('stt_') || event.type.startsWith('tts_') || event.type.startsWith('audio_playback_')) {
      await client.query(`INSERT INTO voice_events(event_id,session_id,task_id,transcript,status,error_type,
        speech_started_at,speech_finished_at,stt_started_at,stt_finished_at,tts_started_at,tts_finished_at,
        audio_playback_started_at,audio_playback_finished_at,audio_duration_ms)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(event_id) DO NOTHING`,
      [event.eventId,event.sessionId,d['taskId'] ?? null,d['transcript'] ?? d['originalTranscript'] ?? null,
        d['status'] ?? null,d['errorType'] ?? null,d['speechStartedAt'] ?? null,d['speechFinishedAt'] ?? null,
        d['sttStartedAt'] ?? null,d['sttFinishedAt'] ?? null,d['ttsStartedAt'] ?? null,d['ttsFinishedAt'] ?? null,
        d['audioPlaybackStartedAt'] ?? null,d['audioPlaybackFinishedAt'] ?? null,d['audioDurationMs'] ?? null]);
    }

    const uiTypes = new Set(['task_start','tutor_request','tutor_response','answer_submit','task_end']);
    if (uiTypes.has(event.type)) await client.query(`INSERT INTO ui_events(event_id,session_id,task_id,event_name,created_at,payload)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(event_id) DO NOTHING`,
      [event.eventId,event.sessionId,d['taskId'] ?? null,event.type,event.timestamp,d]);
  }

  private async insertMessage(client: PoolClient, event: StoredEvent, role: string, content: string, inputMode: string | null) {
    await client.query(`INSERT INTO messages(event_id,session_id,task_id,role,content,input_mode,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_id) DO NOTHING`,
      [event.eventId,event.sessionId,event.data['taskId'] ?? null,role,content,inputMode,event.timestamp]);
    await client.query(`UPDATE task_results SET messages_count=messages_count+1,
      hints_count=hints_count+CASE WHEN $2='assistant' THEN 1 ELSE 0 END WHERE task_attempt_id=$1`,
      [event.taskAttemptId, role]);
  }
}
