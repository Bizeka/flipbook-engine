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

        this.setResolvedPages(imageList);
        if (!this.pages.length) {
            this.renderEmptyState();
            return;
        }

        await this.resolvePageViewport();
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
            const isMobileWidth = window.innerWidth <= 768;

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

    private playSound() {
        if (!this.options.soundEnabled) return;
        
        try {
            const audioSrc = this.options.soundUrl || 'data:audio/mp3;base64,//NExAAAAANIAUAAAEFoAAhAAAQYQAAMCAAEcAAAoQAAA8EAAA4MAAAQAAAYEAAMAABwEAAAMCAAEcAAAMCAAA8EAAAQcAAAcEAABwEAAAQcAAAcEAAAYEAAA4MAAAMCAAEcAAAoQAAAoQAAAYEAAMCAAEcAAAoQAAAcEAAMCAAAcEAAAcEAAAQcAAAoQAAAwEAAAcEAAA=';
            
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

        const isPortrait = window.matchMedia("(orientation: portrait)").matches || window.innerWidth <= 768;

        if (!isPortrait) {
            bookContainer.appendChild(el('div', { class: 'bz-page empty-cover' }));
        }

        this.pages.forEach((page, index) => {
            const img = this.createPageImage(page, 'low');
            const pageDiv = el('div', { class: 'bz-page', dataset: { idx: index.toString() } }, [img]);
            bookContainer.appendChild(pageDiv);

            const tImg = this.createThumbnailImage(page);
            const tSpan = el('span', null, [page.pageNumber.toString()]);
            const thumbDiv = el('div', { class: `thumb-item ${index === 0 ? 'active' : ''}`, dataset: { pageIndex: index.toString() } }, [tImg, tSpan]);
            thumbsContainer.appendChild(thumbDiv);
        });

        if (!isPortrait && this.pages.length % 2 === 0) {
            bookContainer.appendChild(el('div', { class: 'bz-page empty-cover' }));
        }
    }

    private initPageFlip() {
        const width = this.pageViewport.width;
        const height = this.pageViewport.height;

        this.pageFlip = new PageFlip(this.ui.book, {
            width,
            height,
            size: "stretch" as any,
            minWidth: Math.max(240, Math.round(width * 0.75)),
            maxWidth: 3000,
            minHeight: Math.max(320, Math.round(height * 0.75)),
            maxHeight: 3000,
            maxShadowOpacity: 0.5,
            showCover: false,
            mobileScrollSupport: false
        });

        const pages = this.ui.book.querySelectorAll('.bz-page');
        this.pageFlip.loadFromHTML(Array.from(pages));

        this.pageFlip.on('changeOrientation', (e: any) => {
            this.state.orientation = e.data;
            this.syncUI();
            this.emit('orientationChange', { orientation: this.state.orientation as 'landscape' | 'portrait' });
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
        return el('img', { 
            src: resolution === 'normal' ? page.normal : page.low,
            class: this.getPageImageClassName(page.cropMode),
            dataset: { cropMode: page.cropMode }
        }) as HTMLImageElement;
    }

    private createThumbnailImage(page: NormalizedFlipbookPage) {
        return el('img', {
            src: page.thumb || page.low,
            class: this.getThumbnailImageClassName(page.cropMode),
            dataset: { cropMode: page.cropMode }
        }) as HTMLImageElement;
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
            if (this.pageFlip) { let currentIdx = this.pageFlip.getCurrentPageIndex(); this.state.currentPage = currentIdx > 0 ? currentIdx - 1 : 0; }
            bookEl.style.display = 'none';
            singleView.style.display = 'flex';
            this.updateSingleView('left');
            this.playSound();
        } else {
            singleView.style.display = 'none';
            bookEl.style.display = 'block';
            if (this.pageFlip) {
                this.pageFlip.turnToPage(this.state.currentPage + 1);
            }
            this.syncUI();
        }

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
            img.src = this.zoomState.isActive ? page.normal : page.low;
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

        if (isActuallyDouble && idx > 0) {
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
                    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
            if (page) img.src = page.normal;
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
                        img.src = this.pages[idx].normal;
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
