/**
 * Data export route.
 * GET /api/export/all — full export for researcher (requires RESEARCHER_SECRET)
 * GET /api/export/participant/:id — single participant data
 *
 * Generates JSON and CSV files for analysis.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { StoredEvent } from '../storage/fileStore.js';
import type { EventStore } from '../storage/eventStore.js';
import { requireResearcherAuth } from '../middleware/auth.js';
import type { ServerConfig } from '../config.js';

export function createExportRouter(store: EventStore, config: ServerConfig): Router {
  const router = Router();

  /**
   * GET /api/export/all — full export (researcher only)
   */
  router.get('/all', requireResearcherAuth(config), async (_req: Request, res: Response): Promise<void> => {
    try {
      const events = await store.loadAllEvents();
      const { sessions, taskAttempts, questionnaire } = aggregateData(events);

      res.json({
        exportTimestamp: new Date().toISOString(),
        totalEvents: events.length,
        totalSessions: sessions.length,
        totalTaskAttempts: taskAttempts.length,
        totalQuestionnaireResponses: questionnaire.length,
        events,
        sessions,
        taskAttempts,
        questionnaire,
      });
    } catch (err) {
      console.error('Export error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Export failed' });
    }
  });

  /**
   * GET /api/export/all/csv — CSV export (researcher only)
   */
  router.get('/all/csv', requireResearcherAuth(config), async (_req: Request, res: Response): Promise<void> => {
    try {
      const events = await store.loadAllEvents();
      const { sessions, taskAttempts, questionnaire } = aggregateData(events);

      const eventsCSV = eventsToCSV(events);
      const sessionsCSV = sessionsToCSV(sessions);
      const taskAttemptsCSV = taskAttemptsToCSV(taskAttempts);
      const questionnaireCSV = questionnaireToCSV(questionnaire);

      res.json({
        events_csv: eventsCSV,
        sessions_csv: sessionsCSV,
        task_attempts_csv: taskAttemptsCSV,
        questionnaire_csv: questionnaireCSV,
      });
    } catch (err) {
      console.error('CSV export error:', err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'CSV export failed' });
    }
  });

  const csvRoutes: Array<[string, string, (events: StoredEvent[]) => string]> = [
    ['/events.csv', 'events.csv', eventsToCSV],
    ['/sessions.csv', 'sessions.csv', (events) => sessionsToCSV(aggregateData(events).sessions)],
    ['/task_attempts.csv', 'task_attempts.csv', (events) => taskAttemptsToCSV(aggregateData(events).taskAttempts)],
    ['/questionnaire.csv', 'questionnaire.csv', (events) => questionnaireToCSV(aggregateData(events).questionnaire)],
  ];
  for (const [path, filename, render] of csvRoutes) {
    router.get(path, requireResearcherAuth(config), async (_req: Request, res: Response): Promise<void> => {
      try {
        const csv = render(await store.loadAllEvents());
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
      } catch (err) {
        console.error('CSV export error:', err instanceof Error ? err.message : err);
        res.status(500).json({ error: 'CSV export failed' });
      }
    });
  }

  return router;
}

// ─── Aggregation ───────────────────────────────────────────────────

interface SessionSummary {
  participantId: string;
  sessionId: string;
  scheme: string;
  startTimestamp: string;
  endTimestamp: string | null;
  endReason: string | null;
  browserInfo: string | null;
  totalEvents: number;
  totalBlocks: number;
}

interface TaskAttemptSummary {
  participantId: string;
  sessionId: string;
  blockId: string;
  taskAttemptId: string;
  taskId: string | null;
  inputMode: string | null;
  startTimestamp: string;
  endTimestamp: string | null;
  completionStatus: string | null;
  answerSubmissions: number;
  codeRuns: number;
  tutorRequests: number;
  tutorResponses: number;
  totalDurationMs: number | null;
}

interface QuestionnaireResponse {
  participantId: string;
  sessionId: string;
  blockId: string;
  questionId: string;
  questionText: string;
  response: string;
  timestamp: string;
}

