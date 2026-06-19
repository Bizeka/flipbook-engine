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
import { signal, computed } from '@preact/signals-core';
import type { FlipbookThemeMode } from '../theme/theme';
import type { NormalizedFlipbookPage } from '../model/pages';
import type { FlipbookEngineOptions } from '../engine';

// Signals hold the reactive state of the application.
// Any DOMWise component that accesses `.value` will automatically re-render when the value changes.

export const currentPage = signal<number>(0);
export const totalPages = signal<number>(0);
export const isSingleMode = signal<boolean>(false);
export const showThumbs = signal<boolean>(true);
export const orientation = signal<'landscape' | 'portrait'>('landscape');
export const flipState = signal<'read' | 'fold_corner' | 'flipping'>('read');
export const themeMode = signal<FlipbookThemeMode>('auto');
export const allowDownload = signal<boolean>(true);
export const hasDownloadUrl = signal<boolean>(false);
export const primaryColor = signal<string>('#7367f0');
export const whiteLabel = signal<boolean>(false);
export const isZoomed = signal<boolean>(false);
export const isAutoPlaying = signal<boolean>(false);
export const autoPlayInterval = signal<number>(3000);
export const soundEnabled = signal<boolean>(true);

export const zoomState = signal<{
    isActive: boolean;
    translateX: number;
    translateY: number;
    isDragging: boolean;
    scale: number;
}>({
    isActive: false,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    scale: 1
});

export const pages = signal<NormalizedFlipbookPage[]>([]);

// Computed values automatically update when their dependencies change.
export const isDoublePageLayout = computed(() => {
    return !isSingleMode.value && orientation.value === 'landscape';
});

export const isFrontCover = computed(() => {
    return isDoublePageLayout.value && currentPage.value === 0;
});

export const isBackCover = computed(() => {
    if (!isDoublePageLayout.value) return false;
    // In page-flip, the back cover is the last page if it's an even number of pages, etc.
    // For simplicity, if currentPage is >= totalPages - 1
    return currentPage.value >= totalPages.value - 1;
});

// A simple initialization function to inject options into state
export function initStore(options: FlipbookEngineOptions, total: number, mappedPages: NormalizedFlipbookPage[], hasPdfUrl: boolean) {
    totalPages.value = total;
    pages.value = mappedPages;
    hasDownloadUrl.value = hasPdfUrl;
    
    if (options.theme !== undefined) themeMode.value = options.theme;
    if (options.primaryColor !== undefined) primaryColor.value = options.primaryColor;
    if (options.showThumbs !== undefined) showThumbs.value = options.showThumbs;
    if (options.allowDownload !== undefined) allowDownload.value = options.allowDownload;
    if (options.whiteLabel !== undefined) whiteLabel.value = options.whiteLabel;
    if (options.soundEnabled !== undefined) soundEnabled.value = options.soundEnabled;
    if (options.isSingleMode !== undefined) isSingleMode.value = options.isSingleMode;
    if (options.singleMode !== undefined) isSingleMode.value = options.singleMode;
    if (options.autoPlay !== undefined) isAutoPlaying.value = options.autoPlay;
    if (options.autoPlayInterval !== undefined) autoPlayInterval.value = options.autoPlayInterval;
    
    currentPage.value = 0;
}
