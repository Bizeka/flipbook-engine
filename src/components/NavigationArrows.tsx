/**
 * @license FlipbookEngine v0.2.4
 * Copyright (c) 2026 Murat Dogan
 * 
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 */
import { computed } from '@preact/signals-core';
import { showArrows, currentPage, totalPages, isDoublePageLayout } from '../state/store';

interface NavigationArrowsProps {
    onPrevPage: () => void;
    onNextPage: () => void;
}

export function NavigationArrows(props: NavigationArrowsProps) {
    const isLeftVisible = computed(() => {
        return showArrows.value && currentPage.value > 0;
    });

    const isRightVisible = computed(() => {
        if (!showArrows.value || totalPages.value <= 1) return false;
        // If double page layout, the last visible spread starts at totalPages - 2 (if even) or totalPages - 1 (if odd)
        // A simple check: if current page is the last page, hide it.
        return currentPage.value < totalPages.value - 1;
    });

    return (
        <div class="bk-nav-arrows" style={computed(() => showArrows.value ? 'display: flex;' : 'display: none;')}>
            <button 
                class="bk-nav-arrow bk-nav-prev" 
                style={computed(() => isLeftVisible.value ? 'visibility: visible;' : 'visibility: hidden;')}
                onClick={(e: Event) => { e.preventDefault(); props.onPrevPage(); }}
                aria-label="Previous Page"
            >
                <div class="bk-arrow-icon bk-arrow-left"></div>
            </button>
            <button 
                class="bk-nav-arrow bk-nav-next" 
                style={computed(() => isRightVisible.value ? 'visibility: visible;' : 'visibility: hidden;')}
                onClick={(e: Event) => { e.preventDefault(); props.onNextPage(); }}
                aria-label="Next Page"
            >
                <div class="bk-arrow-icon bk-arrow-right"></div>
            </button>
        </div>
    );
}
