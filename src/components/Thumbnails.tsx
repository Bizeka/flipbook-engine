/**
 * @license FlipbookEngine v0.6.5
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


import { computed } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';

interface ThumbnailsProps {
    store: FlipbookStore;
    onThumbClick: (pageIndex: number) => void;
}

export function Thumbnails(props: ThumbnailsProps) {
    return (
        <div class="bk-thumbs" style={computed(() => props.store.showThumbs.value ? 'display:flex;' : 'display:none;')}>
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


