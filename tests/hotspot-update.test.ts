import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = Array.from({ length: 6 }, (_, index) => ({ normal: `hu-${index}.png`, low: `hu-${index}.png`, thumb: `hu-${index}.png` }));
const spot = (id: string, pageIndex: number) => ({ id, pageIndex, x: .1, y: .1, width: .2, height: .2, label: id });
const spreadLabels = (pageIndex: number) => [...document.querySelectorAll(`.bk-book .bz-page[data-idx="${pageIndex}"] .bk-hotspot`)].map(e => e.getAttribute('aria-label'));
const singleLabels = () => [...document.querySelectorAll('.bk-single-view .bk-hotspot')].map(e => e.getAttribute('aria-label'));

test('changing hotspots redraws an already built spread', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '', hotspots: [spot('a', 1)] });
  await engine.init('', pages);
  assert.deepEqual(spreadLabels(1), ['a']);
  engine.updateOptions({ hotspots: [spot('b', 1), spot('c', 2)] });
  assert.deepEqual(spreadLabels(1), ['b']);
  assert.deepEqual(spreadLabels(2), ['c']);
  engine.setHotspots([spot('d', 2)]);
  assert.deepEqual(spreadLabels(1), []);
  assert.deepEqual(spreadLabels(2), ['d']);
  engine.destroy();
});

test('changing hotspots redraws the single-page view', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '', singleMode: true, hotspots: [spot('a', 0)] });
  await engine.init('', pages);
  assert.deepEqual(singleLabels(), ['a']);
  engine.setHotspots([spot('b', 0), spot('c', 0)]);
  assert.deepEqual(singleLabels(), ['b', 'c']);
  engine.updateOptions({ hotspots: [] });
  assert.deepEqual(singleLabels(), []);
  engine.destroy();
});

test('removing the open hotspot closes it and emits hotspotClose', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '', hotspots: [spot('a', 0)] });
  await engine.init('', pages);
  const closed: string[] = [];
  engine.on('hotspotClose', ({ hotspot }) => closed.push(hotspot.id));
  engine.activateHotspot('a');
  assert.ok(document.querySelector('.bk-hotspot-popup'));
  engine.setHotspots([]);
  assert.equal(document.querySelector('.bk-hotspot-popup'), null);
  assert.deepEqual(closed, ['a']);
  engine.destroy();
});
