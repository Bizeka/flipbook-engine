import * as pdfjsLib from 'pdfjs-dist';
import type { NormalizedFlipbookPage } from '../model/pages';

export interface PdfRenderOptions {
    scale?: number;
    quality?: number;
    format?: string;
    workerSrc?: string;
    concurrency?: number;
}

export class PdfRenderer {
    private pdfDoc: any = null;
    private loadingTask: any = null;
    private options: Required<PdfRenderOptions>;

    constructor(options: PdfRenderOptions = {}) {
        this.options = {
            scale: options.scale || 1.5,
            quality: options.quality || 0.85,
            format: options.format || 'image/webp',
            workerSrc: options.workerSrc || '',
            concurrency: Math.max(1, Math.floor(options.concurrency || 3))
        };
        if (this.options.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = this.options.workerSrc;
        }
    }

    /** Loads a PDF document and cancels PDF.js loading when the signal aborts. */
    public async loadDocument(pdfUrl: string, signal?: AbortSignal): Promise<number> {
        this.throwIfAborted(signal);
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
                return canvas.toDataURL(this.options.format, this.options.quality);
            }
        } catch (error) {
            if (signal?.aborted) throw this.createAbortError();
            console.error(`PDF page ${pageIndex} render error:`, error);
        }

        return '';
    }

    /** Calculates the best viewport dimensions based on the first page. */
    public async calculateViewportDimensions(baseShortSide: number = 420): Promise<{ width: number, height: number }> {
        if (!this.pdfDoc) throw new Error('PDF document is not loaded.');

        const firstPage = await this.pdfDoc.getPage(1);
        const vp = firstPage.getViewport({ scale: 1.0 });
        const aspectRatio = vp.width / vp.height;

        return aspectRatio >= 1
            ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
            : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };
    }

    /** Renders pages concurrently with a bounded worker pool and preserves page order. */
    public async renderAllPages(signal?: AbortSignal): Promise<NormalizedFlipbookPage[]> {
        if (!this.pdfDoc) return [];
        this.throwIfAborted(signal);

        const pageCount = this.pdfDoc.numPages;
        const resolvedPages = new Array<NormalizedFlipbookPage>(pageCount);
        let nextPage = 1;
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
            }
        };

        const workerCount = Math.min(this.options.concurrency, pageCount);
        await Promise.all(Array.from({ length: workerCount }, () => renderWorker()));
        this.throwIfAborted(signal);
        return resolvedPages;
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
    }
}