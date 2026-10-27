import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: 'one.png', low: 'one.png', thumb: 'one.png' },
  { normal: 'two.png', low: 'two.png', thumb: 'two.png' }
];

test('pressing a hotspot does not reach the page-flip listeners', async () => {
  const engine = new FlipbookEngine('#app', { soundUrl: '', hotspots: [{ id: 'h', pageIndex: 0, x: .1, y: .1, width: .3, height: .2, label: 'Hotspot' }] });
  await engine.init('', pages);
  const book = document.querySelector('.bk-book') as HTMLElement;
  const reached: string[] = [];
  for (const type of ['mousedown', 'pointerdown', 'touchstart']) book.addEventListener(type, () => reached.push(type));
  const hotspot = document.querySelector('.bk-hotspot') as HTMLElement;
  hotspot.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  hotspot.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  hotspot.dispatchEvent(new window.Event('touchstart', { bubbles: true }));
  assert.deepEqual(reached, []);
  hotspot.click();
  assert.ok(document.querySelector('.bk-hotspot-popup'));
  engine.destroy();
});
