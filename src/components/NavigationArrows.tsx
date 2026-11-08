/**
 * @license FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 *
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 */


import { computed } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import { styled } from './style';

interface NavigationArrowsProps {
    store: FlipbookStore;
    onPrevPage: () => void;
    onNextPage: () => void;
}

export function NavigationArrows(props: NavigationArrowsProps) {
    const isLeftVisible = computed(() => {
        return props.store.showArrows.value && props.store.currentPage.value > 0;
    });

    const isRightVisible = computed(() => {
        if (!props.store.showArrows.value || props.store.totalPages.value <= 1) return false;
        // If double page layout, the last visible spread starts at totalPages - 2 (if even) or totalPages - 1 (if odd)
        // A simple check: if current page is the last page, hide it.
        return props.store.currentPage.value < props.store.totalPages.value - 1;
    });

    // Zoomed, the arrows would sit under spread fingers and swallow the pinch or pan, so they step aside.
    const zoomedStyle = () => props.store.isZoomed.value ? 'opacity: 0; pointer-events: none;' : 'opacity: ; pointer-events: ;';

    return (
        <div class="bk-nav-arrows" style={styled(() => props.store.showArrows.value && !props.store.showToc.value && !props.store.showSearch.value && !props.store.showNotes.value && !props.store.placingNote.value && !props.store.pendingAnnotation.value && !props.store.activeAnnotationId.value ? 'display: flex;' : 'display: none;')}>
            <button type="button"
                class="bk-nav-arrow bk-nav-prev"
                style={styled(() => (isLeftVisible.value ? 'visibility: visible;' : 'visibility: hidden;') + zoomedStyle())}
                onClick={(e: Event) => { e.preventDefault(); e.stopPropagation(); props.onPrevPage(); }}
                aria-label="Previous Page"
            >
                <div class="bk-arrow-icon bk-arrow-left"></div>
            </button>
            <button type="button"
                class="bk-nav-arrow bk-nav-next"
                style={styled(() => (isRightVisible.value ? 'visibility: visible;' : 'visibility: hidden;') + zoomedStyle())}
                onClick={(e: Event) => { e.preventDefault(); e.stopPropagation(); props.onNextPage(); }}
                aria-label="Next Page"
            >
                <div class="bk-arrow-icon bk-arrow-right"></div>
            </button>
        </div>
    );
}

