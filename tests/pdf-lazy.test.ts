import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('100-page PDF initialization renders only the visible window and prefetches the next page', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  const originalRender = PdfRenderer.prototype.renderPageToDataUrl;
  const originalViewport = PdfRenderer.prototype.calculateViewportDimensions;
  const renderCalls: number[] = [];

  PdfRenderer.prototype.loadDocument = async () => 100;
  PdfRenderer.prototype.renderPageToDataUrl = async (pageNumber) => {
    renderCalls.push(pageNumber);
    return 'data:image/mock;base64,page-' + pageNumber;
  };
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });

  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
    PdfRenderer.prototype.renderPageToDataUrl = originalRender;
    PdfRenderer.prototype.calculateViewportDimensions = originalViewport;
  });

  const engine = new FlipbookEngine('#app');
  await engine.init('/files/100-page.pdf');
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(engine.getTotalPages(), 100);
  assert.equal(document.querySelectorAll('#app .bz-page').length, 100);
  assert.deepEqual([...new Set(renderCalls)].sort((a, b) => a - b), [1, 2]);

  engine.setSingleMode(true);
  engine.goToPage(2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(renderCalls.includes(3));

  engine.destroy();
});
