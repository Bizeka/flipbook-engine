import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeFlipbookPages } from '../src/model/pages.ts';

test('normalizes single and cover pages as full pages', () => {
  const pages = normalizeFlipbookPages([
    {
      kind: 'cover',
      pageNumber: 1,
      normal: '/img/cover.jpg',
      low: '/img/cover-low.jpg',
      thumb: '/img/cover-thumb.jpg'
    },
    {
      kind: 'single',
      pageNumber: 2,
      normal: '/img/2.jpg',
      low: '/img/2-low.jpg',
      thumb: '/img/2-thumb.jpg'
    }
  ]);

  assert.equal(pages.length, 2);
  assert.deepEqual(
    pages.map((page) => ({ pageNumber: page.pageNumber, cropMode: page.cropMode })),
    [
      { pageNumber: 1, cropMode: 'full' },
      { pageNumber: 2, cropMode: 'full' }
    ]
  );
});

test('normalizes ltr spread into left and right leaf pages', () => {
  const pages = normalizeFlipbookPages([
    {
      kind: 'spread',
      pageNumbers: [2, 3],
      splitDirection: 'ltr',
      normal: '/img/2-3.jpg',
      low: '/img/2-3-low.jpg',
      thumb: '/img/2-3-thumb.jpg'
    }
  ]);

  assert.equal(pages.length, 2);
  assert.deepEqual(
    pages.map((page) => ({ pageNumber: page.pageNumber, cropMode: page.cropMode })),
    [
      { pageNumber: 2, cropMode: 'left' },
      { pageNumber: 3, cropMode: 'right' }
    ]
  );
});

test('normalizes rtl spread into right and left leaf pages', () => {
  const pages = normalizeFlipbookPages([
    {
      kind: 'spread',
      pageNumbers: [8, 9],
      splitDirection: 'rtl',
      normal: '/img/8-9.jpg',
      low: '/img/8-9-low.jpg',
      thumb: '/img/8-9-thumb.jpg'
    }
  ]);

  assert.equal(pages.length, 2);
  assert.deepEqual(
    pages.map((page) => ({ pageNumber: page.pageNumber, cropMode: page.cropMode })),
    [
      { pageNumber: 8, cropMode: 'right' },
      { pageNumber: 9, cropMode: 'left' }
    ]
  );
});

test('preserves mixed cover and spread ordering', () => {
  const pages = normalizeFlipbookPages([
    {
      kind: 'cover',
      pageNumber: 1,
      normal: '/img/cover.jpg',
      low: '/img/cover-low.jpg',
      thumb: '/img/cover-thumb.jpg'
    },
    {
      kind: 'spread',
      pageNumbers: [2, 3],
      normal: '/img/2-3.jpg',
      low: '/img/2-3-low.jpg',
      thumb: '/img/2-3-thumb.jpg'
    },
    {
      kind: 'spread',
      pageNumbers: [4, 5],
      normal: '/img/4-5.jpg',
      low: '/img/4-5-low.jpg',
      thumb: '/img/4-5-thumb.jpg'
    }
  ]);

  assert.equal(pages.length, 5);
  assert.deepEqual(
    pages.map((page) => page.pageNumber),
    [1, 2, 3, 4, 5]
  );
  assert.deepEqual(
    pages.map((page) => page.cropMode),
    ['full', 'left', 'right', 'left', 'right']
  );
});

test('uses fallback page numbering when spread numbers are omitted', () => {
  const pages = normalizeFlipbookPages([
    {
      kind: 'cover',
      normal: '/img/cover.jpg',
      low: '/img/cover-low.jpg',
      thumb: '/img/cover-thumb.jpg'
    },
    {
      kind: 'spread',
      normal: '/img/spread.jpg',
      low: '/img/spread-low.jpg',
      thumb: '/img/spread-thumb.jpg'
    }
  ]);

  assert.deepEqual(
    pages.map((page) => page.pageNumber),
    [1, 2, 3]
  );
});
