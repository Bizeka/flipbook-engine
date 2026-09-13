import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: 'event-1.png', low: 'event-1-low.png', thumb: 'event-1-thumb.png' },
  { normal: 'event-2.png', low: 'event-2-low.png', thumb: 'event-2-thumb.png' },
  { normal: 'event-3.png', low: 'event-3-low.png', thumb: 'event-3-thumb.png' }
];

test('public state changes emit documented events exactly once', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('events.pdf', pages);

  const pageChanges: any[] = [];
  const zoomChanges: any[] = [];
  const modeChanges: any[] = [];
  const thumbChanges: any[] = [];
  engine.on('pageChange', (event) => pageChanges.push(event));
  engine.on('zoomChange', (event) => zoomChanges.push(event));
  engine.on('singlePageModeChange', (event) => modeChanges.push(event));
  engine.on('thumbsToggle', (event) => thumbChanges.push(event));

  engine.goToPage(2);
  engine.setZoom(2);
  engine.setSingleMode(true);
  (document.querySelector('.bk-toolbar .bk-btn') as HTMLElement).click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(pageChanges, [{ currentPage: 2, pageNumber: 3, totalPages: 3, isSingle: false }]);
  assert.deepEqual(zoomChanges, [{ zoom: 2, isActive: true }]);
  assert.deepEqual(modeChanges, [{ isSingle: true }]);
  assert.deepEqual(thumbChanges, [{ showThumbs: false }]);
  engine.destroy();
});

test('goToPage clamps indices to the loaded page range', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('bounds.pdf', pages);
  engine.goToPage(99);
  assert.equal(engine.getCurrentPage(), 2);
  engine.goToPage(-10);
  assert.equal(engine.getCurrentPage(), 0);
  engine.destroy();
});


