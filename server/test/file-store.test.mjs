import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileEventStore } from '../dist/storage/fileStore.js';

test('eventId makes event ingestion idempotent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'voicetutor-test-'));
  const store = new FileEventStore(dir);
  await store.init();
  const event = {
    eventId: 'event-1', participantId: 'TEST-1', sessionId: 'session-1',
    blockId: 'block1', taskAttemptId: 'attempt-1', schemaVersion: '2.0',
    appVersion: 'test', experimentConfigVersion: 'test',
    timestamp: '2026-01-01T00:00:00.000Z', monotonicMs: 1,
    type: 'task_start', data: { taskId: 'pilot-a-17', mode: 'text' },
  };
  assert.deepEqual(await store.storeEvents([event]), { stored: 1, duplicates: 0 });
  assert.deepEqual(await store.storeEvents([event]), { stored: 0, duplicates: 1 });
  assert.equal((await store.loadAllEvents()).length, 1);
  assert.equal((await readFile(join(dir, 'TEST-1.jsonl'), 'utf8')).trim().split('\n').length, 1);
});
