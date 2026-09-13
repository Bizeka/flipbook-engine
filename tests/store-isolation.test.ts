import test from 'node:test';
import assert from 'node:assert/strict';

import { createFlipbookStore } from '../src/state/store.ts';

test('store instances keep navigation and display state isolated', () => {
  const first = createFlipbookStore();
  const second = createFlipbookStore();
  const pages = [
    { normal: 'first-1.png', low: 'first-1-low.png', thumb: 'first-1-thumb.png' },
    { normal: 'first-2.png', low: 'first-2-low.png', thumb: 'first-2-thumb.png' }
  ] as any;

  first.init({ theme: 'dark', singleMode: true }, pages.length, pages, false);
  second.init({ theme: 'light' }, 4, [], false);

  first.currentPage.value = 1;
  first.zoomState.value = { ...first.zoomState.value, isActive: true, scale: 2.5 };
  first.showThumbs.value = false;

  assert.equal(first.currentPage.value, 1);
  assert.equal(first.zoomState.value.scale, 2.5);
  assert.equal(first.showThumbs.value, false);
  assert.equal(second.currentPage.value, 0);
  assert.equal(second.zoomState.value.scale, 1);
  assert.equal(second.showThumbs.value, true);
  assert.equal(second.totalPages.value, 4);
  assert.equal(second.themeMode.value, 'light');
});
