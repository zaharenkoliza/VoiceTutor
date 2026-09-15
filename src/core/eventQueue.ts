/**
 * Event Queue — syncs local events to the server.
 *
 * - Sends batches of pending events to POST /api/events
 * - Retries on network failure
 * - Deduplication on server side by eventId
 * - Tracks sync status for UI indicator
 */

import { getPendingEvents, markEventsConfirmed } from './logger.js';
import type { ExperimentEvent } from './logger.js';

const SYNC_INTERVAL_MS = 5_000;   // Sync every 5 seconds
const BATCH_SIZE = 50;
const MAX_RETRY_DELAY_MS = 30_000;

export type QueueStatus = 'idle' | 'syncing' | 'error' | 'offline';

type StatusCallback = (status: QueueStatus, pendingCount: number) => void;

export class EventQueue {
  private apiUrl: string;
  private authToken: string;
  private participantId: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private retryDelay = 1000;
  private statusCallbacks: Set<StatusCallback> = new Set();
  private _pendingCount = 0;
  private _status: QueueStatus = 'idle';

  constructor(apiUrl: string, participantId: string, authToken: string) {
    this.apiUrl = apiUrl;
    this.participantId = participantId;
    this.authToken = authToken;
  }

  /** Start periodic sync */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.sync(), SYNC_INTERVAL_MS);
    // Initial sync
    this.sync();

    // Sync on page visibility change (e.g., tab switch back)
    document.addEventListener('visibilitychange', this.handleVisibility);
    // Sync on page unload
    window.addEventListener('beforeunload', this.handleUnload);
  }

  /** Stop periodic sync */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('beforeunload', this.handleUnload);
  }

  /** Subscribe to status changes */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately notify with current status
    callback(this._status, this._pendingCount);
    return () => this.statusCallbacks.delete(callback);
  }

  get status(): QueueStatus { return this._status; }
  get pendingCount(): number { return this._pendingCount; }

  /** Force a sync now */
  async sync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pending = (await getPendingEvents()).filter((event) => event.participantId === this.participantId);
      this._pendingCount = pending.length;

      if (pending.length === 0) {
        this.setStatus('idle');
        this.isSyncing = false;
        return;
      }

      this.setStatus('syncing');

      // Send in batches
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        const stripped: ExperimentEvent[] = batch.map((stored) => {
          const event = { ...stored } as Partial<typeof stored>;
          delete event.syncStatus;
          return event as ExperimentEvent;
        });

        try {
          const response = await fetch(`${this.apiUrl}/api/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.participantId}:${this.authToken}`,
            },
            body: JSON.stringify({ events: stripped }),
          });

          if (response.ok) {
            const result = await response.json() as { stored: number; duplicates: number };
            const eventIds = batch.map((e) => e.eventId);
            await markEventsConfirmed(eventIds);
            this._pendingCount -= batch.length;
            this.retryDelay = 1000; // Reset retry delay on success
            console.log(`Synced ${result.stored} events (${result.duplicates} duplicates)`);
          } else if (response.status === 429) {
            // Rate limited — back off
            this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY_MS);
            console.warn(`Event sync rate limited, retrying in ${this.retryDelay}ms`);
            break;
          } else {
            console.error(`Event sync failed: ${response.status}`);
            this.setStatus('error');
            break;
          }
        } catch {
          // Network error
          this.setStatus('offline');
          this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_DELAY_MS);
          break;
        }
      }

      // Update final status
      if (this._pendingCount === 0) {
        this.setStatus('idle');
      }
    } catch (err) {
      console.error('Event sync error:', err);
      this.setStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }

  private setStatus(status: QueueStatus): void {
    this._status = status;
    for (const cb of this.statusCallbacks) {
      cb(status, this._pendingCount);
    }
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      this.sync();
    }
  };

  private handleUnload = (): void => {
    // Best-effort sync using sendBeacon
    this.syncBeacon();
  };

  private async syncBeacon(): Promise<void> {
    try {
      const pending = (await getPendingEvents()).filter((event) => event.participantId === this.participantId);
      if (pending.length === 0) return;

      const batch = pending.slice(0, BATCH_SIZE);
      const stripped: ExperimentEvent[] = batch.map((stored) => {
        const event = { ...stored } as Partial<typeof stored>;
        delete event.syncStatus;
        return event as ExperimentEvent;
      });

      navigator.sendBeacon(
        `${this.apiUrl}/api/events?auth=${this.participantId}:${this.authToken}`,
        new Blob([JSON.stringify({ events: stripped })], { type: 'application/json' }),
      );
    } catch {
      // Best effort — ignore errors on unload
    }
  }
}
