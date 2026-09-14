import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('PDF split mode creates two logical pages for an A3 landscape source page', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  const originalLayouts = PdfRenderer.prototype.getPageLayouts;
  const originalViewport = PdfRenderer.prototype.calculateViewportDimensions;
  const originalRender = PdfRenderer.prototype.renderPageToDataUrl;

  PdfRenderer.prototype.loadDocument = async function () {
    (this as any).pdfDoc = { numPages: 2 };
    return 2;
  };
  PdfRenderer.prototype.getPageLayouts = async () => [
    { width: 1190.55, height: 841.89, split: true },
    { width: 595.28, height: 841.89, split: false }
  ];
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });
  PdfRenderer.prototype.renderPageToDataUrl = async (pageNumber) => 'data:image/mock;base64,page-' + pageNumber;

  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
    PdfRenderer.prototype.getPageLayouts = originalLayouts;
    PdfRenderer.prototype.calculateViewportDimensions = originalViewport;
    PdfRenderer.prototype.renderPageToDataUrl = originalRender;
  });

  const engine = new FlipbookEngine('#app', { pdfPageMode: 'auto' });
  await engine.init('/files/a3-catalog.pdf');
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(engine.getTotalPages(), 3);
  assert.deepEqual(
    [...document.querySelectorAll('#app .bz-page img')].map((image) => image.className),
    ['page-content page-content--split page-content--left', 'page-content page-content--split page-content--right', 'page-content']
  );
  assert.deepEqual(
    [...document.querySelectorAll('#app .bz-page img')].slice(0, 2).map((image) => image.getAttribute('src')),
    ['data:image/mock;base64,page-1', 'data:image/mock;base64,page-1']
  );

  engine.setSingleMode(true);
  engine.goToPage(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(engine.getCurrentPage(), 1);
  assert.equal(document.querySelector('.bk-single-img')?.getAttribute('src'), 'data:image/mock;base64,page-1');
  engine.destroy();
});
