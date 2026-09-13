import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('preserves a PDF-only viewer when wrappers report no pages', async (t) => {
  const originalLoadDocument = PdfRenderer.prototype.loadDocument;
  const originalRenderPageToDataUrl = PdfRenderer.prototype.renderPageToDataUrl;
  const originalCalculateViewportDimensions = PdfRenderer.prototype.calculateViewportDimensions;
  const loadedUrls: string[] = [];

  PdfRenderer.prototype.loadDocument = async (pdfUrl) => {
    loadedUrls.push(pdfUrl);
    return 2;
  };
  PdfRenderer.prototype.renderPageToDataUrl = async (pageNumber) => 'page-' + pageNumber;
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });

  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoadDocument;
    PdfRenderer.prototype.renderPageToDataUrl = originalRenderPageToDataUrl;
    PdfRenderer.prototype.calculateViewportDimensions = originalCalculateViewportDimensions;
  });

  const engine = new FlipbookEngine('#app');
  await engine.init('/files/catalog.pdf');

  const appContainer = document.querySelector('#app') as HTMLElement;
  assert.deepEqual(loadedUrls, ['/files/catalog.pdf']);
  assert.equal(engine.getTotalPages(), 2);
  assert.equal(appContainer.querySelectorAll('.bz-page').length, 2);

  await engine.setPages([]);

  assert.equal(engine.getTotalPages(), 2);
  assert.equal(appContainer.querySelectorAll('.bz-page').length, 2);
  engine.destroy();
});

