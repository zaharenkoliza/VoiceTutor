/**
 * Session logger — types, persistence & CSV export utilities.
 *
 * Collects raw interaction data for future analysis (НИР-3).
 * Does NOT compute any metrics — only stores timestamps, transcripts,
 * confidence scores, error categories, and other raw fields needed to
 * calculate voice-channel metrics (WER, CER, IRA, in-domain coverage,
 * response latency) and task-level metrics per ISO 9241-11 (TSR, TtS,
 * Hint Count, FCRR, error typology, DCR) in the experiment phase.
 *
 * Design:
 *  - One JSON object per session (one task = one session).
 *  - All sessions stored in localStorage under key "voicetutor_sessions".
 *  - CSV export: one row per event, session metadata duplicated for flat analysis.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type EventType = 'voice_query' | 'tutor_response' | 'code_run' | 'code_result';

/**
 * Experimental condition: with or without the AI tutor.
 * НИР-3 groundwork — A/B comparison between conditions will be
 * implemented during the experiment phase.
 */
export type Condition = 'with_tutor' | 'without_tutor';

export type SessionResult = 'solved' | 'unsolved';

/** Error category for code execution results (for future error typology analysis). */
export type ErrorCategory = 'syntax' | 'runtime' | 'logic' | 'none';

export interface LogEvent {
  timestamp: string;          // ISO 8601
  type: EventType;
  content: string;            // transcription / AI reply / code / stdout+stderr
  latencyMs?: number;         // only for tutor_response — AI API call duration
  /** STT confidence score (0–1), from Web Speech API. For future WER/CER analysis. */
  confidence?: number;
  /** Timestamp when STT finalized the transcript. For full voice-to-response latency. */
  sttEndTimestamp?: string;   // ISO 8601
  /** True if this is the first code_run in the session. For FCRR metric. */
  isFirstRun?: boolean;
  /** Error category for code_result events. For error typology analysis. */
  errorCategory?: ErrorCategory;
}

export interface Session {
  id: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  condition: Condition;
  startedAt: string;          // ISO 8601
  endedAt: string | null;
  events: LogEvent[];
  finalCode: string;
  result: SessionResult | null; // null = in progress
  /** Number of tutor hints given during the session. For Hint Count metric. */
  hintCount: number;
  /** Whether the first code run produced the correct answer. For FCRR metric. */
  firstRunCorrect: boolean | null;
  /** Whether the voice dialog was used and led to a solution. For DCR metric. */
  dialogCompleted: boolean | null;
  /** Total number of voice queries in the session. For in-domain coverage analysis. */
  voiceQueryCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'voicetutor_sessions';

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

/** Escape a value for CSV (RFC 4180). */
function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADERS = [
  'session_id',
  'task_number',
  'task_title',
  'condition',
  'started_at',
  'ended_at',
  'result',
  'hint_count',
  'first_run_correct',
  'dialog_completed',
  'voice_query_count',
  'event_timestamp',
  'event_type',
  'event_content',
  'latency_ms',
  'confidence',
  'stt_end_timestamp',
  'is_first_run',
  'error_category',
  'final_code',
] as const;

/**
 * Convert all sessions to a flat CSV string.
 * One row per event; sessions with zero events still get one summary row.
 */
export function exportSessionsToCSV(sessions: Session[]): string {
  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const s of sessions) {
    const base = [
      csvEscape(s.id),
      String(s.taskNumber),
      csvEscape(s.taskTitle),
      s.condition,
      s.startedAt,
      s.endedAt ?? '',
      s.result ?? '',
      String(s.hintCount ?? 0),
      s.firstRunCorrect != null ? String(s.firstRunCorrect) : '',
      s.dialogCompleted != null ? String(s.dialogCompleted) : '',
      String(s.voiceQueryCount ?? 0),
    ];

    if (s.events.length === 0) {
      // Summary-only row
      rows.push([...base, '', '', '', '', '', '', '', '', csvEscape(s.finalCode)].join(','));
    } else {
      for (const ev of s.events) {
        rows.push(
          [
            ...base,
            ev.timestamp,
            ev.type,
            csvEscape(ev.content),
            ev.latencyMs != null ? String(ev.latencyMs) : '',
            ev.confidence != null ? String(ev.confidence) : '',
            ev.sttEndTimestamp ?? '',
            ev.isFirstRun != null ? String(ev.isFirstRun) : '',
            ev.errorCategory ?? '',
            csvEscape(s.finalCode),
          ].join(','),
        );
      }
    }
  }

  return rows.join('\n');
}

/** Trigger a browser download of a CSV string. */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
