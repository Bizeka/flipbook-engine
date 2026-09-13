import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('preserves a PDF-only viewer when wrappers report no pages', async (t) => {
  const originalLoadDocument = PdfRenderer.prototype.loadDocument;
  const originalRenderAllPages = PdfRenderer.prototype.renderAllPages;
  const originalCalculateViewportDimensions = PdfRenderer.prototype.calculateViewportDimensions;
  const loadedUrls: string[] = [];

  PdfRenderer.prototype.loadDocument = async (pdfUrl) => {
    loadedUrls.push(pdfUrl);
    return 2;
  };
  PdfRenderer.prototype.renderAllPages = async () => [
    { index: 0, assetId: 'pdf-page-1', pageNumber: 1, cropMode: 'full', normal: 'page-1', low: 'page-1', thumb: 'page-1' },
    { index: 1, assetId: 'pdf-page-2', pageNumber: 2, cropMode: 'full', normal: 'page-2', low: 'page-2', thumb: 'page-2' }
  ];
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });

  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoadDocument;
    PdfRenderer.prototype.renderAllPages = originalRenderAllPages;
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
