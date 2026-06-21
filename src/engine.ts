/**
 * @license FlipbookEngine v0.2.4
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
import { App } from './components/App';
import { PageFlipAdapter } from './adapters/PageFlipAdapter';
import { LayoutManager } from './core/LayoutManager';
import { InteractionManager } from './core/InteractionManager';
import { 
    initStore, 
    currentPage, 
    isSingleMode, 
    zoomState,
    themeMode,
    primaryColor,
    showThumbs,
    allowDownload,
    whiteLabel,
    soundEnabled,
    isAutoPlaying,
    autoPlayInterval
} from './state/store';
import { isFlipbookPageAsset, normalizeFlipbookPages, type FlipbookPageAsset, type NormalizedFlipbookPage } from './model/pages';
import { applyThemeConfiguration, type FlipbookThemeMode } from './theme/theme';
import { resolveMessages, type FlipbookLocale, type PartialFlipbookMessages } from './i18n/service';
import './styles/flipbook-engine.css';

// @ts-ignore
const pdfWorkerUrl = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface FlipbookEngineOptions {
    allowDownload?: boolean;
    showThumbs?: boolean;
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
    private options: FlipbookEngineOptions;
    
    // Core Managers
    private pageFlipAdapter: PageFlipAdapter | null = null;
    private layoutManager: LayoutManager | null = null;
    private interactionManager: InteractionManager | null = null;
    
    private pdfDoc: any = null;
    private listeners: Partial<Record<FlipbookEngineEventName, Set<AnyFlipbookEventHandler>>> = {};

    constructor(private selector: string | HTMLElement, options: FlipbookEngineOptions = {}) {
        this.options = { 
            allowDownload: true, 
            showThumbs: true, 
            primaryColor: '#7367f0', 
            theme: 'auto', 
            soundUrl: 'https://flipbookengine.com/Content/page-flip.mp3',
            autoPlayInterval: 3000,
            ...options 
        };
    }

    public async init(pdfUrl: string, imageList?: Array<PageImages | FlipbookPageAsset>) {
        if (typeof this.selector === 'string') {
            this.container = document.querySelector(this.selector) as HTMLElement;
        } else {
            this.container = this.selector;
        }

        if (!this.container) return;

        this.destroy(true);

        let resolvedPages: NormalizedFlipbookPage[] = [];
        let viewport = { ...FlipbookEngine.DEFAULT_PAGE_VIEWPORT };

        if (imageList && imageList.length > 0) {
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
            try {
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                this.pdfDoc = await loadingTask.promise;
                
                for (let i = 1; i <= this.pdfDoc.numPages; i++) {
                    resolvedPages.push({
                        index: i - 1,
                        assetId: `pdf-page-${i}`,
                        pageNumber: i,
                        cropMode: 'full',
                        normal: '',
                        low: '',
                        thumb: ''
                    });
                }

                const firstPage = await this.pdfDoc.getPage(1);
                const vp = firstPage.getViewport({ scale: 1.0 });
                const aspectRatio = vp.width / vp.height;

                const baseShortSide = 420;
                viewport = aspectRatio >= 1
                    ? { width: Math.round(baseShortSide * aspectRatio), height: baseShortSide }
                    : { width: baseShortSide, height: Math.round(baseShortSide / aspectRatio) };
            } catch (e) {
                console.error("PDF load failed:", e);
                return;
            }
        }

        if (!resolvedPages.length) return;

        // 1. Initialize State
        initStore(this.options, resolvedPages.length, resolvedPages, !!pdfUrl);

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
            onDownload: () => {
                if (this.options.onDownload) this.options.onDownload(pdfUrl);
                else window.open(pdfUrl, '_blank');
            }
        });

        this.container.appendChild(appNode as unknown as Node);

        // 4. Initialize Core Managers
        this.layoutManager = new LayoutManager(viewport);
        this.layoutManager.onResizeCallback = () => {
            if (this.pageFlipAdapter) {
                this.pageFlipAdapter.update();
            }
        };
        this.layoutManager.init(bookWrapperEl!, bookSizerEl!);

        this.pageFlipAdapter = new PageFlipAdapter(bookContainerEl!, this.options);
        pageFlipAdapterRef.current = this.pageFlipAdapter;
        
        // Wait a tick for styles to apply before initializing PageFlip
        setTimeout(() => {
            this.pageFlipAdapter!.init(viewport.width, viewport.height);
            
            this.interactionManager = new InteractionManager(bookWrapperEl!, this.pageFlipAdapter!);
            this.interactionManager.init();
            interactionManagerRef.current = this.interactionManager;

            this.emit('init', { totalPages: resolvedPages.length });
        }, 10);
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
        currentPage.value = targetIdx;
    }

    public nextPage() {
        if (this.pageFlipAdapter) this.pageFlipAdapter.turnToNextPage();
    }

    public prevPage() {
        if (this.pageFlipAdapter) this.pageFlipAdapter.turnToPrevPage();
    }

    public setSingleMode(isSingle: boolean) {
        isSingleMode.value = isSingle;
    }

    public updateOptions(options: Partial<FlipbookEngineOptions>) {
        this.options = { ...this.options, ...options };
        if (options.theme !== undefined) themeMode.value = options.theme;
        if (options.primaryColor !== undefined) primaryColor.value = options.primaryColor;
        if (options.showThumbs !== undefined) showThumbs.value = options.showThumbs;
        if (options.allowDownload !== undefined) allowDownload.value = options.allowDownload;
        if (options.whiteLabel !== undefined) whiteLabel.value = options.whiteLabel;
        if (options.soundEnabled !== undefined) soundEnabled.value = options.soundEnabled;
        if (options.singleMode !== undefined) isSingleMode.value = options.singleMode;
        if (options.autoPlay !== undefined) isAutoPlaying.value = options.autoPlay;
        if (options.autoPlayInterval !== undefined) autoPlayInterval.value = options.autoPlayInterval;

        if (this.container) {
            applyThemeConfiguration(this.container, this.options);
        }
    }

    public setPages(imageList: Array<PageImages | FlipbookPageAsset>, pdfUrl?: string) {
        // Just recall init, for simplicity in this facade
        this.init(pdfUrl || '', imageList);
    }

    public destroy(clearMarkup = true) {
        if (this.pageFlipAdapter) this.pageFlipAdapter.destroy();
        if (this.layoutManager) this.layoutManager.destroy();
        if (this.interactionManager) this.interactionManager.destroy();

        this.pageFlipAdapter = null;
        this.layoutManager = null;
        this.interactionManager = null;
        this.pdfDoc = null;

        if (clearMarkup && this.container) {
            this.container.innerHTML = '';
        }

        this.emit('destroy', undefined);
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
