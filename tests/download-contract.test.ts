import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' }
];

test('download control is hidden when no PDF URL is available', async () => {
  const engine = new FlipbookEngine('#app', { allowDownload: true });
  await engine.init('', pages);

  assert.equal(document.querySelector('.bk-btn--download'), null);
  engine.destroy();
});

test('download control is shown when a PDF URL is available', async () => {
  const engine = new FlipbookEngine('#app', { allowDownload: true });
  await engine.init('download.pdf', pages);

  assert.ok(document.querySelector('.bk-btn--download'));
  engine.destroy();
});

test('share control uses the native share contract and reports the generated URL', async () => {
  const shared: Array<{ title?: string; url: string }> = [];
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async (payload: { title?: string; url: string }) => { shared.push(payload); }
  });
  let callbackUrl = '';
  const engine = new FlipbookEngine('#app', {
    deepLink: true,
    onShare: (url) => { callbackUrl = url; }
  });
  await engine.init('', pages);

  const button = document.querySelector('.bk-btn--share') as HTMLButtonElement;
  assert.ok(button);
  assert.equal(button.getAttribute('aria-label'), 'Share');
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(shared.length, 1);
  assert.match(shared[0].url, /[?&]page=1(?:$|&)/);
  assert.equal(callbackUrl, shared[0].url);
  engine.destroy();
});
test('sound control toggles state exactly once per click', async () => {
  const engine = new FlipbookEngine('#app');
  await engine.init('', pages);

  const button = document.querySelector('button[title="Sound"]') as HTMLButtonElement;
  assert.ok(button);
  assert.equal(button.classList.contains('muted'), false);
  button.click();
  assert.ok(button.classList.contains('muted'));

  button.click();
  assert.ok(!button.classList.contains('muted'));
  engine.destroy();
});