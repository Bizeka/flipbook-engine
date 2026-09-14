/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 *
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 */
import { signal, computed, type Signal, type ReadonlySignal } from '@preact/signals-core';
import type { FlipbookThemeMode } from '../theme/theme';
import type { NormalizedFlipbookPage } from '../model/pages';
import { normalizeFlipbookToc, type FlipbookTocEntry } from '../model/toc';
import type { FlipbookEngineOptions } from '../engine';
import type { PartialFlipbookMessages } from '../i18n/service';
import type { FlipbookSearchResult } from '../model/search';
import type { FlipbookHotspot } from '../model/hotspots';
import type { FlipbookAnnotation } from '../model/annotations';

export type FlipState = 'read' | 'fold_corner' | 'flipping';
export type Orientation = 'landscape' | 'portrait';
export interface ZoomState { isActive: boolean; translateX: number; translateY: number; isDragging: boolean; scale: number; }

export interface FlipbookStore {
    currentPage: Signal<number>; totalPages: Signal<number>; isSingleMode: Signal<boolean>;
    showThumbs: Signal<boolean>; showToc: Signal<boolean>; showNotes: Signal<boolean>; showSearch: Signal<boolean>; showArrows: Signal<boolean>; orientation: Signal<Orientation>;
    flipState: Signal<FlipState>; themeMode: Signal<FlipbookThemeMode>; allowDownload: Signal<boolean>; bookmarkedPages: Signal<ReadonlySet<number>>; pageNotes: Signal<ReadonlyMap<number, string>>;
    hasDownloadUrl: Signal<boolean>; isPdfMode: Signal<boolean>; primaryColor: Signal<string>; whiteLabel: Signal<boolean>;
    isZoomed: Signal<boolean>; isAutoPlaying: Signal<boolean>; autoPlayInterval: Signal<number>;
    soundEnabled: Signal<boolean>; searchQuery: Signal<string>; searchResults: Signal<FlipbookSearchResult[]>; hotspots: Signal<FlipbookHotspot[]>; activeHotspotId: Signal<string | null>; annotations: Signal<FlipbookAnnotation[]>; activeAnnotationId: Signal<string | null>; locale: Signal<string>; messages: Signal<Partial<Record<string, PartialFlipbookMessages>>>; zoomState: Signal<ZoomState>; pages: Signal<NormalizedFlipbookPage[]>; toc: Signal<FlipbookTocEntry[]>;
    isDoublePageLayout: ReadonlySignal<boolean>; isFrontCover: ReadonlySignal<boolean>; isBackCover: ReadonlySignal<boolean>;
    init(options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean, isPdfMode?: boolean): void;
    reset(): void;
}

const initialZoomState = (): ZoomState => ({ isActive: false, translateX: 0, translateY: 0, isDragging: false, scale: 1 });

