import test from 'node:test';
import assert from 'node:assert/strict';

import './dom-mock.ts';

import { PdfRenderer } from '../src/core/PdfRenderer.ts';

test('PDF page rendering uses bounded concurrency and preserves page order', async () => {
  const renderer = new PdfRenderer({ concurrency: 2 });
  (renderer as any).pdfDoc = { numPages: 4 };
  let active = 0;
  let peak = 0;
  (renderer as any).renderPageToDataUrl = async (pageIndex: number) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    return `page-${pageIndex}`;
  };

  const pages = await renderer.renderAllPages();
  assert.equal(peak, 2);
  assert.deepEqual(pages.map((page) => page.normal), ['page-1', 'page-2', 'page-3', 'page-4']);
  renderer.destroy();
});

test('PDF page rendering aborts before starting work', async () => {
  const renderer = new PdfRenderer();
  (renderer as any).pdfDoc = { numPages: 2 };
  let renderCalls = 0;
  (renderer as any).renderPageToDataUrl = async () => {
    renderCalls++;
    return 'page';
  };
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(renderer.renderAllPages(controller.signal), (error: any) => error?.name === 'AbortError');
  assert.equal(renderCalls, 0);
  renderer.destroy();
});
test('PDF page rendering propagates renderer failures', async () => {
  const renderer = new PdfRenderer();
  (renderer as any).pdfDoc = { getPage: async () => { throw new Error('render failed'); } };

  await assert.rejects(renderer.renderPageToDataUrl(1), /render failed/);
  renderer.destroy();
});
