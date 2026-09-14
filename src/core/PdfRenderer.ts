import * as pdfjsLib from 'pdfjs-dist';
import type { NormalizedFlipbookPage } from '../model/pages';
import type { FlipbookSearchOptions } from '../model/search';
import { PdfRenderCache } from './PdfRenderCache';

export interface PdfRenderProgress { completed: number; total: number; }
export type PdfPageMode = 'auto' | 'single' | 'split';
export interface PdfPageLayout { width: number; height: number; split: boolean; }

const A3_LANDSCAPE_WIDTH = 1190.55;
const A3_LANDSCAPE_HEIGHT = 841.89;

/** Detects ISO A3 landscape pages while allowing PDF metadata rounding and bleed. */
export function isA3Landscape(width: number, height: number): boolean {
    const landscapeWidth = Math.max(width, height);
    const landscapeHeight = Math.min(width, height);
    const ratio = landscapeWidth / landscapeHeight;
    const nearA3Size = Math.abs(landscapeWidth - A3_LANDSCAPE_WIDTH) / A3_LANDSCAPE_WIDTH <= 0.08
        && Math.abs(landscapeHeight - A3_LANDSCAPE_HEIGHT) / A3_LANDSCAPE_HEIGHT <= 0.08;
    return width >= height && nearA3Size && Math.abs(ratio - (A3_LANDSCAPE_WIDTH / A3_LANDSCAPE_HEIGHT)) <= 0.04;
}

export interface PdfRenderOptions {
    scale?: number;
    quality?: number;
    format?: string;
    workerSrc?: string;
    concurrency?: number;
    cacheSize?: number;
}

export class PdfRenderer {
    private pdfDoc: any = null;
    private loadingTask: any = null;
    private options: Required<PdfRenderOptions>;
    private readonly cache: PdfRenderCache;
    private readonly textCache = new Map<number, string>();

    constructor(options: PdfRenderOptions = {}) {
        const cacheSize = Number.isFinite(options.cacheSize)
            ? Math.max(0, Math.floor(options.cacheSize as number))
            : 32;
        this.options = {
            scale: options.scale || 1.5,
            quality: options.quality || 0.85,
            format: options.format || 'image/webp',
            workerSrc: options.workerSrc || '',
            concurrency: Math.max(1, Math.floor(options.concurrency || 3)),
            cacheSize
        };
        this.cache = new PdfRenderCache(this.options.cacheSize);
        if (this.options.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = this.options.workerSrc;
        }
    }

    /** Loads a PDF document and cancels PDF.js loading when the signal aborts. */
    public async loadDocument(pdfUrl: string, signal?: AbortSignal): Promise<number> {
        this.throwIfAborted(signal);
        this.cache.clear();
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        this.loadingTask = loadingTask;
        const abortLoading = () => loadingTask.destroy?.();
        signal?.addEventListener('abort', abortLoading, { once: true });
        try {
            this.pdfDoc = await loadingTask.promise;
            this.throwIfAborted(signal);
            return this.pdfDoc.numPages;
        } catch (error) {
            if (signal?.aborted) throw this.createAbortError();
            throw error;
        } finally {
            signal?.removeEventListener('abort', abortLoading);
            if (this.loadingTask === loadingTask) this.loadingTask = null;
        }
    }

