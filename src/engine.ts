/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

/// <reference types="vite/client" />

import * as pdfjsLib from 'pdfjs-dist';
import { PageFlip } from 'page-flip';
import './styles/flipbook-engine.css';
import { applyThemeConfiguration as applyContainerThemeConfiguration, ensureRuntimeStyles, type FlipbookThemeMode } from './theme/theme';
import { resolveMessages, type FlipbookLocale, type PartialFlipbookMessages } from './i18n/service';
import { isFlipbookPageAsset, normalizeFlipbookPages, type FlipbookCropMode, type FlipbookPageAsset, type NormalizedFlipbookPage } from './model/pages';
import { buildEmptyStateUi, buildFlipbookUi, type FlipbookUiElements } from './ui/template';
import { el } from './utils/dom';

// @ts-ignore
const pdfWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface FlipbookEngineOptions {
    allowDownload?: boolean;
    showThumbs?: boolean;
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
    singlePageModeChange: { isSingle: boolean };
    orientationChange: { orientation: 'landscape' | 'portrait' };
}

export type FlipbookEngineEventName = keyof FlipbookEngineEventMap;
type FlipbookEventHandler<T extends FlipbookEngineEventName> = (payload: FlipbookEngineEventMap[T]) => void;
type AnyFlipbookEventHandler = (payload: FlipbookEngineEventMap[FlipbookEngineEventName]) => void;

