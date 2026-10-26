import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { InteractionManager } from '../src/core/InteractionManager.ts';
import { createFlipbookStore } from '../src/state/store.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
];
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const key = (target: Element, name: string) => target.dispatchEvent(new window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));

function sizedManager() {
  const parent = document.createElement('div');
  const container = document.createElement('div');
  parent.append(container); document.body.append(parent);
  Object.defineProperty(container, 'offsetWidth', { value: 400 });
  Object.defineProperty(container, 'offsetHeight', { value: 600 });
  parent.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600, x: 0, y: 0, toJSON() {} }) as DOMRect;
  const store = createFlipbookStore();
  const manager = new InteractionManager(container, {} as never, store);
  manager.init();
  return { store, manager, container };
}

function touch(container: HTMLElement, type: string, x: number, y: number) {
  const event = new window.Event(type, { bubbles: true, cancelable: true }) as Event & { touches: unknown[]; changedTouches: unknown[] };
  const point = { clientX: x, clientY: y };
  event.touches = type === 'touchend' ? [] : [point]; event.changedTouches = [point];
  container.dispatchEvent(event);
}

test('panning is clamped to the zoomed page and arrow keys pan only when zoomed', () => {
  const { store, manager } = sizedManager();
  manager.zoomIn(); manager.zoomIn();
  assert.equal(store.zoomState.value.scale, 2);
  manager.panBy(-10000, 10000);
  assert.deepEqual([store.zoomState.value.translateX, store.zoomState.value.translateY], [-200, 300]);
  manager.zoomOut();
  assert.ok(Math.abs(store.zoomState.value.translateX) <= 100);
  manager.zoomOut();
  assert.equal(store.zoomState.value.isActive, false);
  manager.panBy(50, 50);
  assert.equal(store.zoomState.value.translateX, 0);
  manager.destroy();
});

test('double tap zooms in around the tap and a second double tap fits the page', () => {
  const { store, container, manager } = sizedManager();
  for (let i = 0; i < 2; i++) { touch(container, 'touchstart', 300, 150); touch(container, 'touchend', 300, 150); }
  assert.equal(store.zoomState.value.scale, 2.5);
  assert.ok(store.zoomState.value.translateX < 0 && store.zoomState.value.translateY > 0);
  for (let i = 0; i < 2; i++) { touch(container, 'touchstart', 300, 150); touch(container, 'touchend', 300, 150); }
  assert.equal(store.zoomState.value.isActive, false);
  assert.equal(store.zoomState.value.translateX, 0);
  manager.destroy();
});

test('pinching back to 1x clears the pan offset', () => {
  const { store, container, manager } = sizedManager();
  const pinch = (type: string, a: number, b: number) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true }) as Event & { touches: unknown[]; changedTouches: unknown[] };
    event.touches = type === 'touchend' ? [] : [{ clientX: 200 - a, clientY: 300 }, { clientX: 200 + b, clientY: 300 }]; event.changedTouches = [];
    container.dispatchEvent(event);
  };
  pinch('touchstart', 20, 20); pinch('touchmove', 80, 80);
  assert.ok(store.zoomState.value.scale > 3);
  manager.panBy(-100, 0);
  pinch('touchend', 0, 0); pinch('touchstart', 80, 80); pinch('touchmove', 10, 10);
  assert.equal(store.zoomState.value.scale, 1);
  assert.deepEqual([store.zoomState.value.translateX, store.zoomState.value.translateY], [0, 0]);
  assert.equal(store.zoomState.value.isActive, false);
  manager.destroy();
});

test('Escape closes one layer at a time', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, annotationProvider: async () => {}, notes: { 0: 'x' } });
  await engine.init('', pages);
  const root = document.querySelector('.bk-wrapper')!;
  (document.querySelector('.bk-btn--notes') as HTMLButtonElement).click();
  await tick();
  const panel = document.querySelector('.bk-notes-panel') as HTMLElement;
  (engine as any).store.pendingAnnotation.value = { id: 'p', pageIndex: 0, x: .5, y: .5, text: '' };
  await tick();
  key(root, 'Escape'); await tick();
  assert.equal(document.querySelector('.bk-note-popover')?.getAttribute('style'), 'display:none;');
  assert.equal(panel.style.display, 'flex');
  key(root, 'Escape'); await tick();
  assert.equal(panel.style.display, 'none');
  engine.destroy();
});

test('arrow keys pan a zoomed page instead of turning it', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false });
  await engine.init('', pages);
  const store = (engine as any).store;
  store.zoomState.value = { ...store.zoomState.value, isActive: true, scale: 2, translateX: 0, translateY: 0 };
  key(document.querySelector('.bk-wrapper')!, 'ArrowRight');
  assert.equal(store.zoomState.value.translateX, -80);
  assert.equal(engine.getCurrentPage(), 0);
  engine.destroy();
});

test('notes tabs expose tab roles and arrow keys switch them', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false });
  await engine.init('', pages);
  (document.querySelector('.bk-btn--notes') as HTMLButtonElement).click();
  await tick();
  const tabs = document.querySelector('.bk-note-tabs') as HTMLElement;
  assert.equal(tabs.getAttribute('role'), 'tablist');
  const [all, page] = [...tabs.querySelectorAll('[role="tab"]')];
  assert.equal(page.getAttribute('aria-selected'), 'true');
  key(all, 'ArrowLeft'); await tick();
  assert.equal(all.getAttribute('aria-selected'), 'true');
  assert.equal(all.getAttribute('tabindex'), '0');
  key(all, 'ArrowRight'); await tick();
  assert.equal(page.getAttribute('aria-selected'), 'true');
  engine.destroy();
});

test('the pin bubble closes on a press outside it', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, singleMode: true,
    annotations: [{ id: 'a', pageIndex: 0, x: .5, y: .5, text: 'Hello' }] });
  await engine.init('', pages);
  const marker = document.querySelector('.bk-annotation-marker') as HTMLButtonElement;
  marker.dispatchEvent(new window.FocusEvent('focus')); await tick();
  assert.ok(document.querySelector('.bk-note-bubble'));
  document.querySelector('.bk-toolbar')!.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
  await tick();
  assert.equal(document.querySelector('.bk-note-bubble'), null);
  engine.destroy();
});
