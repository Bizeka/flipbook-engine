import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' },
  { normal: '3.png', low: '3-low.png', thumb: '3-thumb.png' }
];

test('host-managed notes normalize, emit changes, and clear without internal persistence', async () => {
  const engine = new FlipbookEngine('#app', { notes: { 0: '  first note  ', 2: 'last', 8: 'ignored' } });
  const changes: Array<{ pageIndex: number; pageNumber: number; note: string | null }> = [];
  engine.on('noteChange', (payload) => changes.push(payload));
  await engine.init('', pages);

  assert.deepEqual(engine.getNotes(), { 0: 'first note', 2: 'last' });
  assert.equal(engine.getNote(0), 'first note');
  engine.setNote(1, '  middle note ');
  assert.equal(engine.getNote(1), 'middle note');
  assert.deepEqual(changes[0], { pageIndex: 1, pageNumber: 2, note: 'middle note' });

  engine.clearNote(1);
  assert.equal(engine.getNote(1), undefined);
  assert.deepEqual(changes[1], { pageIndex: 1, pageNumber: 2, note: null });
  engine.updateOptions({ notes: { 2: 'updated' } });
  assert.deepEqual(engine.getNotes(), { 2: 'updated' });
  engine.destroy();
});
