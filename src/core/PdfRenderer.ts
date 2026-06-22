import * as pdfjsLib from 'pdfjs-dist';
import type { NormalizedFlipbookPage } from '../model/pages';

// @ts-ignore
const pdfWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfRenderOptions {
    scale?: number;
    quality?: number;
    format?: string;
}

export class PdfRenderer {
    private pdfDoc: any = null;
    private options: Required<PdfRenderOptions>;

    constructor(options: PdfRenderOptions = {}) {
        this.options = {
            scale: options.scale || 1.5,
            quality: options.quality || 0.85,
            format: options.format || 'image/webp'
        };
    }

    /**
     * Loads the PDF document from the given URL.
     */
    public async loadDocument(pdfUrl: string): Promise<number> {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        this.pdfDoc = await loadingTask.promise;
        return this.pdfDoc.numPages;
    }

    /**
     * Renders a specific page to a Data URL.
     * @param pageIndex 1-based page index
     */
    public async renderPageToDataUrl(pageIndex: number): Promise<string> {
        if (!this.pdfDoc) throw new Error("PDF document is not loaded.");
        
        try {
            const page = await this.pdfDoc.getPage(pageIndex);
            const vp = page.getViewport({ scale: this.options.scale });
            const canvas = document.createElement('canvas');
            canvas.width = vp.width;
            canvas.height = vp.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                return canvas.toDataURL(this.options.format, this.options.quality);
            }
        } catch (err) {
            console.error(`PDF page ${pageIndex} render error:`, err);
        }
        
        return '';
    }

    /**
     * Calculates the best viewport dimensions based on the first page.
     * Used for determining the overall flipbook dimensions.
     */
    public async calculateViewportDimensions(baseShortSide: number = 420): Promise<{ width: number, height: number }> {
        if (!this.pdfDoc) throw new Error("PDF document is not loaded.");
        
        const firstPage = await this.pdfDoc.getPage(1);
        const vp = firstPage.getViewport({ scale: 1.0 });
        const aspectRatio = vp.width / vp.height;

        return aspectRatio >= 1
            ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
            : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };
    }

    /**
     * Renders all pages sequentially and returns an array of NormalizedFlipbookPage.
     */
    public async renderAllPages(): Promise<NormalizedFlipbookPage[]> {
        if (!this.pdfDoc) return [];
        
        const resolvedPages: NormalizedFlipbookPage[] = [];
        
        for (let i = 1; i <= this.pdfDoc.numPages; i++) {
            const normalSrc = await this.renderPageToDataUrl(i);
            
            resolvedPages.push({
                index: i - 1,
                assetId: `pdf-page-${i}`,
                pageNumber: i,
                cropMode: 'full',
                normal: normalSrc,
                low: normalSrc,
                thumb: normalSrc
            });
        }
        
        return resolvedPages;
    }

    public destroy() {
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
            this.pdfDoc = null;
        }
    }
}
