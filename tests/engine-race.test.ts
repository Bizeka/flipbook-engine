import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => ({
  normal: `${prefix}-${index + 1}.png`,
  low: `${prefix}-${index + 1}-low.png`,
  thumb: `${prefix}-${index + 1}-thumb.png`
}));

test('init resolves only after the delayed adapter setup emits init', async () => {
  const engine = new FlipbookEngine('#app');
  let initEvents = 0;
  engine.on('init', () => { initEvents++; });

  const pendingInit = engine.init('ready.pdf', pages(2, 'ready'));
  assert.equal(initEvents, 0);
  await pendingInit;

  assert.equal(initEvents, 1);
  assert.equal(engine.getTotalPages(), 2);
  engine.destroy();
});

test('a newer init cancels stale setup and owns the final DOM', async () => {
  const engine = new FlipbookEngine('#app');
  const firstInit = engine.init('first.pdf', pages(2, 'first'));
  const secondInit = engine.init('second.pdf', pages(3, 'second'));

  await Promise.all([firstInit, secondInit]);

  assert.equal(engine.getTotalPages(), 3);
  assert.equal(document.querySelectorAll('#app .bz-page').length, 3);
  engine.destroy();
});
