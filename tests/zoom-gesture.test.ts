import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { clampPan, zoomAt, zoomBaseline, zoomFollow, type ZoomFrame, type ZoomPoint, type ZoomView } from '../src/core/zoomMath.ts';
import { InteractionManager } from '../src/core/InteractionManager.ts';
import { PageFlipAdapter } from '../src/adapters/PageFlipAdapter.ts';
import { FlipbookEngine } from '../src/engine.ts';
import { createFlipbookStore } from '../src/state/store.ts';

const frame: ZoomFrame = { cx: 200, cy: 300, width: 400, height: 600 };
/** Where the content point at offset u from the untransformed centre is drawn. */
const screen = (view: ZoomView, u: ZoomPoint) => ({ x: frame.cx + view.x + view.scale * u.x, y: frame.cy + view.y + view.scale * u.y });
/** The content point drawn at a screen point. */
const content = (view: ZoomView, p: ZoomPoint) => ({ x: (p.x - frame.cx - view.x) / view.scale, y: (p.y - frame.cy - view.y) / view.scale });
const near = (actual: ZoomPoint, expected: ZoomPoint) => {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9, `${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
};
const mid = (a: ZoomPoint, b: ZoomPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

test('a pinch keeps the content point under the fingers under the fingers', () => {
  const start: ZoomView = { scale: 1.5, x: 20, y: -30 };
  const a0 = { x: 150, y: 280 }, b0 = { x: 250, y: 320 };
  const anchor = content(start, mid(a0, b0));
  const base = zoomBaseline(start, [a0, b0]);
  // Fingers spread and drift together, as a real pinch does.
  for (const [a, b] of [[{ x: 140, y: 270 }, { x: 262, y: 333 }], [{ x: 120, y: 250 }, { x: 300, y: 360 }], [{ x: 110, y: 260 }, { x: 290, y: 380 }]] as const) {
    const view = zoomFollow(base, [a, b], frame);
    assert.ok(view.scale > start.scale);
    near(screen(view, anchor), mid(a, b));
  }
});

test('pinch scale stays within 1..5 and falls back to the unzoomed view at 1', () => {
  const base = zoomBaseline({ scale: 2, x: 50, y: 0 }, [{ x: 190, y: 300 }, { x: 210, y: 300 }]);
  assert.equal(zoomFollow(base, [{ x: 0, y: 300 }, { x: 400, y: 300 }], frame).scale, 5);
  assert.deepEqual(zoomFollow(base, [{ x: 199, y: 300 }, { x: 201, y: 300 }], frame), { scale: 1, x: 0, y: 0 });
});

test('pan is clamped so the zoomed page keeps covering its box', () => {
  assert.deepEqual(clampPan(-10000, 10000, 2, 400, 600), { x: -200, y: 300 });
  assert.deepEqual(clampPan(10, 20, 2, 0, 0), { x: 10, y: 20 });
  const base = zoomBaseline({ scale: 2, x: 0, y: 0 }, [{ x: 100, y: 100 }]);
  assert.deepEqual(zoomFollow(base, [{ x: 900, y: -900 }], frame), { scale: 2, x: 200, y: -300 });
});

test('one finger pans a zoomed view 1:1 and leaves an unzoomed view alone', () => {
  const start: ZoomView = { scale: 3, x: 10, y: 10 };
  const view = zoomFollow(zoomBaseline(start, [{ x: 100, y: 100 }]), [{ x: 130, y: 80 }], frame);
  assert.deepEqual(view, { scale: 3, x: 40, y: -10 });
  const flat: ZoomView = { scale: 1, x: 0, y: 0 };
  assert.deepEqual(zoomFollow(zoomBaseline(flat, [{ x: 100, y: 100 }]), [{ x: 180, y: 100 }], frame), flat);
});

test('a move with a different finger count than the baseline does not move the view', () => {
  const start: ZoomView = { scale: 2, x: 5, y: 5 };
  const base = zoomBaseline(start, [{ x: 100, y: 100 }]);
  assert.deepEqual(zoomFollow(base, [{ x: 100, y: 100 }, { x: 300, y: 100 }], frame), start);
});

test('zooming at a point keeps that point in place', () => {
  const view = zoomAt({ x: 260, y: 330 }, 2.5, frame);
  near(screen(view, content({ scale: 1, x: 0, y: 0 }, { x: 260, y: 330 })), { x: 260, y: 330 });
});

type TouchPoint = { clientX: number; clientY: number };
function setup(single = false) {
  const parent = document.createElement('div'), container = document.createElement('div');
  parent.append(container); document.body.append(parent);
  Object.defineProperty(container, 'offsetWidth', { value: 400 });
  Object.defineProperty(container, 'offsetHeight', { value: 600 });
  const store = createFlipbookStore();
  store.isSingleMode.value = single;
  // The untransformed box sits at 0,0; the browser reports it scaled around its centre and translated.
  container.getBoundingClientRect = () => {
    const { scale, translateX, translateY } = store.zoomState.value;
    const width = 400 * scale, height = 600 * scale, left = 200 + translateX - width / 2, top = 300 + translateY - height / 2;
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} } as DOMRect;
  };
  const calls: string[] = [];
  const adapter = { turnToNextPage: () => calls.push('next'), turnToPrevPage: () => calls.push('prev'), cancelUserTouch: () => calls.push('cancel') };
  const manager = new InteractionManager(container, adapter as never, store);
  manager.init();
  const send = (type: string, touches: TouchPoint[], changed: TouchPoint[] = touches) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true }) as Event & { touches: TouchPoint[]; changedTouches: TouchPoint[] };
    event.touches = touches; event.changedTouches = changed;
    container.dispatchEvent(event);
    return event;
  };
  const view = (): ZoomView => ({ scale: store.zoomState.value.scale, x: store.zoomState.value.translateX, y: store.zoomState.value.translateY });
  return { store, container, manager, send, view, calls };
}
const p = (x: number, y: number): TouchPoint => ({ clientX: x, clientY: y });
const at = (t: TouchPoint) => ({ x: t.clientX, y: t.clientY });

test('the reader pinch follows the fingers, and adding or lifting a finger never jumps', () => {
  const { send, view, calls, container, manager } = setup();
  const a = p(150, 300), b = p(250, 300);
  send('touchstart', [a]);
  const start = send('touchstart', [a, b], [b]);
  assert.ok(start.defaultPrevented, 'the browser must not handle the pinch');
  assert.deepEqual(calls, ['cancel'], 'page-flip forgets the first finger');
  const anchor = content(view(), mid(at(a), at(b)));
  const a1 = p(100, 280), b1 = p(320, 330);
  assert.ok(send('touchmove', [a1, b1]).defaultPrevented);
  near(screen(view(), anchor), mid(at(a1), at(b1)));
  assert.equal(container.style.willChange, 'transform');
  assert.equal(container.style.transition, 'none');

  // Lift one finger: nothing moves; the remaining finger then pans 1:1 from where it is.
  const before = view();
  send('touchend', [a1], [b1]);
  assert.deepEqual(view(), before);
  const under = content(view(), at(a1));
  const a2 = p(60, 250);
  send('touchmove', [a2]);
  near(screen(view(), under), at(a2));

  // Put a second finger down again: no jump, and the pinch carries on from the current view.
  const settled = view();
  const b3 = p(200, 400);
  send('touchstart', [a2, b3], [b3]);
  send('touchmove', [a2, b3]);
  assert.deepEqual(view(), settled);
  const pinchAnchor = content(view(), mid(at(a2), at(b3)));
  const a4 = p(50, 240), b4 = p(230, 430);
  send('touchmove', [a4, b4]);
  near(screen(view(), pinchAnchor), mid(at(a4), at(b4)));

  send('touchend', [a4], [b4]); send('touchend', [], [a4]);
  assert.equal(container.style.willChange, '');
  assert.ok(!calls.includes('next') && !calls.includes('prev'));
  manager.destroy();
});

test('a pinch in single-page mode never turns the page, even when it ends with a long one-finger slide', () => {
  const { send, calls, store, manager } = setup(true);
  const a = p(300, 300), b = p(320, 300);
  send('touchstart', [a]); send('touchstart', [a, b], [b]);
  send('touchmove', [p(301, 300), p(319, 300)]);
  assert.equal(store.zoomState.value.isActive, false);
  send('touchend', [p(301, 300)], [p(319, 300)]);
  const slid = send('touchmove', [p(100, 300)]);
  assert.ok(slid.defaultPrevented, 'the rest of a pinch is not a scroll');
  send('touchend', [], [p(100, 300)]);
  assert.deepEqual(calls, ['cancel']);
  // A plain swipe still turns the page.
  send('touchstart', [p(300, 300)]); send('touchend', [], [p(150, 300)]);
  assert.deepEqual(calls, ['cancel', 'next']);
  manager.destroy();
});

test('one unzoomed finger is left to the browser and page-flip', () => {
  const { send, manager } = setup();
  const down = send('touchstart', [p(100, 100)]);
  const move = send('touchmove', [p(100, 160)]);
  assert.ok(!down.defaultPrevented && !move.defaultPrevented);
  manager.destroy();
});

test('double tap zooms into the tapped point and animates back out', () => {
  const { send, view, container, manager } = setup();
  const tap = () => { send('touchstart', [p(260, 330)]); send('touchend', [], [p(260, 330)]); };
  tap(); tap();
  assert.equal(view().scale, 2.5);
  near(screen(view(), content({ scale: 1, x: 0, y: 0 }, { x: 260, y: 330 })), { x: 260, y: 330 });
  tap(); tap();
  assert.equal(view().scale, 1);
  assert.equal(container.style.transition, 'transform 0.3s ease');
  manager.destroy();
});

test('page-flip forgets a pending touch when a pinch starts', () => {
  const adapter = Object.create(PageFlipAdapter.prototype) as PageFlipAdapter;
  const ui = { touchPoint: { point: { x: 1, y: 1 }, time: 0 } as unknown };
  const lib = { getUI: () => ui, isUserTouch: true, isUserMove: false, stopped: false, userStop() { this.stopped = true; } };
  (adapter as unknown as { pageFlip: unknown }).pageFlip = lib;
  adapter.cancelUserTouch();
  assert.equal(ui.touchPoint, null);
  assert.equal(lib.isUserTouch, false);
  assert.equal(lib.stopped, false);
  lib.isUserTouch = true; lib.isUserMove = true;
  adapter.cancelUserTouch();
  assert.equal(lib.stopped, true, 'a fold already under way is released');
  (adapter as unknown as { pageFlip: unknown }).pageFlip = null;
  adapter.cancelUserTouch();
});

test('zoom steps do not rebuild the single page, only swap its image to full quality', async () => {
  const engine = new FlipbookEngine('#app', { soundEnabled: false, singleMode: true });
  await engine.init('', [{ normal: '1.png', low: '1-low.png', thumb: '1-t.png' }, { normal: '2.png', low: '2-low.png', thumb: '2-t.png' }]);
  const store = (engine as unknown as { store: ReturnType<typeof createFlipbookStore> }).store;
  const page = document.querySelector('.bk-single-page');
  const img = document.querySelector('.bk-single-img') as HTMLImageElement;
  assert.ok(page && img.getAttribute('src')?.endsWith('1-low.png'));
  for (const scale of [1.2, 1.7, 2.4, 3.1]) store.zoomState.value = { ...store.zoomState.value, isActive: true, scale, translateX: scale, translateY: -scale };
  assert.equal(document.querySelector('.bk-single-page'), page);
  assert.equal(document.querySelector('.bk-single-img'), img);
  assert.ok(img.getAttribute('src')?.endsWith('1.png') && !img.getAttribute('src')?.endsWith('1-low.png'));
  engine.destroy();
});

test('a swipe that starts on a page arrow turns the page, a tap on it does not', () => {
  const { send, calls, container, manager } = setup(false);
  const arrow = document.createElement('button');
  arrow.className = 'bk-nav-arrow';
  container.append(arrow);
  const sendOn = (type: string, touches: TouchPoint[], changed: TouchPoint[] = touches) => {
    const event = new window.Event(type, { bubbles: true, cancelable: true }) as Event & { touches: TouchPoint[]; changedTouches: TouchPoint[] };
    event.touches = touches; event.changedTouches = changed;
    arrow.dispatchEvent(event);
    return event;
  };
  sendOn('touchstart', [p(300, 300)]);
  const end = sendOn('touchend', [], [p(150, 305)]);
  assert.deepEqual(calls, ['next']);
  assert.ok(end.defaultPrevented, 'the swipe must not also click the arrow');
  sendOn('touchstart', [p(100, 300)]);
  sendOn('touchend', [], [p(250, 300)]);
  assert.deepEqual(calls, ['next', 'prev']);
  // A tap, or a mostly vertical drag, leaves the button alone.
  sendOn('touchstart', [p(300, 300)]);
  assert.equal(sendOn('touchend', [], [p(302, 301)]).defaultPrevented, false);
  sendOn('touchstart', [p(300, 300)]); sendOn('touchend', [], [p(340, 500)]);
  assert.deepEqual(calls, ['next', 'prev']);
  void send;
  manager.destroy();
});
