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


import { computed, effect } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';

interface ThumbnailsProps {
    store: FlipbookStore;
    signal?: AbortSignal;
    onThumbClick: (pageIndex: number) => void;
}

/** Keeps the active thumbnail in view when the page changes, including the page restored on open. */
function followActiveThumb(rail: HTMLElement, store: FlipbookStore, signal?: AbortSignal) {
    let frame: ReturnType<typeof setTimeout> | undefined;
    const stop = effect(() => {
        store.currentPage.value; store.isSingleMode.value;
        if (!store.showThumbs.value) return;
        clearTimeout(frame);
        frame = setTimeout(() => {
            const active = rail.querySelector<HTMLElement>('.thumb-item.active');
            if (!active || !rail.isConnected) return;
            const left = active.offsetLeft - rail.offsetLeft, right = left + active.offsetWidth;
            if (left < rail.scrollLeft || right > rail.scrollLeft + rail.clientWidth) {
                rail.scrollTo({ left: Math.max(0, left - (rail.clientWidth - active.offsetWidth) / 2), behavior: 'smooth' });
            }
        }, 0);
    });
    signal?.addEventListener('abort', () => { clearTimeout(frame); stop(); }, { once: true });
}

export function Thumbnails(props: ThumbnailsProps) {
    return (
        <div class="bk-thumbs" ref={(element: HTMLElement) => { if (element) followActiveThumb(element, props.store, props.signal); }} style={computed(() => props.store.showThumbs.value ? 'display:flex;' : 'display:none;')}>
            {props.store.pages.value.map((page, index) => {
                const isActive = () => {
                    const current = props.store.currentPage.value;
                    if (props.store.isSingleMode.value || current === 0 || current >= props.store.pages.value.length - 1) {
                        return current === index;
                    }
                    const left = current % 2 === 1 ? current : current - 1;
                    return index === left || index === left + 1;
                };

                return (
                    <div
                        // @ts-ignore
                        class={computed(() => `thumb-item ${isActive() ? 'active' : ''}`)}
                        role="button"
                        tabindex="0"
                        aria-label={`Go to page ${index + 1}`}
                        aria-current={computed(() => isActive() ? 'page' : undefined)}
                        onClick={() => props.onThumbClick(index)}
                        onKeyDown={(event: KeyboardEvent) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                props.onThumbClick(index);
                            }
                        }}
                    >
                        <div class="thumb-img-wrapper">
                            <img
                                data-pdf-page={page.assetId.startsWith('pdf-page-') ? (page.sourcePageNumber ?? page.pageNumber) : undefined}
                                class={`thumb-img ${page.cropMode !== 'full' ? 'thumb-img--split thumb-img--' + page.cropMode : ''}`}
                                src={page.thumb || page.low || page.normal}
                                alt={`Page ${index + 1}`}
                                loading="lazy"
                                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <span class='thumb-page-number'>{index + 1}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