/** Creates an isolated reactive state container for one FlipbookEngine instance. */
export function createFlipbookStore(): FlipbookStore {
    const currentPage = signal(0), totalPages = signal(0), isSingleMode = signal(false);
    const showThumbs = signal(false), showToc = signal(false), showNotes = signal(false), showSearch = signal(false), showArrows = signal(true), orientation = signal<Orientation>('landscape');
    const flipState = signal<FlipState>('read'), themeMode = signal<FlipbookThemeMode>('auto');
    const allowDownload = signal(true), hasDownloadUrl = signal(false), isPdfMode = signal(false), primaryColor = signal('#7367f0');
    const whiteLabel = signal(false), isZoomed = signal(false), isAutoPlaying = signal(false);
    const bookmarkedPages = signal<ReadonlySet<number>>(new Set());
    const pageNotes = signal<ReadonlyMap<number, string>>(new Map());
    const autoPlayInterval = signal(3000), soundEnabled = signal(true);
    const searchQuery = signal(''), searchResults = signal<FlipbookSearchResult[]>([]);
    const hotspots = signal<FlipbookHotspot[]>([]), activeHotspotId = signal<string | null>(null);
    const annotations = signal<FlipbookAnnotation[]>([]), activeAnnotationId = signal<string | null>(null);
    const locale = signal('en');
    const messages = signal<Partial<Record<string, PartialFlipbookMessages>>>({});
    const zoomState = signal<ZoomState>(initialZoomState()), pages = signal<NormalizedFlipbookPage[]>([]), toc = signal<FlipbookTocEntry[]>([]);
    const isDoublePageLayout = computed(() => !isSingleMode.value && orientation.value === 'landscape');
    const isFrontCover = computed(() => isDoublePageLayout.value && currentPage.value === 0);
    const isBackCover = computed(() => isDoublePageLayout.value && currentPage.value >= totalPages.value - 1);
    const init = (options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean, pdfMode = hasPdfUrl) => {
        totalPages.value = total; pages.value = mappedPages; hasDownloadUrl.value = hasPdfUrl; isPdfMode.value = pdfMode;
        if (options.theme !== undefined) themeMode.value = options.theme;
        if (options.primaryColor !== undefined) primaryColor.value = options.primaryColor;
        if (options.showThumbs !== undefined) showThumbs.value = options.showThumbs;
        if (options.showToc !== undefined) showToc.value = options.showToc;
        showNotes.value = false;
        showSearch.value = false;
        searchQuery.value = '';
        searchResults.value = [];
        hotspots.value = options.hotspots ?? [];
        activeHotspotId.value = null;
        annotations.value = options.annotations ?? [];
        activeAnnotationId.value = null;
        toc.value = normalizeFlipbookToc(options.toc ?? [], total);
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
        bookmarkedPages.value = new Set((options.bookmarks ?? []).map((page) => Math.trunc(page)).filter((page) => Number.isInteger(page) && page >= 0 && page < total));
        pageNotes.value = new Map(Object.entries(options.notes ?? {}).map(([page, note]) => [Math.trunc(Number(page)), String(note).trim()] as const).filter(([page, note]) => Number.isInteger(page) && page >= 0 && page < total && note.length > 0));
        currentPage.value = 0;
    };
    const reset = () => {
        currentPage.value = 0;
        totalPages.value = 0;
        isSingleMode.value = false;
        showThumbs.value = false;
        showToc.value = false;
        showNotes.value = false;
        showSearch.value = false;
        showArrows.value = true;
        orientation.value = 'landscape';
        flipState.value = 'read';
        themeMode.value = 'auto';
        allowDownload.value = true;
        hasDownloadUrl.value = false;
        isPdfMode.value = false;
        primaryColor.value = '#7367f0';
        whiteLabel.value = false;
        isZoomed.value = false;
        isAutoPlaying.value = false;
        autoPlayInterval.value = 3000;
        soundEnabled.value = true;
        locale.value = 'en';
        messages.value = {};
        zoomState.value = initialZoomState();
        pages.value = [];
        toc.value = [];
        bookmarkedPages.value = new Set();
        pageNotes.value = new Map();
        searchQuery.value = '';
        searchResults.value = [];
        hotspots.value = [];
        activeHotspotId.value = null;
        annotations.value = [];
        activeAnnotationId.value = null;
    };
    return { currentPage, totalPages, isSingleMode, showThumbs, showToc, showNotes, showSearch, showArrows, orientation, flipState, themeMode, allowDownload, bookmarkedPages, pageNotes, hasDownloadUrl, isPdfMode, primaryColor, whiteLabel, isZoomed, isAutoPlaying, autoPlayInterval, soundEnabled, searchQuery, searchResults, hotspots, activeHotspotId, annotations, activeAnnotationId, locale, messages, zoomState, pages, toc, isDoublePageLayout, isFrontCover, isBackCover, init, reset };
}

// Compatibility exports for consumers of the former internal singleton module.
const legacyStore = createFlipbookStore();
export const currentPage = legacyStore.currentPage, totalPages = legacyStore.totalPages, isSingleMode = legacyStore.isSingleMode;
export const showThumbs = legacyStore.showThumbs, showToc = legacyStore.showToc, showNotes = legacyStore.showNotes, showSearch = legacyStore.showSearch, showArrows = legacyStore.showArrows, orientation = legacyStore.orientation;
export const flipState = legacyStore.flipState, themeMode = legacyStore.themeMode, allowDownload = legacyStore.allowDownload, bookmarkedPages = legacyStore.bookmarkedPages, pageNotes = legacyStore.pageNotes;
export const hasDownloadUrl = legacyStore.hasDownloadUrl, isPdfMode = legacyStore.isPdfMode, primaryColor = legacyStore.primaryColor, whiteLabel = legacyStore.whiteLabel;
export const isZoomed = legacyStore.isZoomed, isAutoPlaying = legacyStore.isAutoPlaying, autoPlayInterval = legacyStore.autoPlayInterval;
export const soundEnabled = legacyStore.soundEnabled, searchQuery = legacyStore.searchQuery, searchResults = legacyStore.searchResults, hotspots = legacyStore.hotspots, activeHotspotId = legacyStore.activeHotspotId, annotations = legacyStore.annotations, activeAnnotationId = legacyStore.activeAnnotationId, locale = legacyStore.locale, messages = legacyStore.messages, zoomState = legacyStore.zoomState, pages = legacyStore.pages, toc = legacyStore.toc;
export const isDoublePageLayout = legacyStore.isDoublePageLayout, isFrontCover = legacyStore.isFrontCover, isBackCover = legacyStore.isBackCover;
export function initStore(options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean) { legacyStore.init(options, total, mappedPages, hasPdfUrl); }


