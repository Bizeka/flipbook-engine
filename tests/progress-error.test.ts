import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { FlipbookEngine } from '../src/engine.ts';
import { PdfRenderer } from '../src/core/PdfRenderer.ts';

const renderedPages = [
  { index: 0, assetId: 'pdf-page-1', pageNumber: 1, cropMode: 'full' as const, normal: 'page-1', low: 'page-1', thumb: 'page-1' },
  { index: 1, assetId: 'pdf-page-2', pageNumber: 2, cropMode: 'full' as const, normal: 'page-2', low: 'page-2', thumb: 'page-2' }
];

test('engine reports PDF loading and rendering progress', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  const originalRender = PdfRenderer.prototype.renderAllPages;
  const originalViewport = PdfRenderer.prototype.calculateViewportDimensions;
  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
    PdfRenderer.prototype.renderAllPages = originalRender;
    PdfRenderer.prototype.calculateViewportDimensions = originalViewport;
  });

  PdfRenderer.prototype.loadDocument = async () => 2;
  PdfRenderer.prototype.renderAllPages = async (_signal, onProgress) => {
    onProgress?.({ completed: 1, total: 2 });
    onProgress?.({ completed: 2, total: 2 });
    return renderedPages;
  };
  PdfRenderer.prototype.calculateViewportDimensions = async () => ({ width: 420, height: 594 });

  const engine = new FlipbookEngine('#app');
  const progress: Array<{ phase: string; completed: number; total: number }> = [];
  engine.on('progress', (event) => progress.push(event));
  await engine.init('progress.pdf');

  assert.deepEqual(progress, [
    { phase: 'loading', completed: 0, total: 0 },
    { phase: 'loading', completed: 1, total: 2 },
    { phase: 'rendering', completed: 1, total: 2 },
    { phase: 'rendering', completed: 2, total: 2 }
  ]);
  engine.destroy();
});

test('engine emits a structured error when PDF loading fails', async (t) => {
  const originalLoad = PdfRenderer.prototype.loadDocument;
  t.after(() => {
    PdfRenderer.prototype.loadDocument = originalLoad;
  });
  PdfRenderer.prototype.loadDocument = async () => {
    throw new Error('network unavailable');
  };

  const engine = new FlipbookEngine('#app');
  const errors: any[] = [];
  engine.on('error', (event) => errors.push(event));
  await engine.init('broken.pdf');

  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'PDF_LOAD_FAILED');
  assert.equal(errors[0].message, 'network unavailable');
  engine.destroy();
});