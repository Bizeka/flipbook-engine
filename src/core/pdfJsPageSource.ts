import { PdfRenderer, type PdfRenderOptions } from './PdfRenderer';
import type { PageSource } from './PageSource';

/** The default page source: PDF.js, loaded on first use. */
export function createPdfJsPageSource(options: PdfRenderOptions = {}): PageSource {
    return new PdfRenderer(options);
}
