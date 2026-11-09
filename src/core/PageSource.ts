import type { NormalizedFlipbookPage } from '../model/pages';
import type { FlipbookSearchOptions, FlipbookSearchHighlight } from '../model/search';
import type { PdfPageLayout, PdfPageMode } from './PdfRenderer';

/** Size tier of a rendered page image. A source may ignore it and return one size. */
export type PageImageTier = 'thumb' | 'low' | 'normal' | 'large';

export interface PageImageRequest {
    /** Requested tier; the default PDF.js source ignores it and renders at `pdfRenderScale`. */
    tier?: PageImageTier;
    /** Requested render scale relative to the page's natural size; the default PDF.js source ignores it. */
    scale?: number;
}

export interface PageSourceSearchResult {
    sourcePageNumber: number;
    matches: number;
    snippet: string;
    highlights?: FlipbookSearchHighlight[];
}

export interface PageSourceProgress { completed: number; total: number; }

/**
 * Where the engine gets pages from when it is given a document URL instead of ready-made `pages`.
 * Page numbers are 1-based. The default implementation wraps PDF.js and is loaded only when it is used.
 * Pass your own through the `pageSource` option, for example one that reads images and text from a server.
 * It cannot be passed through the iframe bridge, because the bridge only carries serializable data.
 */
export interface PageSource {
    /** Opens the document and resolves with its page count. Must reject with an AbortError when `signal` aborts. */
    loadDocument(url: string, signal?: AbortSignal): Promise<number>;
    /** Natural size of every page and whether it should be split into two logical pages. */
    getPageLayouts(mode?: PdfPageMode): Promise<PdfPageLayout[]>;
    /** Viewport size for the first logical page. */
    calculateViewportDimensions(baseShortSide?: number, firstPageLayout?: PdfPageLayout): Promise<{ width: number; height: number }>;
    /** Renders one page and resolves with an image URL (a data URL or any URL an img element can load). */
    renderPageToDataUrl(pageNumber: number, signal?: AbortSignal, request?: PageImageRequest): Promise<string>;
    /** Plain text of one page. */
    extractPageText(pageNumber: number): Promise<string>;
    /** Searches every page; highlight rectangles are normalized to 0..1 of the page. */
    searchText(query: string, options?: FlipbookSearchOptions): Promise<PageSourceSearchResult[]>;
    /** Optional: renders every page up front. */
    renderAllPages?(signal?: AbortSignal, onProgress?: (progress: PageSourceProgress) => void): Promise<NormalizedFlipbookPage[]>;
    /** Releases the document and any cached images. */
    destroy(): void;
}
