/**
 * JSONL file-based event storage.
 *
 * Design decisions:
 * - One JSONL file per participant (easy backup, no DB dependency)
 * - Append-only writes for durability
 * - Deduplication by eventId (checked on read and before write)
 * - Simple file-system based — suitable for small-scale research
 *
 * Backup strategy: copy the data/ directory.
 */

import { readFile, appendFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface StoredEvent {
  eventId: string;
  participantId: string;
  sessionId: string;
  blockId: string;
  taskAttemptId: string;
  requestId?: string;
  schemaVersion: string;
  appVersion: string;
  experimentConfigVersion: string;
  timestamp: string;
  monotonicMs: number;
  type: string;
  data: Record<string, unknown>;
}

export class FileEventStore {
  private dataDir: string;
  /** In-memory set of seen eventIds per participant for dedup */
  private seenEvents: Map<string, Set<string>> = new Map();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async init(): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Store a batch of events. Returns count of new events stored (excluding duplicates).
   */
  async storeEvents(events: StoredEvent[]): Promise<{ stored: number; duplicates: number }> {
    let stored = 0;
    let duplicates = 0;

    // Group by participant
    const byParticipant = new Map<string, StoredEvent[]>();
    for (const event of events) {
      const list = byParticipant.get(event.participantId) ?? [];
      list.push(event);
      byParticipant.set(event.participantId, list);
    }

    for (const [participantId, participantEvents] of byParticipant) {
      const seen = await this.getSeenIds(participantId);
      const newEvents: StoredEvent[] = [];

      for (const event of participantEvents) {
        if (seen.has(event.eventId)) {
          duplicates++;
        } else {
          newEvents.push(event);
          seen.add(event.eventId);
        }
      }

      if (newEvents.length > 0) {
        const filePath = this.participantFilePath(participantId);
        const lines = newEvents.map((e) => JSON.stringify(e)).join('\n') + '\n';
        await appendFile(filePath, lines, 'utf-8');
        stored += newEvents.length;
      }
    }

    return { stored, duplicates };
  }

  /**
   * Load all events for a participant.
   */
  async loadParticipantEvents(participantId: string): Promise<StoredEvent[]> {
    const filePath = this.participantFilePath(participantId);
    if (!existsSync(filePath)) return [];

    const content = await readFile(filePath, 'utf-8');
    const events: StoredEvent[] = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as StoredEvent);
      } catch {
        console.warn(`Skipping malformed JSONL line in ${filePath}`);
      }
    }

    return events;
  }

  /**
   * Load all events across all participants.
   */
  async loadAllEvents(): Promise<StoredEvent[]> {
    if (!existsSync(this.dataDir)) return [];

    const files = await readdir(this.dataDir);
    const allEvents: StoredEvent[] = [];

    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const participantId = file.replace('.jsonl', '');
      const events = await this.loadParticipantEvents(participantId);
      allEvents.push(...events);
    }

    return allEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * List all participant IDs that have data.
   */
  async listParticipants(): Promise<string[]> {
    if (!existsSync(this.dataDir)) return [];
    const files = await readdir(this.dataDir);
    return files.filter((f) => f.endsWith('.jsonl')).map((f) => f.replace('.jsonl', ''));
  }

  private participantFilePath(participantId: string): string {
    // Sanitize participant ID to prevent path traversal
    const safe = participantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.dataDir, `${safe}.jsonl`);
  }

  private async getSeenIds(participantId: string): Promise<Set<string>> {
    if (this.seenEvents.has(participantId)) {
      return this.seenEvents.get(participantId)!;
    }

    const events = await this.loadParticipantEvents(participantId);
    const seen = new Set(events.map((e) => e.eventId));
    this.seenEvents.set(participantId, seen);
    return seen;
  }
}
