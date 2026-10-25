import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
];

function deferred() {
  let resolve!: () => void; let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('optimistic notes apply at once, keep order and roll back only the newest failing edit', async () => {
  const gates: Array<ReturnType<typeof deferred>> = [];
  const persisted: Array<string | null> = [];
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, optimisticNotes: true,
    noteProvider: (_page, note) => { persisted.push(note); const gate = deferred(); gates.push(gate); return gate.promise; } });
  await engine.init('', pages);

  assert.equal(await engine.saveNote(0, 'first'), true);
  assert.equal(engine.getNote(0), 'first');
  assert.equal((engine as any).store.notesSaving.value, false);
  assert.equal(await engine.saveNote(0, 'second'), true);
  assert.equal(engine.getNote(0), 'second');
  await Promise.resolve();
  assert.deepEqual(persisted, ['first']);

  gates[0].reject(new Error('older save failed'));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.getNote(0), 'second', 'an older failure must not roll back a newer edit');
  gates[1].reject(new Error('newer save failed'));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(persisted, ['first', 'second']);
  assert.equal(engine.getNote(0), undefined);
  assert.equal((engine as any).store.notesFailed.value, true);
  engine.destroy();
});

test('optimistic coordinate notes roll back a failed save and a failed delete', async () => {
  let fail = false;
  const changes: string[] = [];
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false, singleMode: true, optimisticNotes: true,
    annotations: [{ id: 'kept', pageIndex: 0, x: .1, y: .1, text: 'Kept' }],
    annotationProvider: async () => { if (fail) throw new Error('offline'); } });
  engine.on('annotationChange', ({ annotation, action }) => changes.push(`${action}:${annotation.id}`));
  await engine.init('', pages);

  fail = true;
  assert.equal(await engine.saveAnnotation({ id: 'fresh', pageIndex: 0, x: .5, y: .5, text: 'Fresh' }), true);
  assert.equal(engine.getAnnotations(0).some(note => note.id === 'fresh'), true);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.getAnnotations(0).some(note => note.id === 'fresh'), false);

  assert.equal(await engine.saveAnnotation({ id: 'kept', pageIndex: 0, x: .1, y: .1, text: 'Kept' }, 'delete'), true);
  assert.equal(engine.getAnnotations(0).some(note => note.id === 'kept'), false);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(engine.getAnnotations(0).some(note => note.id === 'kept'), true);
  assert.equal((engine as any).store.notesFailed.value, true);
  assert.deepEqual(changes, ['save:fresh', 'delete:fresh', 'delete:kept', 'save:kept']);
  engine.destroy();
});
