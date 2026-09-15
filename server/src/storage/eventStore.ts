import type { StoredEvent } from './fileStore.js';

export interface EventStore {
  init(): Promise<void>;
  storeEvents(events: StoredEvent[]): Promise<{ stored: number; duplicates: number }>;
  loadAllEvents(): Promise<StoredEvent[]>;
}
