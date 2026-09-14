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
