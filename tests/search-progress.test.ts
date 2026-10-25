import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
];

test('search provider progress is bounded, emitted and cleared when the search ends', async () => {
  const seen: Array<{ query: string; completed: number; total: number }> = [];
  let duringSearch: { completed: number; total: number } | null = null;
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false,
    searchProvider: async (_query, _options, _signal, reportProgress) => {
      reportProgress?.({ completed: 1, total: 4 });
      reportProgress?.({ completed: 9, total: 4 });
      duringSearch = (engine as any).store.searchProgress.value;
      reportProgress?.({ completed: Number.NaN, total: Number.NaN });
      return [];
    } });
  engine.on('searchProgress', (payload) => seen.push(payload));
  await engine.init('', pages);
  await engine.search('needle');
  assert.deepEqual(seen, [
    { query: 'needle', completed: 1, total: 4 },
    { query: 'needle', completed: 4, total: 4 },
    { query: 'needle', completed: 0, total: 0 }
  ]);
  assert.deepEqual(duringSearch, { completed: 4, total: 4 });
  assert.equal((engine as any).store.searchProgress.value, null);
  engine.destroy();
});

test('stale search progress from a superseded query is ignored and providers without reporting still work', async () => {
  const seen: number[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const engine = new FlipbookEngine('#app', { soundEnabled: false, showThumbs: false,
    searchProvider: async (query, _options, _signal, reportProgress) => {
      if (query === 'slow') { await gate; reportProgress?.({ completed: 3, total: 3 }); }
      return [];
    } });
  engine.on('searchProgress', (payload) => seen.push(payload.completed));
  await engine.init('', pages);
  const slow = engine.search('slow');
  await engine.search('fast');
  release();
  await slow;
  assert.deepEqual(seen, []);
  engine.destroy();
});
