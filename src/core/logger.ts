/**
 * Experiment event logger — types, creation, and local persistence.
 *
 * Design:
 * - Every user action = one ExperimentEvent with UUID eventId
 * - Events are first stored in IndexedDB (survives page reload)
 * - Then synced to server via EventQueue
 * - Deduplication by eventId on both client and server
 *
 * Timestamps: UTC ISO 8601 for cross-session comparison,
 * performance.now() monotonic timer for intra-page durations.
 * Monotonic values from different page loads are NOT comparable.
 *
 * Null vs zero: missing values are null, not 0.
 */

import { SCHEMA_VERSION, APP_VERSION, EXPERIMENT_CONFIG_VERSION } from './experiment/config.js';

// ─── Event Types ────────────────────────────────────────────────────

export type EventType =
  | 'session_start' | 'session_end'
  | 'block_start' | 'block_end'
  | 'task_start' | 'task_end'
  | 'code_edit' | 'code_run' | 'code_result' | 'code_stop'
  | 'answer_submit' | 'answer_result'
  | 'tutor_request' | 'tutor_response' | 'tutor_error'
  | 'stt_start' | 'stt_result' | 'stt_error' | 'stt_confirm'
  | 'tts_start' | 'tts_result' | 'tts_error'
  | 'audio_playback_start' | 'audio_playback_end'
  | 'voice_edit'
  | 'mic_error'
  | 'survey_response'
  | 'system_check'
  | 'consent'
  | 'page_visibility' | 'page_unload'
  | 'session_interrupt' | 'session_resume'
  | 'technical_error';

// ─── Core Event Interface ───────────────────────────────────────────

export interface ExperimentEvent {
  eventId: string;
  participantId: string;
  sessionId: string;
  blockId: string;
  taskAttemptId: string;
  requestId?: string;

  schemaVersion: string;
  appVersion: string;
  experimentConfigVersion: string;

  timestamp: string;        // UTC ISO 8601
  monotonicMs: number;      // performance.now()

  type: EventType;
  data: Record<string, unknown>;
}

// ─── Event Sync Status ─────────────────────────────────────────────

export type SyncStatus = 'pending' | 'sent' | 'confirmed';

export interface StoredEvent extends ExperimentEvent {
  syncStatus: SyncStatus;
}

// ─── Monotonic timer baseline ───────────────────────────────────────

/** Page load timestamp for correlating monotonic timer with wall clock */
const PAGE_LOAD_TIMESTAMP = new Date().toISOString();
const PAGE_LOAD_MONOTONIC = performance.now();

export function getPageLoadInfo() {
  return { timestamp: PAGE_LOAD_TIMESTAMP, monotonicMs: PAGE_LOAD_MONOTONIC };
}

// ─── Event Factory ─────────────────────────────────────────────────

interface EventContext {
  participantId: string;
  sessionId: string;
  blockId: string;
  taskAttemptId: string;
}

export function createEvent(
  context: EventContext,
  type: EventType,
  data: Record<string, unknown> = {},
  requestId?: string,
): ExperimentEvent {
  return {
    eventId: crypto.randomUUID(),
    participantId: context.participantId,
    sessionId: context.sessionId,
    blockId: context.blockId,
    taskAttemptId: context.taskAttemptId,
    requestId,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    experimentConfigVersion: EXPERIMENT_CONFIG_VERSION,
    timestamp: new Date().toISOString(),
    monotonicMs: performance.now(),
    type,
    data,
  };
}

// ─── IndexedDB Storage ─────────────────────────────────────────────

const DB_NAME = 'voicetutor_events';
const DB_VERSION = 1;
const STORE_NAME = 'events';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'eventId' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('participantId', 'participantId', { unique: false });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
  });
}

/** Store event locally in IndexedDB */
export async function storeEventLocally(event: ExperimentEvent): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const stored: StoredEvent = { ...event, syncStatus: 'pending' };
  store.put(stored);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Get all pending events */
export async function getPendingEvents(): Promise<StoredEvent[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('syncStatus');
  const request = index.getAll('pending');

  const events = await new Promise<StoredEvent[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredEvent[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return events;
}

/** Mark events as confirmed */
export async function markEventsConfirmed(eventIds: string[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  for (const id of eventIds) {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const event = getReq.result as StoredEvent | undefined;
      if (event) {
        event.syncStatus = 'confirmed';
        store.put(event);
      }
    };
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Get all events for a session (for local export / recovery) */
export async function getSessionEvents(sessionId: string): Promise<StoredEvent[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('sessionId');
  const request = index.getAll(sessionId);

  const events = await new Promise<StoredEvent[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as StoredEvent[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return events;
}

// ─── Legacy CSV Export (for backward compatibility) ─────────────────

/** Escape a value for CSV (RFC 4180 + formula protection). */
export function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  let str = String(value);
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  const needsQuoting = str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')
    || str.startsWith("'");
  if (needsQuoting) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Trigger a browser download of a string as file. */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Legacy free-training logger. Kept separate from research events so existing
// training mode remains usable while research data uses IndexedDB + server sync.
export type Condition = 'with_tutor' | 'without_tutor';
export type SessionResult = 'solved' | 'unsolved';
export type ErrorCategory = 'syntax' | 'runtime' | 'logic' | 'none';
export interface LogEvent {
  timestamp: string;
  type: 'voice_query' | 'tutor_response' | 'code_run' | 'code_result';
  content: string;
  latencyMs?: number;
  confidence?: number;
  sttEndTimestamp?: string;
  isFirstRun?: boolean;
  errorCategory?: ErrorCategory;
}
export interface Session {
  id: string;
  taskId: string;
  taskNumber: number;
  taskTitle: string;
  condition: Condition;
  startedAt: string;
  endedAt: string | null;
  events: LogEvent[];
  finalCode: string;
  result: SessionResult | null;
  hintCount: number;
  firstRunCorrect: boolean | null;
  dialogCompleted: boolean | null;
  voiceQueryCount: number;
}

const LEGACY_STORAGE_KEY = 'voicetutor_sessions';
export const generateSessionId = (): string => crypto.randomUUID();
export function loadSessions(): Session[] {
  try { return JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]') as Session[]; }
  catch { return []; }
}
export function saveSessions(sessions: Session[]): void {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(sessions));
}
export function exportSessionsToCSV(sessions: Session[]): string {
  const headers = ['session_id', 'task_id', 'started_at', 'ended_at', 'result', 'event_timestamp', 'event_type', 'event_content', 'final_code'];
  const rows: Array<Array<string | number | null>> = [];
  for (const session of sessions) {
    if (session.events.length === 0) {
      rows.push([session.id, session.taskId, session.startedAt, session.endedAt, session.result, null, null, null, session.finalCode]);
    } else {
      for (const event of session.events) {
        rows.push([session.id, session.taskId, session.startedAt, session.endedAt, session.result, event.timestamp, event.type, event.content, session.finalCode]);
      }
    }
  }
  return [headers.join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
}
export function downloadCSV(csv: string, filename: string): void {
  downloadFile(csv, filename);
}
