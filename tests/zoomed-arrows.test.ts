import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';

test('page arrows step aside while zoomed so a pinch or pan reaches the page', async () => {
  const engine = new FlipbookEngine('#app');
  await engine.init('', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' },
    { normal: '3.png', low: '3-low.png', thumb: '3-thumb.png' }
  ]);
  const arrows = () => Array.from(document.querySelectorAll('.bk-nav-arrow')) as HTMLElement[];
  assert.equal(arrows().length, 2);
  for (const arrow of arrows()) assert.notEqual(arrow.style.pointerEvents, 'none');

  engine.setZoom(2);
  for (const arrow of arrows()) {
    assert.equal(arrow.style.pointerEvents, 'none');
    assert.equal(arrow.style.opacity, '0');
  }

  engine.setZoom(1);
  for (const arrow of arrows()) {
    assert.notEqual(arrow.style.pointerEvents, 'none');
    assert.notEqual(arrow.style.opacity, '0');
  }
  engine.destroy();
});
