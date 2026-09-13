import test from 'node:test';
import assert from 'node:assert/strict';

import { PdfRenderCache } from '../src/core/PdfRenderCache.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('PDF render cache evicts the least recently used page', () => {
  const cache = new PdfRenderCache(2);
  cache.set(1, 'page-1');
  cache.set(2, 'page-2');
  assert.equal(cache.get(1), 'page-1');
  cache.set(3, 'page-3');

  assert.equal(cache.get(2), undefined);
  assert.equal(cache.get(1), 'page-1');
  assert.equal(cache.get(3), 'page-3');
  assert.deepEqual(cache.getStats(), { size: 2, maxEntries: 2, hits: 3, misses: 1 });
});

test('PDF renderer exposes a bounded, per-instance cache', () => {
  const renderer = new PdfRenderer({ cacheSize: 2 });
  const cache = (renderer as any).cache as PdfRenderCache;
  cache.set(1, 'cached-page');

  assert.equal(renderer.getCacheStats().size, 1);
  assert.equal((renderer as any).cache.get(1), 'cached-page');

  renderer.destroy();
  assert.equal(renderer.getCacheStats().size, 0);
});

test('PDF render cache can be disabled', () => {
  const cache = new PdfRenderCache(0);
  cache.set(1, 'page-1');
  assert.equal(cache.size, 0);
});
