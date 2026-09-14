import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' },
  { normal: '3.png', low: '3-low.png', thumb: '3-thumb.png' },
  { normal: '4.png', low: '4-low.png', thumb: '4-thumb.png' }
];

function restoreUrl(url: string) {
  window.history.replaceState(null, '', url);
}

test('deep links select the initial page and generate shareable URLs', async () => {
  const previousUrl = window.location.href;
  try {
    window.history.replaceState(null, '', '/catalog?page=3');
    const engine = new FlipbookEngine('#app', { deepLink: true });
    await engine.init('', pages);

    assert.equal(engine.getCurrentPage(), 2);
    assert.equal(engine.getPageUrl(1), 'http://localhost/catalog?page=2');
    engine.destroy();
  } finally {
    restoreUrl(previousUrl);
  }
});

test('deep links update the URL and respond to browser history navigation', async () => {
  const previousUrl = window.location.href;
  try {
    window.history.replaceState(null, '', '/catalog');
    const engine = new FlipbookEngine('#app', { deepLink: true, flippingTime: 0 });
    await engine.init('', pages);
    const changes: Array<{ pageIndex: number; pageNumber: number; url: string }> = [];
    engine.on('deepLinkChange', (payload) => changes.push(payload));

    engine.goToPage(1);
    await Promise.resolve();
    assert.equal(new URL(window.location.href).searchParams.get('page'), '2');
    assert.equal(changes.at(-1)?.pageNumber, 2);

    window.history.pushState(null, '', '/catalog?page=4');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await Promise.resolve();
    assert.equal(engine.getCurrentPage(), 3);

    window.history.pushState(null, '', '/catalog');
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(engine.getCurrentPage(), 0);
    engine.destroy();
  } finally {
    restoreUrl(previousUrl);
  }
});
