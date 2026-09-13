import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';

class MockIntersectionObserver {
  static latest: MockIntersectionObserver | null = null;
  private readonly callback: IntersectionObserverCallback;
  readonly observed: Element[] = [];
  disconnected = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.latest = this;
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve(element: Element) {
    const index = this.observed.indexOf(element);
    if (index >= 0) this.observed.splice(index, 1);
  }

  disconnect() {
    this.disconnected = true;
    this.observed.length = 0;
  }

  trigger(element: Element) {
    this.callback([{ target: element, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

test('visible page images upgrade from low to normal quality', async (t) => {
  const originalObserver = window.IntersectionObserver;
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  t.after(() => {
    window.IntersectionObserver = originalObserver;
  });

  const engine = new FlipbookEngine('#app');
  await engine.init('', [
    { normal: 'high-1.png', low: 'low-1.png', thumb: 'thumb-1.png' },
    { normal: 'high-2.png', low: 'low-2.png', thumb: 'thumb-2.png' }
  ]);

  const image = document.querySelector('.page-content') as HTMLImageElement;
  assert.equal(image.getAttribute('src'), 'low-1.png');
  assert.equal(image.getAttribute('data-src'), 'high-1.png');
  MockIntersectionObserver.latest?.trigger(image);
  assert.equal(image.getAttribute('src'), 'high-1.png');
  assert.equal(image.getAttribute('data-src'), null);

  engine.destroy();
  assert.equal(MockIntersectionObserver.latest?.disconnected, true);
});