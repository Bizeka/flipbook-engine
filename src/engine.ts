/**
 * @license FlipbookEngine v0.6.0
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
import { applyThemeConfiguration, type FlipbookThemeMode } from './theme/theme';
import { resolveMessages, type FlipbookLocale, type PartialFlipbookMessages } from './i18n/service';
import { PdfRenderer } from './core/PdfRenderer';
import { normalizeFlipbookToc, type FlipbookTocEntry } from './model/toc';
import './styles/flipbook-engine.css';

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
    whiteLabel?: boolean;
    watermarkUrl?: string;
    theme?: FlipbookThemeMode;
    locale?: FlipbookLocale | string;
    messages?: Partial<Record<string, PartialFlipbookMessages>>;
    className?: string;
    cssVariables?: Record<string, string>;
    onDownload?: (url: string) => void;
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
    private lastEventState = { currentPage: 0, zoom: 1, zoomActive: false, showThumbs: true, showToc: false, isSingle: false, orientation: '' as '' | 'landscape' | 'portrait' };
    private eventSyncStop: (() => void) | null = null;
    private qualityObserver: IntersectionObserver | null = null;
    private pdfLazyStop: (() => void) | null = null;
    private hasActiveSession = false;
    private readonly pdfPageRequests = new Map<number, Promise<string>>();
    private readonly pdfRenderedPages = new Set<number>();

    constructor(private selector: string | HTMLElement, options: FlipbookEngineOptions = {}) {
        this.options = {
            allowDownload: true,
            showThumbs: true,
            primaryColor: '#7367f0',
            theme: 'auto',
            soundUrl: 'https://flipbookengine.com/Content/page-flip.mp3',
            autoPlayInterval: 3000,
            pdfRenderScale: 1.5,
            pdfRenderQuality: 0.85,
            pdfRenderFormat: 'image/webp',
            pdfRenderConcurrency: 3,
            pdfRenderCacheSize: 32,
            ...options
        };
        this.setupEventSync();
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
                viewport = await this.pdfRenderer.calculateViewportDimensions();
                resolvedPages = Array.from({ length: totalPages }, (_, index) => this.createPdfPlaceholder(index + 1));
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
        this.store.init(this.options, resolvedPages.length, resolvedPages, !!pdfUrl);

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
            onToggleFullscreen: () => this.toggleFullscreen(),
            onDownload: () => {
                if (!pdfUrl) return;
                if (this.options.onDownload) this.options.onDownload(pdfUrl);
                else window.open(pdfUrl, '_blank');
            }
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
        return {
            index: pageNumber - 1,
            assetId: 'pdf-page-' + pageNumber,
            pageNumber,
            cropMode: 'full',
            normal: placeholder,
            low: placeholder,
            thumb: placeholder
        };
    }

    private renderPdfPage(pageNumber: number, signal?: AbortSignal): Promise<string> {
        const renderer = this.pdfRenderer;
        const generation = this.initGeneration;
        if (!renderer) return Promise.resolve('');
        const existing = this.pdfPageRequests.get(pageNumber);
        if (existing) return existing;
        if (this.pdfRenderedPages.has(pageNumber)) return Promise.resolve('');

        const request = renderer.renderPageToDataUrl(pageNumber, signal).then((dataUrl) => {
            if (generation !== this.initGeneration || signal?.aborted) throw this.createAbortError();
            if (!dataUrl) throw new Error('PDF page ' + pageNumber + ' produced no image.');
            this.pdfRenderedPages.add(pageNumber);
            this.container?.querySelectorAll<HTMLImageElement>('img[data-pdf-page="' + pageNumber + '"]').forEach((image) => {
                image.src = dataUrl;
                delete image.dataset.pdfPage;
            });
            this.emit('progress', {
                phase: 'rendering',
                completed: this.pdfRenderedPages.size,
                total: this.store.totalPages.value
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

    private setupPdfLazyLoading() {
        this.pdfLazyStop?.();
        this.pdfLazyStop = null;
        if (!this.pdfRenderer) return;
        this.pdfLazyStop = effect(() => {
            const currentPage = this.store.currentPage.value + 1;
            const totalPages = this.store.totalPages.value;
            [currentPage, currentPage + 1].filter((page) => page <= totalPages).forEach((page) => {
                void this.renderPdfPage(page).catch(() => {});
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
    }

    public updateOptions(options: Partial<FlipbookEngineOptions>) {
        this.options = { ...this.options, ...options };
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

        if (this.container) {
            applyThemeConfiguration(this.container, this.options);
        }
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