    /** Renders a specific page to a Data URL. The page index is 1-based. */
    public async renderPageToDataUrl(pageIndex: number, signal?: AbortSignal): Promise<string> {
        if (!this.pdfDoc) throw new Error('PDF document is not loaded.');
        this.throwIfAborted(signal);
        const cached = this.cache.get(pageIndex);
        if (cached !== undefined) return cached;

        try {
            const page = await this.pdfDoc.getPage(pageIndex);
            this.throwIfAborted(signal);
            const vp = page.getViewport({ scale: this.options.scale });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width;
            canvas.height = vp.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                const renderTask = page.render({ canvasContext: ctx, viewport: vp });
                const cancelRender = () => renderTask.cancel?.();
                signal?.addEventListener('abort', cancelRender, { once: true });
                try {
                    await renderTask.promise;
                    this.throwIfAborted(signal);
                } finally {
                    signal?.removeEventListener('abort', cancelRender);
                }
                const dataUrl = canvas.toDataURL(this.options.format, this.options.quality);
                this.cache.set(pageIndex, dataUrl);
                return dataUrl;
            }
            throw new Error('Unable to create a PDF canvas rendering context.');
        } catch (error) {
            if (signal?.aborted) throw this.createAbortError();
            throw error;
        }
    }

    /** Extracts text from a 1-based PDF source page using PDF.js text content. */
    public async extractPageText(pageNumber: number): Promise<string> {
        if (!this.pdfDoc) throw new Error('PDF document is not loaded.');
        if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > this.pdfDoc.numPages) {
            throw new Error('PDF page number is out of range.');
        }
        const cached = this.textCache.get(pageNumber);
        if (cached !== undefined) return cached;
        const page = await this.pdfDoc.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = (content?.items ?? [])
            .map((item: any) => typeof item?.str === 'string' ? item.str : '')
            .filter(Boolean)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        this.textCache.set(pageNumber, text);
        return text;
    }

    /** Searches all PDF source pages without rendering them. */
    public async searchText(query: string, options: FlipbookSearchOptions = {}): Promise<Array<{ sourcePageNumber: number; matches: number; snippet: string }>> {
        const normalizedQuery = String(query ?? '').trim();
        if (!this.pdfDoc || !normalizedQuery) return [];
        const caseSensitive = options.caseSensitive === true;
        const needle = caseSensitive ? normalizedQuery : normalizedQuery.toLocaleLowerCase();
        const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, Math.trunc(options.maxResults as number)) : 100;
        const results: Array<{ sourcePageNumber: number; matches: number; snippet: string }> = [];
        for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages && results.length < maxResults; pageNumber++) {
            const text = await this.extractPageText(pageNumber);
            const haystack = caseSensitive ? text : text.toLocaleLowerCase();
            let matches = 0;
            let offset = haystack.indexOf(needle);
            while (offset >= 0) { matches++; offset = haystack.indexOf(needle, offset + Math.max(1, needle.length)); }
            if (!matches) continue;
            const first = haystack.indexOf(needle);
            const start = Math.max(0, first - 70);
            const end = Math.min(text.length, first + normalizedQuery.length + 100);
            results.push({ sourcePageNumber: pageNumber, matches, snippet: text.slice(start, end).trim() });
        }
        return results;
    }

    /** Returns source page dimensions and whether the page should be split. */
    public async getPageLayouts(mode: PdfPageMode = 'auto'): Promise<PdfPageLayout[]> {
        if (!this.pdfDoc) return [];
        const layouts: PdfPageLayout[] = [];
        for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages; pageNumber++) {
            const page = await this.pdfDoc.getPage(pageNumber);
            const vp = page.getViewport({ scale: 1.0 });
            const split = mode === 'split'
                ? vp.width >= vp.height
                : mode === 'auto' && isA3Landscape(vp.width, vp.height);
            layouts.push({ width: vp.width, height: vp.height, split });
        }
        return layouts;
    }

    /** Calculates the best viewport dimensions based on the first logical page. */
    public async calculateViewportDimensions(baseShortSide: number = 420, firstPageLayout?: PdfPageLayout): Promise<{ width: number, height: number }> {
        if (!this.pdfDoc) throw new Error('PDF document is not loaded.');

        const firstPage = await this.pdfDoc.getPage(1);
        const vp = firstPageLayout
            ? { width: firstPageLayout.split ? firstPageLayout.width / 2 : firstPageLayout.width, height: firstPageLayout.height }
            : firstPage.getViewport({ scale: 1.0 });
        const aspectRatio = vp.width / vp.height;

        return aspectRatio >= 1
            ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
            : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };
    }

    /** Renders pages concurrently with a bounded worker pool and preserves page order. */
    public async renderAllPages(signal?: AbortSignal, onProgress?: (progress: PdfRenderProgress) => void): Promise<NormalizedFlipbookPage[]> {
        if (!this.pdfDoc) return [];
        this.throwIfAborted(signal);

        const pageCount = this.pdfDoc.numPages;
        const resolvedPages = new Array<NormalizedFlipbookPage>(pageCount);
        let nextPage = 1;
        let completed = 0;
        const renderWorker = async () => {
            while (true) {
                this.throwIfAborted(signal);
                const pageIndex = nextPage++;
                if (pageIndex > pageCount) return;
                const normalSrc = await this.renderPageToDataUrl(pageIndex, signal);
                resolvedPages[pageIndex - 1] = {
                    index: pageIndex - 1,
                    assetId: `pdf-page-${pageIndex}`,
                    pageNumber: pageIndex,
                    cropMode: 'full',
                    normal: normalSrc,
                    low: normalSrc,
                    thumb: normalSrc
                };
                completed++;
                onProgress?.({ completed, total: pageCount });
            }
        };

        const workerCount = Math.min(this.options.concurrency, pageCount);
        await Promise.all(Array.from({ length: workerCount }, () => renderWorker()));
        this.throwIfAborted(signal);
        return resolvedPages;
    }

    public getCacheStats() {
        return this.cache.getStats();
    }

    private throwIfAborted(signal?: AbortSignal) {
        if (signal?.aborted) throw this.createAbortError();
    }

    private createAbortError() {
        const error = new Error('PDF rendering was aborted.');
        error.name = 'AbortError';
        return error;
    }

    public destroy() {
        this.loadingTask?.destroy?.();
        this.loadingTask = null;
        if (this.pdfDoc) {
            this.pdfDoc.destroy?.();
            this.pdfDoc = null;
        }
        this.cache.clear();
    }
}
