import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';

test('viewer controls expose accessible names and keyboard thumbnail navigation', async () => {
  const engine = new FlipbookEngine('#app');
  await engine.init('', [
    { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
    { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
  ]);

  const toolbar = document.querySelector('[role="toolbar"]');
  assert.ok(toolbar);
  assert.ok(toolbar?.querySelectorAll('button[type="button"]').length >= 8);
  assert.ok(toolbar?.querySelector('button[aria-label="Thumbnails"]'));
  assert.equal(toolbar?.querySelector('.bz-page-info')?.getAttribute('aria-live'), 'polite');

  const thumb = document.querySelector('.thumb-item') as HTMLElement;
  assert.equal(thumb.getAttribute('role'), 'button');
  assert.equal(thumb.getAttribute('tabindex'), '0');
  const secondThumb = document.querySelectorAll('.thumb-item')[1] as HTMLElement;
  secondThumb.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(engine.getCurrentPage(), 1);

  const viewer = document.querySelector('[role="region"]');
  assert.equal(viewer?.getAttribute('aria-label'), 'Flipbook viewer');
  assert.equal(document.querySelector('.bk-single-img')?.getAttribute('alt'), 'Page 2');
  engine.destroy();
});