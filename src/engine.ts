/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 *
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 *
 * 1. Open Source (AGPLv3): You may use, modify, and distribute this software
 *    under the terms of the GNU Affero General Public License v3.0.
 *
 * 2. Commercial License: If you wish to use this software in commercial,
 *    closed-source, or SaaS products without the AGPLv3 obligations,
 *    you must purchase a Commercial License from:
 *    https://flipbookengine.com/pricing
 */
import * as pdfjsLib from 'pdfjs-dist';
import { effect } from '@preact/signals-core';
import { App } from './components/App';
import { PageFlipAdapter } from './adapters/PageFlipAdapter';
import { LayoutManager } from './core/LayoutManager';
import { InteractionManager } from './core/InteractionManager';
import { createFlipbookStore, type FlipbookStore } from './state/store';
import { isFlipbookPageAsset, normalizeFlipbookPages, type FlipbookPageAsset, type NormalizedFlipbookPage } from './model/pages';
import { applyThemeConfiguration, type FlipbookBackgrounds, type FlipbookThemeMode } from './theme/theme';
import { resolveMessages, type FlipbookLocale, type PartialFlipbookMessages } from './i18n/service';
import { PdfRenderer, type PdfPageLayout, type PdfPageMode } from './core/PdfRenderer';
import { normalizeFlipbookToc, type FlipbookTocEntry } from './model/toc';
import type { FlipbookSearchHighlight, FlipbookSearchOptions, FlipbookSearchResult } from './model/search';
import type { FlipbookHotspot } from './model/hotspots';
import type { FlipbookAnnotation } from './model/annotations';
import './styles/flipbook-engine.css';
import { FlipbookEmbedBridge, type FlipbookEmbedOptions } from './embed';
import { FlipbookPluginRegistry, type FlipbookPlugin } from './plugins';

export interface FlipbookEngineOptions {
    allowDownload?: boolean;
    showThumbs?: boolean;
    showToc?: boolean;
    toc?: FlipbookTocEntry[];
    showArrows?: boolean;
    primaryColor?: string;
    soundEnabled?: boolean;
    soundUrl?: string;
    flippingTime?: number;
    maxShadowOpacity?: number;
    backgroundColor?: string;
    backgroundImage?: string;
    /** Optional per-theme viewer background. */
    background?: FlipbookBackgrounds | null;
    whiteLabel?: boolean;
    watermarkUrl?: string;
    theme?: FlipbookThemeMode;
    locale?: FlipbookLocale | string;
    messages?: Partial<Record<string, PartialFlipbookMessages>>;
    className?: string;
    cssVariables?: Record<string, string>;
    onDownload?: (url: string) => void;
    /** Called after the toolbar creates and shares/copies the current page URL. */
    onShare?: (url: string) => void;
    singleMode?: boolean;
    isSingleMode?: boolean;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    pdfRenderScale?: number;
    pdfRenderQuality?: number;
    pdfRenderFormat?: string;
    pdfRenderConcurrency?: number;
    pdfRenderCacheSize?: number;
    pdfWorkerSrc?: string;
    /** Controls PDF page splitting: auto detects A3 landscape, single disables it, split splits every landscape page. */
    pdfPageMode?: PdfPageMode;
    /** Enables URL-based page deep links and browser history synchronization. */
    deepLink?: boolean;
    /** Zero-based page indexes initially marked as bookmarks. */
    bookmarks?: number[];
    /** Initial host-managed notes keyed by zero-based page index. */
    notes?: Record<number, string>;
    /** Optional interactive overlays anchored to logical pages using 0..1 coordinates. */
    hotspots?: FlipbookHotspot[];
    /** Optional host-provided note markers anchored to logical pages. */
    annotations?: FlipbookAnnotation[];
    /** Plugins installed before the first viewer render. */
    plugins?: FlipbookPlugin[];
}

export interface PageImages extends FlipbookPageAsset {
    pageNumber: number;
    normal: string;
    low: string;
    thumb: string;
}

export interface FlipbookEngineEventMap {
    init: { totalPages: number };
    destroy: undefined;
    pageChange: { currentPage: number; pageNumber: number; totalPages: number; isSingle: boolean };
    zoomChange: { zoom: number; isActive: boolean };
    thumbsToggle: { showThumbs: boolean };
    tocToggle: { showToc: boolean };
    singlePageModeChange: { isSingle: boolean };
    orientationChange: { orientation: 'landscape' | 'portrait' };
    progress: { phase: 'loading' | 'rendering'; completed: number; total: number };
    error: { code: 'PDF_LOAD_FAILED' | 'PDF_RENDER_FAILED'; message: string; cause?: unknown };
    deepLinkChange: { pageIndex: number; pageNumber: number; url: string };
    bookmarkChange: { pageIndex: number; pageNumber: number; bookmarked: boolean };
    noteChange: { pageIndex: number; pageNumber: number; note: string | null };
    searchChange: { query: string; results: FlipbookSearchResult[] };
    hotspotActivate: { hotspot: FlipbookHotspot; pageIndex: number };
    annotationActivate: { annotation: FlipbookAnnotation; pageIndex: number };
}

export type FlipbookEngineEventName = keyof FlipbookEngineEventMap;
export type FlipbookLocaleMessages = PartialFlipbookMessages | Partial<Record<string, PartialFlipbookMessages>>;