export class FlipbookEngine {
    private static readonly DEFAULT_PAGE_VIEWPORT = { width: 420, height: 594 };
    private container: HTMLElement | null = null;
    private ui!: FlipbookUiElements;
    private pageFlip: any = null;
    private sourceAssets: FlipbookPageAsset[] = [];
    private pages: NormalizedFlipbookPage[] = [];
    private downloadUrl: string = "";
    private totalPages = 0;
    private pageViewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };
    private pdfDoc: any = null;
    private pdfPagesCache: Map<string, string> = new Map();

    private currentZoom = 1;
    private zoomState = { isActive: false, translateX: 0, translateY: 0, isDragging: false, startX: 0, startY: 0 };
    private messages = resolveMessages();
    private listeners: Partial<Record<FlipbookEngineEventName, Set<AnyFlipbookEventHandler>>> = {};
    private domEventController: AbortController | null = null;
    private orientationMediaQuery: MediaQueryList | null = null;
    private orientationChangeHandler: (() => void) | null = null;
    private initialized = false;
    private state = { showThumbs: true, isSingle: false, currentPage: 0, orientation: 'landscape' };
    private touchStartX = 0;
    private flipState: 'read' | 'fold_corner' | 'flipping' = 'read';

    constructor(private selector: string | HTMLElement, private options: FlipbookEngineOptions = {}) {
        this.options = { allowDownload: true, showThumbs: true, primaryColor: '#7367f0', theme: 'auto', ...options };
        this.messages = resolveMessages({ locale: this.options.locale, messages: this.options.messages });
        if (this.options.showThumbs !== undefined) this.state.showThumbs = this.options.showThumbs;
    }

    public async init(pdfUrl: string, imageList?: Array<PageImages | FlipbookPageAsset>) {
        this.downloadUrl = pdfUrl;
        
        if (typeof this.selector === 'string') {
            this.container = document.querySelector(this.selector) as HTMLElement;
        } else {
            this.container = this.selector;
        }

        if (!this.container) return;

        this.destroy(true);

        if (imageList && imageList.length > 0) {
            this.setResolvedPages(imageList);
        } else if (pdfUrl) {
            try {
                this.pdfPagesCache = new Map();
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                this.pdfDoc = await loadingTask.promise;
                this.totalPages = this.pdfDoc.numPages;

                const generatedPages: NormalizedFlipbookPage[] = [];
                for (let i = 1; i <= this.totalPages; i++) {
                    generatedPages.push({
                        index: i - 1,
                        assetId: `pdf-page-${i}`,
                        pageNumber: i,
                        cropMode: 'full',
                        normal: '',
                        low: '',
                        thumb: ''
                    });
                }
                this.pages = generatedPages;

                const firstPage = await this.pdfDoc.getPage(1);
                const vp = firstPage.getViewport({ scale: 1.0 });
                const aspectRatio = vp.width / vp.height;

                const baseShortSide = 420;
                this.pageViewport = aspectRatio >= 1
                    ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
                    : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };
            } catch (e) {
                console.error("PDF load failed:", e);
                this.renderEmptyState();
                return;
            }
        }

        if (!this.pages.length) {
            this.renderEmptyState();
            return;
        }

        this.mountViewer();
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

    public getCurrentPage() {
        return this.state.currentPage;
    }

    public getTotalPages() {
        return this.totalPages;
    }

    public getLocale() {
        return this.options.locale ?? 'en';
    }

    public goToPage(targetIdx: number) {
        if (targetIdx < 0 || targetIdx >= this.totalPages) return;

        if (this.state.isSingle) {
            this.state.currentPage = targetIdx;
            this.updateSingleView();
            this.syncUI();
            this.emitPageChange();
        } else {
            if (this.pageFlip) {
                const hasEmptyCover = this.ui.book.querySelector('.empty-cover') !== null;
                let destPage = hasEmptyCover ? targetIdx + 1 : targetIdx;
                if (this.state.orientation === 'landscape' && hasEmptyCover) {
                    if (destPage % 2 !== 0 && destPage > 1) {
                        destPage = destPage - 1;
                    }
                }
                this.pageFlip.flip(destPage);
            }
        }
    }

    public getZoom() {
        return this.currentZoom;
    }

    public setZoom(zoomLevel: number) {
        const bookWrapper = this.ui.bookWrapper;
        if (!bookWrapper) return;

        this.currentZoom = Math.max(0.5, Math.min(5, zoomLevel));
        
        if (this.currentZoom <= 1) {
            this.currentZoom = 1;
            this.zoomState.isActive = false;
            this.zoomState.translateX = 0;
            this.zoomState.translateY = 0;
            bookWrapper.classList.remove('zoomed');
        } else {
            this.zoomState.isActive = true;
            bookWrapper.classList.add('zoomed');
        }

        this.ui.bookWrapper.style.transform = `translate(${this.zoomState.translateX}px, ${this.zoomState.translateY}px) scale(${this.currentZoom})`;
        this.emitZoomChange();
    }

    public toggleFullscreen() {
        const root = this.container?.querySelector('.bk-wrapper');
        if (!root) return;

        if (!document.fullscreenElement) {
            root.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    }

    public destroy(clearMarkup = true) {
        this.teardownMountedViewer();
        this.currentZoom = 1;
        this.zoomState = { isActive: false, translateX: 0, translateY: 0, isDragging: false, startX: 0, startY: 0 };
        this.state.currentPage = 0;

        if (this.pdfPagesCache) {
            this.pdfPagesCache.forEach(url => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {}
            });
            this.pdfPagesCache.clear();
        }
        this.pdfDoc = null;

        if (clearMarkup && this.container) {
            this.container.innerHTML = '';
        }

        this.emit('destroy', undefined);
    }

    public updateOptions(nextOptions: Partial<FlipbookEngineOptions>) {
        this.options = { ...this.options, ...nextOptions };
        this.messages = resolveMessages({ locale: this.options.locale, messages: this.options.messages });

        if (nextOptions.showThumbs !== undefined) {
            this.state.showThumbs = nextOptions.showThumbs;
        }

        if (!this.container) {
            if (typeof this.selector === 'string') {
                this.container = document.querySelector(this.selector) as HTMLElement;
            } else {
                this.container = this.selector;
            }
        }

        if (!this.container) return;

        if (!this.pages.length) {
            this.teardownMountedViewer();
            this.renderEmptyState();
            return;
        }

        this.mountViewer();
    }

    public setLocale(locale: FlipbookLocale | string, messages?: PartialFlipbookMessages) {
        const mergedMessages = { ...(this.options.messages ?? {}) };
        if (messages) {
            mergedMessages[locale] = { ...(mergedMessages[locale] ?? {}), ...messages };
        }

        this.updateOptions({
            locale,
            messages: mergedMessages
        });
    }

    public setPages(imageList: Array<PageImages | FlipbookPageAsset>, pdfUrl = this.downloadUrl) {
        this.downloadUrl = pdfUrl;
        this.setResolvedPages(imageList);

        if (!this.container) {
            if (typeof this.selector === 'string') {
                this.container = document.querySelector(this.selector) as HTMLElement;
            } else {
                this.container = this.selector;
            }
        }

        if (!this.container) return;

        if (!this.pages.length) {
            this.teardownMountedViewer();
            this.renderEmptyState();
            return;
        }

        this.state.currentPage = 0;
        void this.resolvePageViewport().then(() => {
            if (!this.container || !this.pages.length) return;
            this.mountViewer();
        });
    }

    private buildUI() {
        this.ui = buildFlipbookUi(
            { showThumbs: this.state.showThumbs },
            {
                allowDownload: !!this.options.allowDownload,
                hasDownloadUrl: !!this.downloadUrl,
                totalPages: this.totalPages,
                className: this.options.className,
                whiteLabel: !!this.options.whiteLabel,
                watermarkUrl: this.options.watermarkUrl,
                messages: this.messages
            }
        );
        this.container!.innerHTML = '';
        this.container!.appendChild(this.ui.wrapper);
    }

    private mountViewer() {
        this.teardownMountedViewer();
        ensureRuntimeStyles();
        this.applyThemeConfiguration();
        this.buildUI();
        this.renderPagesIntoDOM();
        this.initPageFlip();
        this.bindEvents();
        this.setupOrientationHandling();
        this.initialized = true;
        this.emit('init', { totalPages: this.totalPages });
        this.emitPageChange();
    }

    private renderEmptyState() {
        ensureRuntimeStyles();
        this.applyThemeConfiguration();
        if (this.container) {
            this.container.innerHTML = '';
            this.container.appendChild(buildEmptyStateUi(this.messages.emptyStateTitle));
        }
    }

    private teardownMountedViewer() {
        this.teardownRuntimeBindings();

        if (this.pageFlip?.destroy) {
            this.pageFlip.destroy();
        }

        this.pageFlip = null;
        this.initialized = false;
    }

    private setResolvedPages(imageList?: Array<PageImages | FlipbookPageAsset>) {
        if (imageList && imageList.length > 0) {
            this.sourceAssets = imageList.filter(isFlipbookPageAsset);
            this.pages = normalizeFlipbookPages(this.sourceAssets);
            this.totalPages = this.pages.length;
            return;
        }

        this.sourceAssets = [];
        this.pages = [];
        this.totalPages = 0;
        this.pageViewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };
    }

    private async resolvePageViewport() {
        const referencePage = this.pages.find(page => page.cropMode !== 'full') ?? this.pages[0];

        if (!referencePage) {
            this.pageViewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };
            return;
        }

        const naturalSize = await this.loadImageSize(referencePage.low || referencePage.normal);
        if (!naturalSize) {
            this.pageViewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };
            return;
        }

        const effectiveWidth = referencePage.cropMode === 'full'
            ? naturalSize.width
            : Math.max(1, naturalSize.width / 2);
        const effectiveHeight = naturalSize.height;
        const aspectRatio = effectiveWidth / effectiveHeight;

        if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
            this.pageViewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };
            return;
        }

        const baseShortSide = 420;
        const viewport = aspectRatio >= 1
            ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
            : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };

        this.pageViewport = viewport;
    }

    private loadImageSize(src: string): Promise<{ width: number; height: number } | null> {
        return new Promise(resolve => {
            const image = new Image();

            image.onload = () => {
                resolve({
                    width: image.naturalWidth || image.width,
                    height: image.naturalHeight || image.height
                });
            };

            image.onerror = () => resolve(null);
            image.src = src;
        });
    }

    private setupOrientationHandling() {
        this.orientationMediaQuery = window.matchMedia("(orientation: portrait)");

        this.orientationChangeHandler = () => {
            const isPortrait = this.orientationMediaQuery!.matches;
            const isMobileWidth = window.innerWidth <= 1024;

            if (isPortrait || isMobileWidth) {
                if (!this.state.isSingle) this.setSingleMode(true);
            } else {
                if (this.ui?.toggleSingle && !this.ui.toggleSingle.checked && this.state.isSingle) {
                    this.setSingleMode(false);
                }
            }
        };

        this.orientationChangeHandler();
        this.orientationMediaQuery.addEventListener('change', this.orientationChangeHandler);
        window.addEventListener('resize', this.orientationChangeHandler, { signal: this.getEventSignal() });
    }

    private teardownRuntimeBindings() {
        this.domEventController?.abort();
        this.domEventController = null;

        if (this.orientationMediaQuery && this.orientationChangeHandler) {
            this.orientationMediaQuery.removeEventListener('change', this.orientationChangeHandler);
        }

        this.orientationMediaQuery = null;
        this.orientationChangeHandler = null;
    }

    private getEventSignal() {
        if (!this.domEventController) {
            this.domEventController = new AbortController();
        }

        return this.domEventController.signal;
    }

    private updateBookAspectRatio() {
        if (!this.pageViewport || !this.ui.bookWrapper || !this.ui.bookSizer) return;

        // Use clientWidth/clientHeight to avoid padding inside the wrapper
        // If wrapper has padding, the box is smaller than getBoundingClientRect
        const availWidth = this.ui.bookWrapper.clientWidth;
        const availHeight = this.ui.bookWrapper.clientHeight;
        
        if (availWidth === 0 || availHeight === 0) return;

        const width = this.pageViewport.width;
        const height = this.pageViewport.height;
        const isDouble = !this.state.isSingle && this.state.orientation === 'landscape';
        const targetRatio = isDouble ? (width * 2) / height : width / height;

        let bookWidth = availHeight * targetRatio;
        let bookHeight = availHeight;

        if (bookWidth > availWidth) {
            bookWidth = availWidth;
            bookHeight = availWidth / targetRatio;
        }

        // Apply exact pixel sizes.
        // Ensure the width is ALWAYS an EVEN number to prevent 1px sub-pixel rendering 
        // gaps at the spine when the browser splits the container width in half.
        let finalWidth = Math.ceil(bookWidth);
        if (finalWidth % 2 !== 0) finalWidth += 1;
        
        this.ui.bookSizer.style.width = `${finalWidth}px`;
        this.ui.bookSizer.style.height = `${Math.floor(bookHeight)}px`;
        
        // Remove aspect ratio if it was set before, to prevent conflict
        this.ui.bookSizer.style.aspectRatio = '';
    }

    private playSound() {
        if (!this.options.soundEnabled) return;
        
        try {
            const audioSrc = this.options.soundUrl || 'data:audio/mp3;base64,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AAAAASwAAAAAAAAlgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+9YAYAAAAABLAAAAAAAACWAAAAAAAAEsAAAAAAAAJYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vWAGAAAAAASwAAAAAAAAlgAAAAAAABLAAAAAAAACWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/71gBgAAAAAEsAAAAAAAAJYAAAAAAAASwAAAAAAAAlgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+9YAYAAAAABLAAAAAAAACWAAAAAAAAEsAAAAAAAAJYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vWAGAAAAAASwAAAAAAAAlgAAAAAAABLAAAAAAAACWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/71gBgAAAAAEsAAAAAAAAJYAAAAAAAASwAAAAAAAAlgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+9YAYAAAAABLAAAAAAAACWAAAAAAAAEsAAAAAAAAJYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//vWAGAAAAAASwAAAAAAAAlgAAAAAAABLAAAAAAAACWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/71gBgAAAAAEsAAAAAAAAJYAAAAAAAASwAAAAAAAAlgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+9YAYAAAAABLAAAAAAAACWAAAAAAAAEsAAAAAAAAJYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAA';
            
            const audio = new Audio(audioSrc);
            audio.volume = 0.4;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(_error => {});
            }
        } catch (e) {}
    }

    private applyThemeConfiguration() {
        if (!this.container) return;
        applyContainerThemeConfiguration(this.container, {
            theme: this.options.theme,
            primaryColor: this.options.primaryColor,
            cssVariables: this.options.cssVariables
        });

        if (this.options.primaryColor) {
            this.container.style.setProperty('--flipbook-accent', this.options.primaryColor);
        }

        if (this.options.backgroundColor) {
            this.container.style.setProperty('--flipbook-bg-main', this.options.backgroundColor);
        }

        if (this.options.backgroundImage && this.ui) {
            this.ui.area.style.backgroundImage = `url('${this.options.backgroundImage}')`;
            this.ui.area.style.backgroundSize = 'cover';
            this.ui.area.style.backgroundPosition = 'center';
            this.container.style.setProperty('--flipbook-bg-panel', 'rgba(0,0,0,0.7)');
        }
    }

    private renderPagesIntoDOM() {
        const bookContainer = this.ui.book;
        const thumbsContainer = this.ui.thumbs;

        this.pages.forEach((page, index) => {
            const img = this.createPageImage(page, 'low');
            const sideClass = (index % 2 === 0) ? 'bz-page--right' : 'bz-page--left';
            const isCoverPage = index === 0 || index === this.pages.length - 1;
            const coverClass = isCoverPage ? 'bz-page--cover' : '';
            const shadow = el('div', { class: 'page-shadow' });
            const pageDiv = el('div', { class: `bz-page ${sideClass} ${coverClass}`, dataset: { idx: index.toString() } }, [img, shadow]);
            bookContainer.appendChild(pageDiv);

            const tImg = this.createThumbnailImage(page);
            const tSpan = el('span', null, [page.pageNumber.toString()]);
            const thumbDiv = el('div', { class: `thumb-item ${index === 0 ? 'active' : ''}`, dataset: { pageIndex: index.toString() } }, [tImg, tSpan]);
            thumbsContainer.appendChild(thumbDiv);
        });
    }

    private initPageFlip() {
        const width = this.pageViewport.width;
        const height = this.pageViewport.height;

        this.pageFlip = new PageFlip(this.ui.book, {
            width,
            height,
            size: "stretch" as any,
            minWidth: 100,
            maxWidth: 3000,
            minHeight: 100,
            maxHeight: 3000,
            drawShadow: true,
            showCover: true,
            usePortrait: true,
            mobileScrollSupport: false,
            maxShadowOpacity: 0.5
        });

        this.updateBookAspectRatio();

        const pages = this.ui.book.querySelectorAll('.bz-page');
        this.pageFlip.loadFromHTML(Array.from(pages));

        this.pageFlip.on('changeOrientation', (e: any) => {
            this.state.orientation = e.data;
            this.syncUI();
            this.updateBookAspectRatio();
            this.emit('orientationChange', { orientation: this.state.orientation as 'landscape' | 'portrait' });
        });

        this.pageFlip.on('changeState', (e: any) => {
            this.flipState = e.data;
            this.syncUI();
        });

        this.pageFlip.on('flip', (e: any) => {
            if (this.state.isSingle) return;

            const hasEmptyCover = this.ui.book.querySelector('.empty-cover') !== null;

            if (hasEmptyCover) {
                this.state.currentPage = e.data - 1;
            } else {
                this.state.currentPage = e.data;
            }

            if (this.state.currentPage < 0) this.state.currentPage = 0;

            this.syncUI();
            this.playSound();
            this.emitPageChange();
        });
    }

    private createPageImage(page: NormalizedFlipbookPage, resolution: 'low' | 'normal') {
        const img = el('img', { 
            class: this.getPageImageClassName(page.cropMode),
            dataset: { cropMode: page.cropMode }
        }) as HTMLImageElement;
        this.ensurePageSrc(page, resolution, img);
        return img;
    }

    private createThumbnailImage(page: NormalizedFlipbookPage) {
        const img = el('img', {
            class: this.getThumbnailImageClassName(page.cropMode),
            dataset: { cropMode: page.cropMode }
        }) as HTMLImageElement;
        this.ensurePageSrc(page, 'thumb', img);
        return img;
    }

    private async ensurePageSrc(page: NormalizedFlipbookPage, resolution: 'low' | 'normal' | 'thumb', img: HTMLImageElement) {
        const url = resolution === 'thumb' ? (page.thumb || page.low) : (resolution === 'normal' ? page.normal : page.low);
        if (url) {
            img.src = url;
            return;
        }

        if (!this.pdfDoc) return;
        const pageNum = page.pageNumber;
        const cacheKey = `${pageNum}-${resolution}`;

        if (this.pdfPagesCache?.has(cacheKey)) {
            img.src = this.pdfPagesCache.get(cacheKey)!;
            return;
        }

        img.src = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="141" viewBox="0 0 100 141"><rect width="100" height="141" fill="%231e293b"/><text x="50" y="75" fill="%2364748b" font-family="sans-serif" font-size="10" text-anchor="middle">Loading...</text></svg>';

        try {
            const pdfPage = await this.pdfDoc.getPage(pageNum);
            let scale = 1.0;
            if (resolution === 'thumb') {
                scale = 0.25;
            } else if (resolution === 'low') {
                scale = 1.2;
            } else {
                scale = 2.5;
            }

            const viewport = pdfPage.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                await pdfPage.render({ canvasContext: ctx, viewport }).promise;
                canvas.toBlob((blob) => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        if (!this.pdfPagesCache) this.pdfPagesCache = new Map();
                        this.pdfPagesCache.set(cacheKey, blobUrl);
                        img.src = blobUrl;
                    }
                    canvas.width = 0;
                    canvas.height = 0;
                }, 'image/webp', 0.85);
            }
        } catch (e) {
            console.error(`Error rendering PDF page ${pageNum}:`, e);
        }
    }

    private getPageImageClassName(cropMode: FlipbookCropMode) {
        if (cropMode === 'full') return 'page-content';
        return `page-content page-content--split page-content--${cropMode}`;
    }

    private getThumbnailImageClassName(cropMode: FlipbookCropMode) {
        if (cropMode === 'full') return 'thumb-img';
        return `thumb-img thumb-img--split thumb-img--${cropMode}`;
    }

    public setSingleMode(isSingle: boolean) {
        this.state.isSingle = isSingle;
        const bookEl = this.ui.book;
        const singleView = this.ui.singleView;
        const chk = this.ui.toggleSingle;
        if (chk) chk.checked = isSingle;

        if (isSingle) {
            if (this.pageFlip) {
                const hasEmptyCover = this.ui.book.querySelector('.empty-cover') !== null;
                let currentIdx = this.pageFlip.getCurrentPageIndex();
                this.state.currentPage = hasEmptyCover ? (currentIdx > 0 ? currentIdx - 1 : 0) : currentIdx;
            }
            bookEl.style.display = 'none';
            singleView.style.display = 'flex';
            this.updateSingleView('left');
            this.playSound();
        } else {
            singleView.style.display = 'none';
            bookEl.style.display = 'block';
            if (this.pageFlip) {
                const hasEmptyCover = this.ui.book.querySelector('.empty-cover') !== null;
                this.pageFlip.turnToPage(hasEmptyCover ? this.state.currentPage + 1 : this.state.currentPage);
            }
            this.syncUI();
        }

        this.updateBookAspectRatio();
        this.emit('singlePageModeChange', { isSingle });
        this.emitPageChange();
    }

    private updateSingleView(direction: 'left' | 'right' = 'right') {
        const img = this.ui.singleImg;
        const idx = this.state.currentPage;
        const page = this.pages[idx];
        if (!page) return;

        img.className = direction === 'right' ? 'slide-left' : 'slide-right';

        setTimeout(() => {
            img.src = '';
            this.ensurePageSrc(page, this.zoomState.isActive ? 'normal' : 'low', img);
            const nextClass = direction === 'right' ? 'slide-right' : 'slide-left';
            img.className = `${this.getPageImageClassName(page.cropMode)} ${nextClass}`;

            setTimeout(() => {
                img.className = this.getPageImageClassName(page.cropMode);
                this.syncUI();
                this.emitPageChange();
            }, 50);
        }, 250);
    }

    private syncUI() {
        const idx = this.state.currentPage;
        const currentPage = this.pages[idx];
        let infoText = currentPage ? `${currentPage.pageNumber} / ${this.totalPages}` : `1 / ${this.totalPages}`;

        const isActuallyDouble = !this.state.isSingle && this.state.orientation === 'landscape';
        const isFrontCover = isActuallyDouble && idx === 0;
        const isBackCover = isActuallyDouble && idx === this.totalPages - 1;
        
        this.ui.wrapper.classList.toggle('double-mode', isActuallyDouble);

        if (this.ui.bookWrapper) {
            if (isFrontCover) {
                this.ui.bookWrapper.classList.add('bk-is-cover');
            } else {
                this.ui.bookWrapper.classList.remove('bk-is-cover');
            }

            if (isBackCover) {
                this.ui.bookWrapper.classList.add('bk-is-back-cover');
            } else {
                this.ui.bookWrapper.classList.remove('bk-is-back-cover');
            }
        }

        if (isActuallyDouble && !(isFrontCover || isBackCover)) {
            const leftPage = this.pages[idx % 2 === 0 ? idx - 1 : idx];
            const rightPage = this.pages[idx % 2 === 0 ? idx : idx + 1];
            if (idx % 2 === 1 && idx + 1 < this.totalPages) {
                infoText = `${leftPage.pageNumber}-${rightPage.pageNumber} / ${this.totalPages}`;
            } else if (idx % 2 === 0) {
                infoText = `${leftPage.pageNumber}-${rightPage.pageNumber} / ${this.totalPages}`;
            }
        } else if (isActuallyDouble && idx === this.totalPages - 1 && this.totalPages % 2 === 0) {
            infoText = `${currentPage.pageNumber} / ${this.totalPages}`;
        }

        this.ui.pageInfo.textContent = infoText;

        const allThumbs = this.ui.thumbs.querySelectorAll('.thumb-item');
        allThumbs.forEach(el => el.classList.remove('active'));

        let thumbsToActivate = [idx];

        if (isActuallyDouble && idx > 0) {
            if (idx % 2 === 1 && idx + 1 < this.totalPages) {
                thumbsToActivate.push(idx + 1);
            }
            else if (idx % 2 === 0) {
                if (!thumbsToActivate.includes(idx - 1)) {
                    thumbsToActivate.push(idx - 1);
                }
            }
        }

        thumbsToActivate.forEach(i => {
            const thumb = this.ui.thumbs.querySelector(`.thumb-item[data-page-index="${i}"]`) as HTMLElement;
            if (thumb) {
                thumb.classList.add('active');
                if (i === idx) {
                    const containerCenter = this.ui.thumbs.offsetWidth / 2;
                    const thumbCenter = thumb.offsetLeft + (thumb.offsetWidth / 2);
                    this.ui.thumbs.scrollTo({
                        left: thumbCenter - containerCenter,
                        behavior: 'smooth'
                    });
                }
            }
        });
    }

    private goNext() {
        if (this.state.isSingle) {
            if (this.state.currentPage < this.totalPages - 1) {
                this.state.currentPage++;
                this.updateSingleView('right');
                this.playSound();
            }
        } else {
            if (!this.pageFlip) return;

            if (this.state.orientation === 'portrait') {
                let currentIdx = this.pageFlip.getCurrentPageIndex();
                let nextIdx = currentIdx + 1;

                if (nextIdx < this.pageFlip.getPageCount()) {
                    this.pageFlip.flip(nextIdx);
                }
            } else {
                this.pageFlip.flipNext();
            }
        }
    }

    private goPrev() {
        if (this.state.isSingle) {
            if (this.state.currentPage > 0) {
                this.state.currentPage--;
                this.updateSingleView('left');
                this.playSound();
            }
        } else {
            if (!this.pageFlip) return;

            if (this.state.orientation === 'portrait') {
                let currentIdx = this.pageFlip.getCurrentPageIndex();
                let prevIdx = currentIdx - 1;

                if (prevIdx >= 0) {
                    this.pageFlip.flip(prevIdx);
                }
            } else {
                this.pageFlip.flipPrev();
            }
        }
    }

    private loadHighResForVisiblePages() {
        if (this.state.isSingle) {
            const img = this.ui.singleImg;
            const page = this.pages[this.state.currentPage];
            if (page) {
                this.ensurePageSrc(page, 'normal', img);
            }
            return;
        }

        if (!this.pageFlip) return;
        const currentIdx = this.pageFlip.getCurrentPageIndex();
        const pagesToLoad = [currentIdx - 1, currentIdx, currentIdx + 1, currentIdx + 2];

        pagesToLoad.forEach(idx => {
            if (idx >= 0 && idx < this.totalPages) {
                const pageDiv = this.ui.book.querySelector(`.bz-page[data-idx="${idx}"]`) as HTMLElement;
                if (pageDiv) {
                    const img = pageDiv.querySelector('img') as HTMLImageElement;
                    if (img && img.dataset.loadedHigh !== "true") {
                        this.ensurePageSrc(this.pages[idx], 'normal', img);
                        img.dataset.loadedHigh = "true";
                    }
                }
            }
        });
    }

    private bindEvents() {
        const signal = this.getEventSignal();
        
        const bindNavButton = (btn: HTMLElement, action: () => void) => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    action();
                }, { signal });
            }
        };

        if (this.ui.btnSound) {
            if (!this.options.soundEnabled) this.ui.btnSound.classList.add('muted');
            this.ui.btnSound.addEventListener('click', (e) => {
                e.preventDefault();
                this.options.soundEnabled = !this.options.soundEnabled;
                this.ui.btnSound.classList.toggle('muted', !this.options.soundEnabled);
                if (this.options.soundEnabled) this.playSound();
            }, { signal });
        }

        document.addEventListener('keydown', (e) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowRight') {
                this.goNext();
            } else if (e.key === 'ArrowLeft') {
                this.goPrev();
            }
        }, { signal });

        bindNavButton(this.ui.bkNext, () => this.goNext());
        bindNavButton(this.ui.navNext, () => this.goNext());
        bindNavButton(this.ui.bkPrev, () => this.goPrev());
        bindNavButton(this.ui.navPrev, () => this.goPrev());

        this.ui.thumbs.querySelectorAll('.thumb-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                let targetIdx = parseInt((e.currentTarget as HTMLElement).dataset.pageIndex!);

                if (this.state.isSingle) {
                    this.state.currentPage = targetIdx;
                    this.updateSingleView();
                } else {
                    if (this.pageFlip) {
                        const hasEmptyCover = this.ui.book.querySelector('.empty-cover') !== null;

                        let destPage = hasEmptyCover ? targetIdx + 1 : targetIdx;

                        if (this.state.orientation === 'landscape' && hasEmptyCover) {
                            if (destPage % 2 !== 0 && destPage > 1) {
                                destPage = destPage - 1;
                            }
                        }

                        this.pageFlip.flip(destPage);
                    }
                }
            }, { signal });
        });

        const toggleThumbs = () => {
            this.state.showThumbs = !this.state.showThumbs;
            const tBar = this.ui.thumbs;
            const btn = this.ui.btnToggleThumbs;
            const chk = this.ui.toggleThumbs;

            tBar.style.display = this.state.showThumbs ? 'flex' : 'none';
            const activeThumb = tBar.querySelector('.thumb-item.active') as HTMLElement;
            if (activeThumb) {
                const containerCenter = tBar.offsetWidth / 2;
                const thumbCenter = activeThumb.offsetLeft + (activeThumb.offsetWidth / 2);
                tBar.scrollTo({
                    left: thumbCenter - containerCenter,
                    behavior: 'smooth'
                });
            }
            if (this.state.showThumbs) btn.classList.add('active'); else btn.classList.remove('active');
            if (chk) chk.checked = this.state.showThumbs;
            if (!this.state.isSingle && this.pageFlip) this.pageFlip.update();
            this.emit('thumbsToggle', { showThumbs: this.state.showThumbs });
        };
        
        this.ui.btnToggleThumbs?.addEventListener('click', toggleThumbs, { signal });
        this.ui.toggleThumbs?.addEventListener('change', toggleThumbs, { signal });

        this.ui.toggleSingle?.addEventListener('change', (e) => {
            this.setSingleMode((e.target as HTMLInputElement).checked);
        }, { signal });

        this.ui.btnSettings?.addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = this.ui.settingsPanel;
            panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        }, { signal });

        const bookWrapper = this.ui.bookWrapper;

        this.ui.zoomIn?.addEventListener('click', () => {
            if (this.currentZoom < 5) {
                this.currentZoom += 0.5;
                this.zoomState.isActive = true;
                bookWrapper.classList.add('zoomed');
                this.updateTransform();
                this.loadHighResForVisiblePages();
                this.emitZoomChange();
            }
        }, { signal });
        
        this.ui.zoomOut?.addEventListener('click', () => {
            if (this.currentZoom > 0.5) {
                this.currentZoom -= 0.5;
                this.updateTransform();
                if (this.currentZoom <= 1) {
                    this.currentZoom = 1;
                    this.zoomState.isActive = false;
                    this.zoomState.translateX = 0;
                    this.zoomState.translateY = 0;
                    bookWrapper.classList.remove('zoomed');
                    this.updateTransform();
                }
                this.emitZoomChange();
            }
        }, { signal });

        const area = this.ui.area;

        area.addEventListener('dblclick', (e) => {
            if (this.currentZoom > 1) {
                this.currentZoom = 1;
                this.zoomState.isActive = false;
                this.zoomState.translateX = 0;
                this.zoomState.translateY = 0;
                bookWrapper.classList.remove('zoomed');
            } else {
                this.currentZoom = 2.5;
                this.zoomState.isActive = true;
                bookWrapper.classList.add('zoomed');
                this.loadHighResForVisiblePages();
            }
            this.updateTransform();
            this.emitZoomChange();
        }, { signal });

        let lastScrollTime = 0;
        area.addEventListener('wheel', (e) => {
            if (this.zoomState.isActive) return;
            const now = Date.now();
            if (now - lastScrollTime < 500) return;

            if (e.deltaY > 0) {
                this.goNext();
                lastScrollTime = now;
            } else if (e.deltaY < 0) {
                this.goPrev();
                lastScrollTime = now;
            }
        }, { signal });

        area.addEventListener('mousedown', (e) => this.handleDragStart(e.clientX, e.clientY), { signal });
        window.addEventListener('mousemove', (e) => this.handleDragMove(e.clientX, e.clientY), { signal });
        window.addEventListener('mouseup', () => this.handleDragEnd(), { signal });

        area.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.touchStartX = e.touches[0].clientX;
                this.handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false, signal });

        window.addEventListener('touchmove', (e) => {
            if (this.zoomState.isActive && e.touches.length === 1) {
                e.preventDefault();
                this.handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false, signal });

        window.addEventListener('touchend', (e) => {
            if (!this.zoomState.isActive && this.state.isSingle && e.changedTouches.length === 1) {
                const diffX = e.changedTouches[0].clientX - this.touchStartX;
                if (diffX < -50) this.goNext();
                else if (diffX > 50) this.goPrev();
            }
            this.handleDragEnd();
        }, { signal });

        this.ui.fullscreen?.addEventListener('click', () => {
            const root = this.ui.wrapper;
            if (!document.fullscreenElement && root) {
                root.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }, { signal });

        if (this.ui.downloadBtn && this.downloadUrl) {
            this.ui.downloadBtn.addEventListener('click', () => {
                this.options.onDownload?.(this.downloadUrl);
                window.open(this.downloadUrl, '_blank');
            }, { signal });
        }
    }

    private handleDragStart(x: number, y: number) {
        if (!this.zoomState.isActive) return;
        this.zoomState.isDragging = true;
        this.zoomState.startX = x - this.zoomState.translateX;
        this.zoomState.startY = y - this.zoomState.translateY;
    }

    private handleDragMove(x: number, y: number) {
        if (!this.zoomState.isActive || !this.zoomState.isDragging) return;
        this.zoomState.translateX = x - this.zoomState.startX;
        this.zoomState.translateY = y - this.zoomState.startY;
        this.updateTransform();
    }

    private handleDragEnd() {
        this.zoomState.isDragging = false;
    }

    private updateTransform() {
        this.ui.bookWrapper.style.transform = `translate(${this.zoomState.translateX}px, ${this.zoomState.translateY}px) scale(${this.currentZoom})`;
    }

    private emit<T extends FlipbookEngineEventName>(eventName: T, payload: FlipbookEngineEventMap[T]) {
        this.listeners[eventName]?.forEach((listener) => {
            (listener as FlipbookEventHandler<T>)(payload);
        });
    }

    private emitPageChange() {
        const currentPage = this.pages[this.state.currentPage];
        this.emit('pageChange', {
            currentPage: this.state.currentPage,
            pageNumber: currentPage?.pageNumber ?? this.state.currentPage + 1,
            totalPages: this.totalPages,
            isSingle: this.state.isSingle
        });
    }

    private emitZoomChange() {
        this.emit('zoomChange', {
            zoom: this.currentZoom,
            isActive: this.zoomState.isActive
        });
    }
}

const globalScope = globalThis as any;
const flipbookNamespace = globalScope.FlipbookEngine || {};
flipbookNamespace.FlipbookEngine = FlipbookEngine;
globalScope.FlipbookEngine = flipbookNamespace;
