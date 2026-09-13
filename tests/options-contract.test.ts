import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';

test('runtime options keep arrow, single-mode, and zoom state consistent', async () => {
  const engine = new FlipbookEngine('#app');
  await engine.init('', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);

  engine.updateOptions({ showArrows: false, isSingleMode: true });
  assert.equal(document.querySelector('.bk-nav-arrows')?.getAttribute('style'), 'display: none;');
  assert.equal(document.querySelector('.bk-single-view')?.getAttribute('style')?.includes('display: flex;'), true);

  engine.setZoom(Number.NaN);
  assert.equal(engine.getZoom(), 1);
  engine.setZoom(99);
  assert.equal(engine.getZoom(), 5);
  engine.destroy();
});