type FlipbookEventHandler<T extends FlipbookEngineEventName> = (payload: FlipbookEngineEventMap[T]) => void;
type AnyFlipbookEventHandler = (payload: FlipbookEngineEventMap[FlipbookEngineEventName]) => void;

export class FlipbookEngine {
    private static readonly DEFAULT_PAGE_VIEWPORT = { width: 420, height: 594 };
    private container: HTMLElement | null = null;
    private options: FlipbookEngineOptions;
    private store: FlipbookStore = createFlipbookStore();

    // Core Managers
    private pageFlipAdapter: PageFlipAdapter | null = null;
    private layoutManager: LayoutManager | null = null;
    private interactionManager: InteractionManager | null = null;

    private pdfRenderer: PdfRenderer | null = null;
    private listeners: Partial<Record<FlipbookEngineEventName, Set<AnyFlipbookEventHandler>>> = {};
    private initializationTimer: ReturnType<typeof setTimeout> | null = null;
    private initGeneration = 0;
    private initAbortController: AbortController | null = null;
    private eventsReady = false;
    private lastEventState = { currentPage: 0, zoom: 1, zoomActive: false, showThumbs: false, showToc: false, isSingle: false, orientation: '' as '' | 'landscape' | 'portrait' };
    private eventSyncStop: (() => void) | null = null;
    private qualityObserver: IntersectionObserver | null = null;
    private pdfLazyStop: (() => void) | null = null;
    private hasActiveSession = false;
    private readonly pdfPageRequests = new Map<number, Promise<string>>();
    private readonly pdfRenderedPages = new Set<number>();
    private readonly pdfRenderedSources = new Map<number, string>();
    private pdfSourcePageCount = 0;
    private deepLinkListener: (() => void) | null = null;
    private readonly pluginRegistry = new FlipbookPluginRegistry();

    constructor(private selector: string | HTMLElement, options: FlipbookEngineOptions = {}) {
        this.options = {
            allowDownload: true,
            showThumbs: false,
            primaryColor: '#7367f0',
            theme: 'auto',
            soundUrl: 'https://flipbookengine.com/Content/page-flip.mp3',
            autoPlayInterval: 3000,
            pdfRenderScale: 1.5,
            pdfRenderQuality: 0.85,
            pdfRenderFormat: 'image/webp',
            pdfRenderConcurrency: 3,
            pdfRenderCacheSize: 32,
            pdfPageMode: 'auto',
            deepLink: false,
            ...options
        };
        this.setupEventSync();
        (options.plugins ?? []).forEach((plugin) => this.installPlugin(plugin));
    }

    public async init(pdfUrl: string, imageList?: Array<PageImages | FlipbookPageAsset>) {
        if (typeof this.selector === 'string') {
            this.container = document.querySelector(this.selector) as HTMLElement;
        } else {
            this.container = this.selector;
        }

        if (!this.container) return;

        this.eventsReady = false;
        this.destroy(true);
        this.setupDeepLinkListener();
        const generation = this.initGeneration;
        const abortController = new AbortController();
        this.initAbortController = abortController;

        let resolvedPages: NormalizedFlipbookPage[] = [];
        let viewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };

