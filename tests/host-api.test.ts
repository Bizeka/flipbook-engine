import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = Array.from({ length: 6 }, (_, index) => ({ normal: `api-${index}.png`, low: `api-${index}.png`, thumb: `api-${index}.png` }));
const rect = (left: number, top: number, width: number, height: number) => () => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect;

test('pointToPage maps a viewport point to the page under it and a 0..1 position', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '' });
  await engine.init('', pages);
  const content = document.querySelector('.bk-book .bz-page[data-idx="2"] .bz-page-content') as HTMLElement;
  content.getBoundingClientRect = rect(100, 50, 200, 400);
  assert.deepEqual(engine.pointToPage(150, 250), { pageIndex: 2, x: 0.25, y: 0.5 });
  assert.equal(engine.pointToPage(10, 10), null);
  assert.equal(engine.pointToPage(Number.NaN, 10), null);
  engine.destroy();
});

test('hotspots take host classes and data attributes, invalid ones are dropped', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    hotspots: [{ id: 'h', pageIndex: 0, x: .1, y: .1, width: .2, height: .2, label: 'Video', className: 'sl-video sl-teacher" onclick=x 1bad', data: { kind: 'video', 'item-id': 42, open: true, BadKey: 'x', 'on click': 'y', nested: { a: 1 } as any } }]
  });
  await engine.init('', pages);
  const button = document.querySelector('.bk-hotspot') as HTMLElement;
  assert.ok(button.classList.contains('sl-video'));
  assert.ok(!button.className.includes('teacher"'));
  assert.ok(!button.className.includes('1bad'));
  assert.equal(button.getAttribute('data-kind'), 'video');
  assert.equal(button.getAttribute('data-item-id'), '42');
  assert.equal(button.getAttribute('data-open'), 'true');
  assert.equal(button.getAttribute('data-nested'), null);
  assert.equal([...button.attributes].filter(a => /badkey|on click/i.test(a.name)).length, 0);
  engine.destroy();
});

test('hotspotOpen and hotspotClose follow the open popup', async () => {
  const engine = new FlipbookEngine('#app', {
    soundUrl: '',
    hotspots: [
      { id: 'a', pageIndex: 0, x: .1, y: .1, width: .2, height: .2, label: 'A' },
      { id: 'b', pageIndex: 0, x: .5, y: .1, width: .2, height: .2, label: 'B' }
    ]
  });
  await engine.init('', pages);
  const log: string[] = [];
  engine.on('hotspotOpen', ({ hotspot }) => log.push('open ' + hotspot.id));
  engine.on('hotspotClose', ({ hotspot }) => log.push('close ' + hotspot.id));
  engine.activateHotspot('a');
  engine.activateHotspot('b');
  engine.closeHotspot();
  engine.closeHotspot();
  assert.deepEqual(log, ['open a', 'close a', 'open b', 'close b']);
  engine.destroy();
});
