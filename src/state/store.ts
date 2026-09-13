/**
 * @license FlipbookEngine v0.2.4
 * Copyright (c) 2026 Murat Dogan
 *
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 */
import { signal, computed, type Signal, type ReadonlySignal } from '@preact/signals-core';
import type { FlipbookThemeMode } from '../theme/theme';
import type { NormalizedFlipbookPage } from '../model/pages';
import type { FlipbookEngineOptions } from '../engine';
import type { PartialFlipbookMessages } from '../i18n/service';

export type FlipState = 'read' | 'fold_corner' | 'flipping';
export type Orientation = 'landscape' | 'portrait';
export interface ZoomState { isActive: boolean; translateX: number; translateY: number; isDragging: boolean; scale: number; }

export interface FlipbookStore {
    currentPage: Signal<number>; totalPages: Signal<number>; isSingleMode: Signal<boolean>;
    showThumbs: Signal<boolean>; showArrows: Signal<boolean>; orientation: Signal<Orientation>;
    flipState: Signal<FlipState>; themeMode: Signal<FlipbookThemeMode>; allowDownload: Signal<boolean>;
    hasDownloadUrl: Signal<boolean>; primaryColor: Signal<string>; whiteLabel: Signal<boolean>;
    isZoomed: Signal<boolean>; isAutoPlaying: Signal<boolean>; autoPlayInterval: Signal<number>;
    soundEnabled: Signal<boolean>; locale: Signal<string>; messages: Signal<Partial<Record<string, PartialFlipbookMessages>>>; zoomState: Signal<ZoomState>; pages: Signal<NormalizedFlipbookPage[]>;
    isDoublePageLayout: ReadonlySignal<boolean>; isFrontCover: ReadonlySignal<boolean>; isBackCover: ReadonlySignal<boolean>;
    init(options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean): void;
}

const initialZoomState = (): ZoomState => ({ isActive: false, translateX: 0, translateY: 0, isDragging: false, scale: 1 });

/** Creates an isolated reactive state container for one FlipbookEngine instance. */
export function createFlipbookStore(): FlipbookStore {
    const currentPage = signal(0), totalPages = signal(0), isSingleMode = signal(false);
    const showThumbs = signal(true), showArrows = signal(true), orientation = signal<Orientation>('landscape');
    const flipState = signal<FlipState>('read'), themeMode = signal<FlipbookThemeMode>('auto');
    const allowDownload = signal(true), hasDownloadUrl = signal(false), primaryColor = signal('#7367f0');
    const whiteLabel = signal(false), isZoomed = signal(false), isAutoPlaying = signal(false);
    const autoPlayInterval = signal(3000), soundEnabled = signal(true);
    const locale = signal('en');
    const messages = signal<Partial<Record<string, PartialFlipbookMessages>>>({});
    const zoomState = signal<ZoomState>(initialZoomState()), pages = signal<NormalizedFlipbookPage[]>([]);
    const isDoublePageLayout = computed(() => !isSingleMode.value && orientation.value === 'landscape');
    const isFrontCover = computed(() => isDoublePageLayout.value && currentPage.value === 0);
    const isBackCover = computed(() => isDoublePageLayout.value && currentPage.value >= totalPages.value - 1);
    const init = (options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean) => {
        totalPages.value = total; pages.value = mappedPages; hasDownloadUrl.value = hasPdfUrl;
        if (options.theme !== undefined) themeMode.value = options.theme;
        if (options.primaryColor !== undefined) primaryColor.value = options.primaryColor;
        if (options.showThumbs !== undefined) showThumbs.value = options.showThumbs;
        if (options.showArrows !== undefined) showArrows.value = options.showArrows;
        if (options.allowDownload !== undefined) allowDownload.value = options.allowDownload;
        if (options.whiteLabel !== undefined) whiteLabel.value = options.whiteLabel;
        if (options.soundEnabled !== undefined) soundEnabled.value = options.soundEnabled;
        if (options.locale !== undefined) locale.value = options.locale;
        if (options.messages !== undefined) messages.value = options.messages;
        if (options.isSingleMode !== undefined) isSingleMode.value = options.isSingleMode;
        if (options.singleMode !== undefined) isSingleMode.value = options.singleMode;
        if (options.autoPlay !== undefined) isAutoPlaying.value = options.autoPlay;
        if (options.autoPlayInterval !== undefined) autoPlayInterval.value = options.autoPlayInterval;
        currentPage.value = 0;
    };
    return { currentPage, totalPages, isSingleMode, showThumbs, showArrows, orientation, flipState, themeMode, allowDownload, hasDownloadUrl, primaryColor, whiteLabel, isZoomed, isAutoPlaying, autoPlayInterval, soundEnabled, locale, messages, zoomState, pages, isDoublePageLayout, isFrontCover, isBackCover, init };
}

// Compatibility exports for consumers of the former internal singleton module.
const legacyStore = createFlipbookStore();
export const currentPage = legacyStore.currentPage, totalPages = legacyStore.totalPages, isSingleMode = legacyStore.isSingleMode;
export const showThumbs = legacyStore.showThumbs, showArrows = legacyStore.showArrows, orientation = legacyStore.orientation;
export const flipState = legacyStore.flipState, themeMode = legacyStore.themeMode, allowDownload = legacyStore.allowDownload;
export const hasDownloadUrl = legacyStore.hasDownloadUrl, primaryColor = legacyStore.primaryColor, whiteLabel = legacyStore.whiteLabel;
export const isZoomed = legacyStore.isZoomed, isAutoPlaying = legacyStore.isAutoPlaying, autoPlayInterval = legacyStore.autoPlayInterval;
export const soundEnabled = legacyStore.soundEnabled, locale = legacyStore.locale, messages = legacyStore.messages, zoomState = legacyStore.zoomState, pages = legacyStore.pages;
export const isDoublePageLayout = legacyStore.isDoublePageLayout, isFrontCover = legacyStore.isFrontCover, isBackCover = legacyStore.isBackCover;
export function initStore(options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean) { legacyStore.init(options, total, mappedPages, hasPdfUrl); }