        if (imageList && imageList.length > 0) {
            if (abortController.signal.aborted) return;
            const sourceAssets = imageList.filter(isFlipbookPageAsset);
            resolvedPages = normalizeFlipbookPages(sourceAssets);

            // Resolve aspect ratio from first page
            const referencePage = resolvedPages[0];
            if (referencePage) {
                const size = await this.loadImageSize(referencePage.low || referencePage.normal);
                if (size) {
                    const actualWidth = referencePage.cropMode !== 'full' ? size.width / 2 : size.width;
                    const aspectRatio = actualWidth / size.height;
                    const baseShortSide = 420;
                    viewport = aspectRatio >= 1
                        ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
                        : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };
                }
            }
        } else if (pdfUrl) {
            if (abortController.signal.aborted) return;
            let pdfStage: 'load' | 'render' = 'load';
            try {
                this.pdfRenderer = new PdfRenderer({
                    scale: this.options.pdfRenderScale,
                    quality: this.options.pdfRenderQuality,
                    format: this.options.pdfRenderFormat,
                    concurrency: this.options.pdfRenderConcurrency,
                    cacheSize: this.options.pdfRenderCacheSize,
                    workerSrc: this.options.pdfWorkerSrc
                });

                this.emit('progress', { phase: 'loading', completed: 0, total: 0 });
                const totalPages = await this.pdfRenderer.loadDocument(pdfUrl, abortController.signal);
                pdfStage = 'render';
                this.emit('progress', { phase: 'loading', completed: 1, total: totalPages });
                const pageLayouts = await this.pdfRenderer.getPageLayouts(this.options.pdfPageMode);
                viewport = pageLayouts.length
                    ? await this.pdfRenderer.calculateViewportDimensions(420, pageLayouts[0])
                    : await this.pdfRenderer.calculateViewportDimensions();
                resolvedPages = pageLayouts.length
                    ? this.createPdfPlaceholders(pageLayouts)
                    : Array.from({ length: totalPages }, (_, index) => this.createPdfPlaceholder(index + 1));
                this.pdfSourcePageCount = totalPages;
            } catch (e: any) {
                if (!abortController.signal.aborted) {
                    console.error("PDF load failed:", e);
                    this.emit('error', {
                        code: pdfStage === 'load' ? 'PDF_LOAD_FAILED' : 'PDF_RENDER_FAILED',
                        message: e instanceof Error ? e.message : 'Unable to load PDF.',
                        cause: e
                    });
                }
                return;
            }
        }

        if (abortController.signal.aborted || generation !== this.initGeneration) return;
        if (!resolvedPages.length) return;

        // 1. Initialize State
        this.store.init(this.options, resolvedPages.length, resolvedPages, !!pdfUrl, !imageList?.length && !!pdfUrl);
        this.applyInitialDeepLink();

        // 2. Setup DOM container
        applyThemeConfiguration(this.container, this.options);
        this.container.innerHTML = '';

        // 3. Mount App Component
        // In DOMWise, TSX returns actual DOM nodes
        let bookWrapperEl: HTMLElement;
        let bookSizerEl: HTMLElement;
        let bookContainerEl: HTMLElement;

        const pageFlipAdapterRef = { current: null as any };
        const interactionManagerRef = { current: null as any };

        // Pass refs to capture DOM elements created by DOMWise
        const appNode = App({
            pageFlipAdapterRef,
            interactionManagerRef,
            bookWrapperRef: (el) => bookWrapperEl = el,
            bookSizerRef: (el) => bookSizerEl = el,
            bookContainerRef: (el) => bookContainerEl = el,
            className: this.options.className,
            store: this.store,
            pluginRegistry: this.pluginRegistry,
            onToggleFullscreen: () => this.toggleFullscreen(),
            onDownload: () => {
                if (!pdfUrl) return;
                if (this.options.onDownload) this.options.onDownload(pdfUrl);
                else window.open(pdfUrl, '_blank');
            },
            onShare: () => {
                void this.sharePage().then((url) => this.options.onShare?.(url)).catch((error) => {
                    console.warn('Share err:', error);
                });
            },
            onToggleBookmark: () => this.toggleBookmark(),
            onToggleNotes: () => {
                this.store.showNotes.value = !this.store.showNotes.value;
            },
            onSaveNote: (note: string) => this.setNote(this.getCurrentPage(), note),
            onClearNote: () => this.clearNote(this.getCurrentPage()),
            onCloseNotes: () => {
                this.store.showNotes.value = false;
            },
            onSearch: (query, searchOptions) => { void this.search(query, searchOptions); },
            onClearSearch: () => this.clearSearch(),
            onCloseSearch: () => { this.store.showSearch.value = false; },
            onSelectSearchResult: (pageIndex) => { this.goToPage(pageIndex); this.store.showSearch.value = false; },
            onHotspotActivate: (hotspot) => this.activateHotspot(hotspot.id),
            onHotspotClose: () => this.closeHotspot(),
            onAnnotationActivate: (annotation) => this.activateAnnotation(annotation.id),
            onAnnotationClose: () => this.closeAnnotation()
        });

        this.container.appendChild(appNode as unknown as Node);
        this.setupQualityLoading();

        // 4. Initialize Core Managers
        this.layoutManager = new LayoutManager(viewport, this.store);
        this.layoutManager.onResizeCallback = () => {
            if (this.pageFlipAdapter) {
                this.pageFlipAdapter.update();
            }
        };
        this.layoutManager.init(bookWrapperEl!, bookSizerEl!);

        this.pageFlipAdapter = new PageFlipAdapter(bookContainerEl!, this.options, this.store);
        pageFlipAdapterRef.current = this.pageFlipAdapter;

        // Wait a tick for styles to apply before initializing PageFlip.
        // The init promise resolves only after this setup is complete.
        await new Promise<void>((resolve) => {
            const finish = () => {
                abortController.signal.removeEventListener('abort', finish);
                resolve();
            };
            abortController.signal.addEventListener('abort', finish, { once: true });
            this.initializationTimer = setTimeout(async () => {
                this.initializationTimer = null;
                abortController.signal.removeEventListener('abort', finish);
                if (abortController.signal.aborted || generation !== this.initGeneration || !this.pageFlipAdapter) {
                    resolve();
                    return;
                }

                this.pageFlipAdapter.init(viewport.width, viewport.height);
                this.interactionManager = new InteractionManager(bookWrapperEl!, this.pageFlipAdapter, this.store);
                this.interactionManager.init();
                interactionManagerRef.current = this.interactionManager;
                this.setupPdfLazyLoading();
                if (this.pdfRenderer && pdfUrl) {
                    try {
                        await this.renderPdfPage(1, abortController.signal);
                    } catch {
                        resolve();
                        return;
                    }
                }
                if (abortController.signal.aborted || generation !== this.initGeneration) {
                    resolve();
                    return;
                }

                this.eventsReady = true;
                this.captureEventState();
                this.hasActiveSession = true;
                this.emit('init', { totalPages: resolvedPages.length });
                resolve();
            }, 10);
        });
        if (this.initAbortController === abortController) {
            this.initAbortController = null;
        }
    }

    private createPdfPlaceholder(pageNumber: number): NormalizedFlipbookPage {
        const placeholder = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        return { index: pageNumber - 1, assetId: 'pdf-page-' + pageNumber + '-full', pageNumber, sourcePageNumber: pageNumber, cropMode: 'full', normal: placeholder, low: placeholder, thumb: placeholder };
    }

    private createPdfPlaceholders(layouts: PdfPageLayout[]): NormalizedFlipbookPage[] {
        const placeholder = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        const pages: NormalizedFlipbookPage[] = [];
        layouts.forEach((layout, sourceIndex) => {
            const sourcePageNumber = sourceIndex + 1;
            const crops = layout.split ? (['left', 'right'] as const) : (['full'] as const);
            crops.forEach((cropMode) => {
                const pageNumber = pages.length + 1;
                pages.push({
                    index: pages.length,
                    assetId: `pdf-page-${sourcePageNumber}-${cropMode}`,
                    pageNumber,
                    sourcePageNumber,
                    cropMode,
                    normal: placeholder,
                    low: placeholder,
                    thumb: placeholder
                });
            });
        });
        return pages;
    }

    private renderPdfPage(pageNumber: number, signal?: AbortSignal): Promise<string> {
        const renderer = this.pdfRenderer;
        const generation = this.initGeneration;
        if (!renderer) return Promise.resolve('');
        const existing = this.pdfPageRequests.get(pageNumber);
        if (existing) return existing;
        if (this.pdfRenderedPages.has(pageNumber)) {
            const dataUrl = this.pdfRenderedSources.get(pageNumber);
            if (dataUrl) this.hydratePdfImages(pageNumber, dataUrl);
            return Promise.resolve(dataUrl || '');
        }

        const request = renderer.renderPageToDataUrl(pageNumber, signal).then((dataUrl) => {
            if (generation !== this.initGeneration || signal?.aborted) throw this.createAbortError();
            if (!dataUrl) throw new Error('PDF page ' + pageNumber + ' produced no image.');
            this.pdfRenderedPages.add(pageNumber);
            this.pdfRenderedSources.set(pageNumber, dataUrl);
            this.hydratePdfImages(pageNumber, dataUrl);
            this.emit('progress', {
                phase: 'rendering',
                completed: this.pdfRenderedPages.size,
                total: this.pdfSourcePageCount || this.store.totalPages.value
            });
            return dataUrl;
        }).catch((error) => {
            if (generation !== this.initGeneration && error?.name !== 'AbortError') throw this.createAbortError();
            if (error?.name === 'AbortError') throw error;
            this.emit('error', {
                code: 'PDF_RENDER_FAILED',
                message: error instanceof Error ? error.message : 'Unable to render PDF page.',
                cause: error
            });
            throw error;
        }).finally(() => {
            if (this.pdfPageRequests.get(pageNumber) === request) this.pdfPageRequests.delete(pageNumber);
        });
        this.pdfPageRequests.set(pageNumber, request);
        return request;
    }

    private hydratePdfImages(pageNumber: number, dataUrl: string) {
        this.container?.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
            if (image.dataset.pdfPage !== String(pageNumber)) return;
            image.src = dataUrl;
            delete image.dataset.pdfPage;
        });
    }
    private setupPdfLazyLoading() {
        this.pdfLazyStop?.();
        this.pdfLazyStop = null;
        if (!this.pdfRenderer) return;
        this.pdfLazyStop = effect(() => {
            const current = this.store.pages.value[this.store.currentPage.value];
            const next = this.store.pages.value[this.store.currentPage.value + 1];
            const sourcePages = new Set([current?.sourcePageNumber ?? current?.pageNumber, next?.sourcePageNumber ?? next?.pageNumber]);
            sourcePages.forEach((sourcePage) => {
                if (sourcePage) void this.renderPdfPage(sourcePage).catch(() => {});
            });
        });
    }
    private loadImageSize(src: string): Promise<{ width: number; height: number } | null> {
        return new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
            image.onerror = () => resolve(null);
            image.src = src;
        });
    }

    public goToPage(targetIdx: number) {
        const maxIndex = Math.max(0, this.store.totalPages.value - 1);
        this.store.currentPage.value = Math.max(0, Math.min(maxIndex, Math.trunc(targetIdx)));
    }

    public getTotalPages(): number {
        return this.store.totalPages.value;
    }

    public getCurrentPage(): number {
        return this.store.currentPage.value;
    }

    /** Returns the normalized host-provided table of contents. */
    public getToc(): FlipbookTocEntry[] {
        const clone = (entry: FlipbookTocEntry): FlipbookTocEntry => ({
            ...entry,
            ...(entry.children ? { children: entry.children.map(clone) } : {})
        });
        return this.store.toc.value.map(clone);
    }

    /** Replaces the table of contents and optionally opens its panel. */
    public setToc(entries: FlipbookTocEntry[], show = this.store.showToc.value): void {
        this.store.toc.value = normalizeFlipbookToc(entries, this.store.totalPages.value);
        this.store.showToc.value = Boolean(show) && this.store.toc.value.length > 0;
    }

    /** Installs a plugin. Plugins installed after init are available to the next render. */
    public installPlugin(plugin: FlipbookPlugin): this {
        this.pluginRegistry.install(this, plugin);
        return this;
    }

    /** Removes an installed plugin and all of its registered contributions. */
    public uninstallPlugin(name: string): boolean {
        return this.pluginRegistry.uninstall(name);
    }

    /** Returns the names of installed plugins. */
    public getPluginNames(): string[] {
        return this.pluginRegistry.getPluginNames();
    }

    /** Calls a namespaced API registered by a plugin. */
    public callPluginApi<T = unknown>(pluginName: string, apiName: string, ...args: any[]): Promise<T> {
        return this.pluginRegistry.callApi<T>(pluginName, apiName, ...args);
    }

    /** Internal UI registry used by the built-in DOM renderer. */
    public getPluginRegistry() {
        return this.pluginRegistry;
    }

    /** Returns the zero-based page indexes currently marked as bookmarks. */
    public getBookmarkedPages(): number[] {
        return Array.from(this.store.bookmarkedPages.value).sort((a, b) => a - b);
    }

    /** Returns whether a zero-based page index is bookmarked. */
    public isBookmarked(pageIndex = this.getCurrentPage()): boolean {
        return this.store.bookmarkedPages.value.has(Math.trunc(pageIndex));
    }

    /** Sets the bookmark state for a zero-based page index and emits bookmarkChange when it changes. */
    public setBookmark(pageIndex: number, bookmarked = true): void {
        if (this.store.totalPages.value === 0 || !Number.isFinite(pageIndex)) return;
        const boundedIndex = Math.max(0, Math.min(this.store.totalPages.value - 1, Math.trunc(pageIndex)));
        const current = this.store.bookmarkedPages.value;
        if (current.has(boundedIndex) === bookmarked) return;
        const next = new Set(current);
        if (bookmarked) next.add(boundedIndex); else next.delete(boundedIndex);
        this.store.bookmarkedPages.value = next;
        this.emit('bookmarkChange', { pageIndex: boundedIndex, pageNumber: boundedIndex + 1, bookmarked });
    }

    /** Toggles the bookmark state for a zero-based page index. */
    public toggleBookmark(pageIndex = this.getCurrentPage()): void {
        this.setBookmark(pageIndex, !this.isBookmarked(pageIndex));
    }

    /** Returns all non-empty host-managed notes keyed by zero-based page index. */
    public getNotes(): Record<number, string> {
        return Object.fromEntries(this.store.pageNotes.value);
    }

    /** Returns the note for a zero-based page index, if one exists. */
    public getNote(pageIndex = this.getCurrentPage()): string | undefined {
        return this.store.pageNotes.value.get(Math.trunc(pageIndex));
    }

    /** Sets or clears a host-managed note and emits noteChange when it changes. */
    public setNote(pageIndex: number, note: string): void {
        if (this.store.totalPages.value === 0 || !Number.isFinite(pageIndex)) return;
        const boundedIndex = Math.max(0, Math.min(this.store.totalPages.value - 1, Math.trunc(pageIndex)));
        const normalizedNote = String(note ?? '').trim();
        const currentNote = this.store.pageNotes.value.get(boundedIndex);
        if (currentNote === (normalizedNote || undefined)) return;
        const next = new Map(this.store.pageNotes.value);
        if (normalizedNote) next.set(boundedIndex, normalizedNote); else next.delete(boundedIndex);
        this.store.pageNotes.value = next;
        this.emit('noteChange', { pageIndex: boundedIndex, pageNumber: boundedIndex + 1, note: normalizedNote || null });
    }

    /** Clears the host-managed note for a zero-based page index. */
    public clearNote(pageIndex = this.getCurrentPage()): void {
        this.setNote(pageIndex, '');
    }

    /** Searches the loaded PDF text without rendering pages and updates result highlights. */
    public async search(query: string, options: FlipbookSearchOptions = {}): Promise<FlipbookSearchResult[]> {
        const normalizedQuery = String(query ?? '').trim();
        if (!normalizedQuery || !this.pdfRenderer || !this.store.isPdfMode.value) {
            this.store.searchQuery.value = normalizedQuery;
            this.store.searchResults.value = [];
            this.emit('searchChange', { query: normalizedQuery, results: [] });
            return [];
        }
        const sourceResults = await this.pdfRenderer.searchText(normalizedQuery, options);
        const results: FlipbookSearchResult[] = [];
        sourceResults.forEach((source) => {
            this.store.pages.value.forEach((page) => {
                if ((page.sourcePageNumber ?? page.pageNumber) !== source.sourcePageNumber) return;
                const highlights = this.mapSearchHighlights(source.highlights, page.cropMode);
                if (source.highlights?.length && !highlights.length) return;
                results.push({ pageIndex: page.index, pageNumber: page.pageNumber, sourcePageNumber: source.sourcePageNumber, matches: source.matches, snippet: source.snippet, ...(source.highlights ? { highlights } : {}) });
            });
        });
        const maxResults = Number.isFinite(options.maxResults) ? Math.max(1, Math.trunc(options.maxResults as number)) : 100;
        this.store.searchQuery.value = normalizedQuery;
        this.store.searchResults.value = results.slice(0, maxResults);
        this.emit('searchChange', { query: normalizedQuery, results: this.store.searchResults.value });
        return this.store.searchResults.value;
    }

    private mapSearchHighlights(highlights: FlipbookSearchHighlight[] | undefined, cropMode: NormalizedFlipbookPage['cropMode']): FlipbookSearchHighlight[] {
        if (!highlights?.length || cropMode === 'full') return highlights ?? [];
        const cropStart = cropMode === 'right' ? 0.5 : 0;
        return highlights.flatMap((highlight) => {
            const start = Math.max(cropStart, highlight.x);
            const end = Math.min(cropStart + 0.5, highlight.x + highlight.width);
            if (end <= start) return [];
            return [{
                x: Math.max(0, Math.min(1, (start - cropStart) * 2)),
                y: Math.max(0, Math.min(1, highlight.y)),
                width: Math.max(0, Math.min(1, (end - start) * 2)),
                height: Math.max(0, Math.min(1, highlight.height))
            }];
        });
    }

    /** Clears the current client-side search. */
    public clearSearch(): void {
        this.store.searchQuery.value = '';
        this.store.searchResults.value = [];
        this.emit('searchChange', { query: '', results: [] });
    }

    public getSearchResults(): FlipbookSearchResult[] { return this.store.searchResults.value.slice(); }

    public getHotspots(pageIndex = this.getCurrentPage()): FlipbookHotspot[] {
        return this.store.hotspots.value.filter((hotspot) => hotspot.pageIndex === pageIndex);
    }

    public activateHotspot(hotspotId: string): void {
        const hotspot = this.store.hotspots.value.find((item) => item.id === hotspotId);
        if (!hotspot) return;
        this.store.activeHotspotId.value = hotspot.id;
        this.emit('hotspotActivate', { hotspot, pageIndex: hotspot.pageIndex });
    }

    public closeHotspot(): void { this.store.activeHotspotId.value = null; }

    public getAnnotations(pageIndex = this.getCurrentPage()): FlipbookAnnotation[] {
        return this.store.annotations.value.filter((annotation) => annotation.pageIndex === pageIndex);
    }

    public activateAnnotation(annotationId: string): void {
        const annotation = this.store.annotations.value.find((item) => item.id === annotationId);
        if (!annotation) return;
        this.store.activeAnnotationId.value = annotation.id;
        this.emit('annotationActivate', { annotation, pageIndex: annotation.pageIndex });
    }

    public closeAnnotation(): void { this.store.activeAnnotationId.value = null; }

    public getZoom(): number {
        return this.store.zoomState.value.scale;
    }

    public setZoom(zoomLevel: number) {
        const requestedZoom = Number.isFinite(zoomLevel) ? zoomLevel : 1;
        const scale = Math.max(0.5, Math.min(5, requestedZoom));
        this.store.zoomState.value = {
            ...this.store.zoomState.value,
            scale,
            isActive: scale > 1,
            ...(scale <= 1 ? { translateX: 0, translateY: 0 } : {})
        };
        this.store.isZoomed.value = scale > 1;
    }

    public nextPage() {
        if (this.pageFlipAdapter) this.pageFlipAdapter.turnToNextPage();
    }

    public toggleFullscreen() {
        const target = this.container;
        if (!target) return;
        if (!document.fullscreenElement) {
            target.requestFullscreen?.().catch((error) => console.warn('Fullscreen err:', error));
        } else {
            document.exitFullscreen?.().catch((error) => console.warn('Exit fullscreen err:', error));
        }
    }

    public setLocale(locale: FlipbookLocale | string, messages?: FlipbookLocaleMessages) {
        const mergedMessages = messages
            ? { ...this.options.messages, [locale]: (messages as Partial<Record<string, PartialFlipbookMessages>>)[locale] ?? messages }
            : this.options.messages;
        this.options = { ...this.options, locale, messages: mergedMessages };
        this.store.locale.value = locale;
        if (mergedMessages) this.store.messages.value = mergedMessages;
    }
    public prevPage() {
        if (this.pageFlipAdapter) this.pageFlipAdapter.turnToPrevPage();
    }

    public setSingleMode(isSingle: boolean) {
        this.store.isSingleMode.value = isSingle;
        if (isSingle && this.pdfRenderer) {
            setTimeout(() => {
                const page = this.store.pages.value[this.store.currentPage.value];
                const sourcePage = page?.sourcePageNumber ?? page?.pageNumber;
                if (sourcePage) void this.renderPdfPage(sourcePage).catch(() => {});
            }, 0);
        }
    }

    public updateOptions(options: Partial<FlipbookEngineOptions>) {
        const deepLinkChanged = options.deepLink !== undefined && options.deepLink !== this.options.deepLink;
        this.options = { ...this.options, ...options };
        if (deepLinkChanged) {
            if (this.options.deepLink) this.setupDeepLinkListener();
            else this.teardownDeepLinkListener();
        }
        if (options.theme !== undefined) this.store.themeMode.value = options.theme;
        if (options.primaryColor !== undefined) this.store.primaryColor.value = options.primaryColor;
        if (options.showThumbs !== undefined) this.store.showThumbs.value = options.showThumbs;
        if (options.showToc !== undefined) this.store.showToc.value = options.showToc;
        if (options.toc !== undefined) this.store.toc.value = normalizeFlipbookToc(options.toc, this.store.totalPages.value);
        if (options.showArrows !== undefined) this.store.showArrows.value = options.showArrows;
        if (options.allowDownload !== undefined) this.store.allowDownload.value = options.allowDownload;
        if (options.whiteLabel !== undefined) this.store.whiteLabel.value = options.whiteLabel;
        if (options.soundEnabled !== undefined) this.store.soundEnabled.value = options.soundEnabled;
        if (options.locale !== undefined) this.store.locale.value = options.locale;
        if (options.messages !== undefined) this.store.messages.value = options.messages;
        if (options.singleMode !== undefined) this.store.isSingleMode.value = options.singleMode;
        if (options.isSingleMode !== undefined) this.store.isSingleMode.value = options.isSingleMode;
        if (options.autoPlay !== undefined) this.store.isAutoPlaying.value = options.autoPlay;
        if (options.autoPlayInterval !== undefined) this.store.autoPlayInterval.value = options.autoPlayInterval;
        if (options.bookmarks !== undefined) this.store.bookmarkedPages.value = new Set(options.bookmarks.map((page) => Math.trunc(page)).filter((page) => Number.isInteger(page) && page >= 0 && page < this.store.totalPages.value));
        if (options.notes !== undefined) this.store.pageNotes.value = new Map(Object.entries(options.notes).map(([page, note]) => [Math.trunc(Number(page)), String(note).trim()] as const).filter(([page, note]) => Number.isInteger(page) && page >= 0 && page < this.store.totalPages.value && note.length > 0));
        if (options.hotspots !== undefined) this.store.hotspots.value = options.hotspots;
        if (options.annotations !== undefined) this.store.annotations.value = options.annotations;

        if (this.container) {
            applyThemeConfiguration(this.container, this.options);
        }
    }

    private setupDeepLinkListener() {
        this.teardownDeepLinkListener();
        if (!this.options.deepLink || typeof window === 'undefined') return;
        this.deepLinkListener = () => {
            if (!this.eventsReady || this.store.totalPages.value === 0) return;
            const pageIndex = this.readDeepLinkPage();
            if (pageIndex !== null && pageIndex !== this.store.currentPage.value) this.goToPage(pageIndex);
        };
        window.addEventListener('popstate', this.deepLinkListener);
        window.addEventListener('hashchange', this.deepLinkListener);
    }

    private teardownDeepLinkListener() {
        if (!this.deepLinkListener || typeof window === 'undefined') return;
        window.removeEventListener('popstate', this.deepLinkListener);
        window.removeEventListener('hashchange', this.deepLinkListener);
        this.deepLinkListener = null;
    }

    private readDeepLinkPage(url = typeof window === 'undefined' ? '' : window.location.href): number | null {
        if (!url || this.store.totalPages.value === 0) return null;
        try {
            const parsed = new URL(url, typeof document === 'undefined' ? undefined : document.baseURI);
            const hashPage = parsed.hash.match(/(?:^#|&)page=(\d+)/i)?.[1];
            const rawPage = parsed.searchParams.get('page') ?? hashPage;
            if (rawPage == null) return 0;
            const pageNumber = Number(rawPage);
            if (!Number.isInteger(pageNumber) || pageNumber < 1) return null;
            return Math.min(pageNumber - 1, this.store.totalPages.value - 1);
        } catch {
            return null;
        }
    }

    private applyInitialDeepLink() {
        if (!this.options.deepLink) return;
        const pageIndex = this.readDeepLinkPage();
        if (pageIndex !== null) this.store.currentPage.value = pageIndex;
    }

    private updateDeepLink(pageIndex: number) {
        if (!this.options.deepLink || typeof window === 'undefined' || this.store.totalPages.value === 0) return;
        const boundedIndex = Math.max(0, Math.min(this.store.totalPages.value - 1, Math.trunc(pageIndex)));
        const pageNumber = boundedIndex + 1;
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('page', String(pageNumber));
            const nextUrl = url.toString();
            if (nextUrl !== window.location.href) window.history.replaceState(window.history.state, '', nextUrl);
            this.emit('deepLinkChange', { pageIndex: boundedIndex, pageNumber, url: nextUrl });
        } catch {
            // Ignore restricted history contexts such as sandboxed documents.
        }
    }

    /** Returns a shareable URL addressing a 1-based page number. */
    public getPageUrl(pageIndex = this.getCurrentPage()): string {
        if (typeof window === 'undefined') return '';
        const totalPages = this.getTotalPages();
        const boundedIndex = totalPages > 0
            ? Math.max(0, Math.min(totalPages - 1, Math.trunc(pageIndex)))
            : Math.max(0, Math.trunc(pageIndex));
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(boundedIndex + 1));
        return url.toString();
    }

    /** Opens the native share dialog or copies a page URL to the clipboard. */
    public async sharePage(pageIndex = this.getCurrentPage()): Promise<string> {
        const url = this.getPageUrl(pageIndex);
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            await navigator.share({ title: typeof document === 'undefined' ? undefined : document.title, url });
        } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
        }
        return url;
    }

    /** Connects an optional postMessage bridge for iframe/embed integrations. */
    public connectEmbed(options: FlipbookEmbedOptions = {}): FlipbookEmbedBridge {
        return new FlipbookEmbedBridge(this, options).connect();
    }

    public async setPages(imageList?: Array<PageImages | FlipbookPageAsset>, pdfUrl?: string) {
        // Framework wrappers call this after their initial render. When no image
        // pages are supplied, the current PDF-backed viewer must stay mounted;
        // reinitializing with an empty source clears an otherwise valid PDF view.
        if (!imageList?.length) {
            if (pdfUrl) {
                await this.init(pdfUrl);
            }
            return;
        }

        await this.init(pdfUrl || '', imageList);
    }

    private setupQualityLoading() {
        this.teardownQualityLoading();
        if (!this.container) return;

        const images = Array.from(this.container.querySelectorAll<HTMLImageElement>('img[data-src], img[data-pdf-page]'));
        const upgrade = (image: HTMLImageElement) => {
            const pdfPage = Number(image.dataset.pdfPage);
            if (Number.isInteger(pdfPage) && pdfPage > 0) {
                void this.renderPdfPage(pdfPage).catch(() => {});
                return;
            }
            const highQualitySrc = image.dataset.src;
            if (!highQualitySrc) return;
            image.src = highQualitySrc;
            delete image.dataset.src;
        };

        const Observer = this.container.ownerDocument.defaultView?.IntersectionObserver;
        if (!Observer) {
            const pdfPages = new Set<number>();
            images.forEach((image) => {
                const pdfPage = Number(image.dataset.pdfPage);
                if (Number.isInteger(pdfPage) && pdfPage > 0) {
                    if (pdfPages.size < 2) {
                        pdfPages.add(pdfPage);
                        upgrade(image);
                    }
                } else {
                    upgrade(image);
                }
            });
            return;
        }

        this.qualityObserver = new Observer((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    upgrade(entry.target as HTMLImageElement);
                    this.qualityObserver?.unobserve(entry.target);
                }
            });
        }, { root: this.container, rootMargin: '240px' });
        images.forEach((image) => this.qualityObserver?.observe(image));
    }

    private teardownQualityLoading() {
        this.qualityObserver?.disconnect();
        this.qualityObserver = null;
    }
    private setupEventSync() {
        this.eventSyncStop = effect(() => {
            const state = {
                currentPage: this.store.currentPage.value,
                zoom: this.store.zoomState.value.scale,
                zoomActive: this.store.zoomState.value.isActive,
                showThumbs: this.store.showThumbs.value,
                showToc: this.store.showToc.value,
                isSingle: this.store.isSingleMode.value,
                orientation: this.store.orientation.value
            };
            if (!this.eventsReady) {
                this.lastEventState = state;
                return;
            }
            if (state.currentPage !== this.lastEventState.currentPage) {
                this.emit('pageChange', {
                    currentPage: state.currentPage,
                    pageNumber: state.currentPage + 1,
                    totalPages: this.store.totalPages.value,
                    isSingle: state.isSingle
                });
                this.updateDeepLink(state.currentPage);
            }
            if (state.zoom !== this.lastEventState.zoom || state.zoomActive !== this.lastEventState.zoomActive) {
                this.emit('zoomChange', { zoom: state.zoom, isActive: state.zoomActive });
            }
            if (state.showThumbs !== this.lastEventState.showThumbs) {
                this.emit('thumbsToggle', { showThumbs: state.showThumbs });
            }
            if (state.showToc !== this.lastEventState.showToc) {
                this.emit('tocToggle', { showToc: state.showToc });
            }
            if (state.isSingle !== this.lastEventState.isSingle) {
                this.emit('singlePageModeChange', { isSingle: state.isSingle });
            }
            if (state.orientation !== this.lastEventState.orientation) {
                this.emit('orientationChange', { orientation: state.orientation });
            }
            this.lastEventState = state;
        });
    }

    private captureEventState() {
        this.lastEventState = {
            currentPage: this.store.currentPage.value,
            zoom: this.store.zoomState.value.scale,
            zoomActive: this.store.zoomState.value.isActive,
            showThumbs: this.store.showThumbs.value,
            showToc: this.store.showToc.value,
            isSingle: this.store.isSingleMode.value,
            orientation: this.store.orientation.value
        };
    }
    public destroy(keepContainer = false) {
        const hadSession = this.hasActiveSession || !!this.initAbortController || !!this.pageFlipAdapter || !!this.layoutManager || !!this.interactionManager || !!this.pdfRenderer;
        this.initGeneration++;
        this.teardownDeepLinkListener();
        this.initAbortController?.abort();
        this.initAbortController = null;
        if (this.initializationTimer) {
            clearTimeout(this.initializationTimer);
            this.initializationTimer = null;
        }

        if (this.pageFlipAdapter) {
            this.pageFlipAdapter.destroy();
        }
        if (this.layoutManager) {
            this.layoutManager.destroy();
        }
        if (this.interactionManager) {
            this.interactionManager.destroy();
        }
        this.teardownQualityLoading();
        this.pdfLazyStop?.();
        this.pdfLazyStop = null;
        this.pdfPageRequests.clear();
        this.pdfRenderedPages.clear();
        this.pdfRenderedSources.clear();
        this.pdfSourcePageCount = 0;
        if (this.pdfRenderer) {
            this.pdfRenderer.destroy();
        }

        this.pageFlipAdapter = null;
        this.layoutManager = null;
        this.interactionManager = null;
        this.pdfRenderer = null;
        this.eventsReady = false;
        this.hasActiveSession = false;
        this.store.reset();

        if (!keepContainer && this.container) {
            this.container.innerHTML = '';
        }

        if (hadSession) this.emit('destroy', undefined);
        if (!keepContainer) this.pluginRegistry.clear();
    }

    private createAbortError() {
        const error = new Error('Flipbook initialization was aborted.');
        error.name = 'AbortError';
        return error;
    }

    public on<T extends FlipbookEngineEventName>(eventName: T, handler: FlipbookEventHandler<T>) {
        const listeners = this.listeners[eventName] ?? new Set<AnyFlipbookEventHandler>();
        listeners.add(handler as AnyFlipbookEventHandler);
        this.listeners[eventName] = listeners;
        return () => this.off(eventName, handler);
    }

    public off<T extends FlipbookEngineEventName>(eventName: T, handler: FlipbookEventHandler<T>) {
        this.listeners[eventName]?.delete(handler as AnyFlipbookEventHandler);
    }

    private emit<T extends FlipbookEngineEventName>(eventName: T, payload: FlipbookEngineEventMap[T]) {
        this.listeners[eventName]?.forEach((listener) => {
            (listener as FlipbookEventHandler<T>)(payload);
        });
    }
}

const globalScope = globalThis as any;
const flipbookNamespace = globalScope.FlipbookEngine || {};
flipbookNamespace.FlipbookEngine = FlipbookEngine;
globalScope.FlipbookEngine = flipbookNamespace;














