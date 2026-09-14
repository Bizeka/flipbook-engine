import test from 'node:test';
import assert from 'node:assert/strict';
import './dom-mock.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('PDF text search extracts page text without rendering', async () => {
  const renderer = new PdfRenderer();
  (renderer as any).pdfDoc = {
    numPages: 3,
    getPage: async (pageNumber: number) => ({
      getTextContent: async () => ({ items: [{ str: pageNumber === 2 ? 'Catalog Health' : pageNumber === 3 ? 'catalog catalog' : 'Introduction' }] })
    })
  };
  assert.deepEqual(await renderer.searchText('catalog'), [
    { sourcePageNumber: 2, matches: 1, snippet: 'Catalog Health' },
    { sourcePageNumber: 3, matches: 2, snippet: 'catalog catalog' }
  ]);
  assert.deepEqual(await renderer.searchText('CATALOG', { caseSensitive: true }), []);
  renderer.destroy();
});


test('PDF text search returns normalized highlight rectangles for matching text items', async () => {
  const renderer = new PdfRenderer();
  (renderer as any).pdfDoc = {
    numPages: 1,
    getPage: async () => ({
      getViewport: () => ({ width: 600, height: 800 }),
      getTextContent: async () => ({ items: [{ str: 'Product catalog', transform: [100, 0, 0, 20, 60, 700], width: 140, height: 20 }] })
    })
  };
  const results = await renderer.searchText('catalog');
  assert.equal(results[0].matches, 1);
  assert.equal(results[0].highlights?.length, 1);
  const highlight = results[0].highlights?.[0];
  assert.ok(highlight);
  assert.ok(highlight.x > 0 && highlight.x < 1);
  assert.ok(highlight.y > 0 && highlight.y < 1);
  assert.ok(highlight.width > 0 && highlight.width < 1);
  assert.ok(highlight.height > 0 && highlight.height < 1);
  renderer.destroy();
});
