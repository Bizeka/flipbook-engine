import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';
import { FlipbookEngine } from '../src/engine.ts';

const pages = [
  { normal: '1.png', low: '1-low.png', thumb: '1-thumb.png' },
  { normal: '2.png', low: '2-low.png', thumb: '2-thumb.png' },
  { normal: '3.png', low: '3-low.png', thumb: '3-thumb.png' }
];

test('bookmark state is initialized, toggled from the toolbar, and emitted for host persistence', async () => {
  const engine = new FlipbookEngine('#app', { locale: 'tr', bookmarks: [2, 0, 4] });
  const changes: Array<{ pageIndex: number; pageNumber: number; bookmarked: boolean }> = [];
  engine.on('bookmarkChange', (payload) => changes.push(payload));
  await engine.init('', pages);

  assert.deepEqual(engine.getBookmarkedPages(), [0, 2]);
  assert.equal(engine.isBookmarked(2), true);
  engine.goToPage(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const button = document.querySelector('.bk-btn--bookmark') as HTMLButtonElement;
  assert.ok(button);
  assert.equal(button.getAttribute('aria-label'), 'Sayfayı yer imlerine ekle');

  button.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(engine.isBookmarked(1), true);
  assert.deepEqual(changes[0], { pageIndex: 1, pageNumber: 2, bookmarked: true });
  assert.equal(button.getAttribute('aria-label'), 'Yer imini kaldır');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.match(button.className, /\bactive\b/);

  button.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(engine.isBookmarked(1), false);
  assert.deepEqual(changes[1], { pageIndex: 1, pageNumber: 2, bookmarked: false });
  assert.doesNotMatch(button.className, /\bactive\b/);
  engine.updateOptions({ bookmarks: [1] });
  assert.deepEqual(engine.getBookmarkedPages(), [1]);
  engine.destroy();
});