function aggregateData(events: StoredEvent[]): {
  sessions: SessionSummary[];
  taskAttempts: TaskAttemptSummary[];
  questionnaire: QuestionnaireResponse[];
} {
  const sessionsMap = new Map<string, SessionSummary>();
  const attemptsMap = new Map<string, TaskAttemptSummary>();
  const questionnaire: QuestionnaireResponse[] = [];

  for (const event of events) {
    // Sessions
    if (!sessionsMap.has(event.sessionId)) {
      sessionsMap.set(event.sessionId, {
        participantId: event.participantId,
        sessionId: event.sessionId,
        scheme: (event.data?.['scheme'] as string) ?? '',
        startTimestamp: event.timestamp,
        endTimestamp: null,
        endReason: null,
        browserInfo: null,
        totalEvents: 0,
        totalBlocks: 0,
      });
    }
    const session = sessionsMap.get(event.sessionId)!;
    session.totalEvents++;
    if (event.type === 'session_start') {
      session.scheme = (event.data?.['scheme'] as string) ?? session.scheme;
      session.browserInfo = event.data?.['browserInfo'] == null ? null : JSON.stringify(event.data['browserInfo']);
    }
    if (event.type === 'session_end') {
      session.endTimestamp = event.timestamp;
      session.endReason = (event.data?.['reason'] as string) ?? null;
    }
    if (event.type === 'block_start') session.totalBlocks++;

    // Task attempts
    if (event.taskAttemptId && event.taskAttemptId !== '' && event.taskAttemptId !== 'none') {
      if (!attemptsMap.has(event.taskAttemptId)) {
        attemptsMap.set(event.taskAttemptId, {
          participantId: event.participantId,
          sessionId: event.sessionId,
          blockId: event.blockId,
          taskAttemptId: event.taskAttemptId,
          taskId: null,
          inputMode: null,
          startTimestamp: event.timestamp,
          endTimestamp: null,
          completionStatus: null,
          answerSubmissions: 0,
          codeRuns: 0,
          tutorRequests: 0,
          tutorResponses: 0,
          totalDurationMs: null,
        });
      }
      const attempt = attemptsMap.get(event.taskAttemptId)!;
      if (event.type === 'task_start') {
        attempt.taskId = (event.data?.['taskId'] as string) ?? null;
        attempt.inputMode = (event.data?.['mode'] as string) ?? null;
      }
      if (event.type === 'task_end') {
        attempt.endTimestamp = event.timestamp;
        attempt.completionStatus = (event.data?.['status'] as string) ?? null;
        const explicitDuration = event.data?.['durationMs'];
        attempt.totalDurationMs = typeof explicitDuration === 'number'
          ? explicitDuration
          : Math.max(0, Date.parse(event.timestamp) - Date.parse(attempt.startTimestamp));
      }
      if (event.type === 'answer_submit') attempt.answerSubmissions++;
      if (event.type === 'code_run') attempt.codeRuns++;
      if (event.type === 'tutor_request') attempt.tutorRequests++;
      if (event.type === 'tutor_response') attempt.tutorResponses++;
    }

    // Questionnaire
    if (event.type === 'survey_response') {
      const responses = event.data?.['responses'];
      if (responses && typeof responses === 'object') {
        for (const [questionId, response] of Object.entries(responses)) {
          questionnaire.push({ participantId: event.participantId, sessionId: event.sessionId,
            blockId: event.blockId, questionId, questionText: '', response: String(response), timestamp: event.timestamp });
        }
      }
    }
  }

  return {
    sessions: Array.from(sessionsMap.values()),
    taskAttempts: Array.from(attemptsMap.values()),
    questionnaire,
  };
}

// ─── CSV Helpers ──────────────────────────────────────────────────

/** Escape a value for CSV. Prevents formula injection. */
function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  let str = String(value);
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  // Prevent formula injection
  const needsQuoting = str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')
    || str.startsWith("'");
  if (needsQuoting) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const BOM = '\uFEFF';
  const headerLine = headers.map(csvEscape).join(',');
  const dataLines = rows.map((row) => row.map(csvEscape).join(','));
  return BOM + [headerLine, ...dataLines].join('\n');
}

function eventsToCSV(events: StoredEvent[]): string {
  const headers = ['event_id', 'participant_id', 'session_id', 'block_id', 'task_attempt_id',
    'request_id', 'schema_version', 'timestamp', 'monotonic_ms', 'type', 'data_json'];
  const rows = events.map((e) => [
    e.eventId, e.participantId, e.sessionId, e.blockId, e.taskAttemptId,
    e.requestId ?? null, e.schemaVersion, e.timestamp, e.monotonicMs, e.type,
    JSON.stringify(e.data),
  ]);
  return toCSV(headers, rows);
}

function sessionsToCSV(sessions: SessionSummary[]): string {
  const headers = ['participant_id', 'session_id', 'scheme', 'start_timestamp', 'end_timestamp',
    'end_reason', 'browser_info', 'total_events', 'total_blocks'];
  const rows = sessions.map((s) => [
    s.participantId, s.sessionId, s.scheme, s.startTimestamp, s.endTimestamp,
    s.endReason, s.browserInfo, s.totalEvents, s.totalBlocks,
  ]);
  return toCSV(headers, rows);
}

function taskAttemptsToCSV(attempts: TaskAttemptSummary[]): string {
  const headers = ['participant_id', 'session_id', 'block_id', 'task_attempt_id', 'task_id',
    'input_mode', 'start_timestamp', 'end_timestamp', 'completion_status',
    'answer_submissions', 'code_runs', 'tutor_requests', 'tutor_responses', 'total_duration_ms'];
  const rows = attempts.map((a) => [
    a.participantId, a.sessionId, a.blockId, a.taskAttemptId, a.taskId,
    a.inputMode, a.startTimestamp, a.endTimestamp, a.completionStatus,
    a.answerSubmissions, a.codeRuns, a.tutorRequests, a.tutorResponses, a.totalDurationMs,
  ]);
  return toCSV(headers, rows);
}

function questionnaireToCSV(responses: QuestionnaireResponse[]): string {
  const headers = ['participant_id', 'session_id', 'block_id', 'question_id',
    'question_text', 'response', 'timestamp'];
  const rows = responses.map((r) => [
    r.participantId, r.sessionId, r.blockId, r.questionId,
    r.questionText, r.response, r.timestamp,
  ]);
  return toCSV(headers, rows);
}
