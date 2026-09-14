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
import { HotspotLayer } from './HotspotLayer';
import type { FlipbookHotspot } from '../model/hotspots';
import type { FlipbookAnnotation } from '../model/annotations';

interface ViewerProps {
    store: FlipbookStore;
    bookWrapperRef: (el: HTMLElement) => void;
    bookSizerRef: (el: HTMLElement) => void;
    bookContainerRef: (el: HTMLElement) => void;
    onHotspotActivate: (hotspot: FlipbookHotspot) => void;
    onHotspotClose: () => void;
    onAnnotationActivate: (annotation: FlipbookAnnotation) => void;
    onAnnotationClose: () => void;
}

export function Viewer(props: ViewerProps) {
    return (
        <div
            role="region"
            aria-label="Flipbook viewer"
            class={computed(() => {
                let classes = 'bk-book-wrapper ';
                if (props.store.isDoublePageLayout.value) classes += 'double-mode ';
                if (props.store.isFrontCover.value) classes += 'bk-is-cover ';
                if (props.store.isBackCover.value) classes += 'bk-is-back-cover ';
                if (props.store.zoomState.value.isActive) classes += 'zoomed ';
                return classes.trim();
            })}
            ref={props.bookWrapperRef}
        >
            <div
                class="bk-book-sizer"
                ref={props.bookSizerRef}
            >
                <div
                    ref={props.bookContainerRef}
                    class={computed(() => 'bk-book ' + (props.store.flipState.value !== 'read' ? 'is-flipping' : ''))}
                    style={computed(() => `display: ${props.store.isSingleMode.value ? 'none' : 'block'};`)}
                >
                    {props.store.pages.value.map((page, index) => {
                            const isHard = index === 0 || index === props.store.pages.value.length - 1;

                            return (
                                <div
                                    // @ts-ignore
                                    class={computed(() => `bz-page ${index === 0 ? 'bz-page--cover' : ''} ${index === props.store.pages.value.length - 1 ? 'bz-page--back' : ''} ${props.store.searchResults.value.some((result) => result.pageIndex === index) ? 'bk-page--search-match' : ''}`)}
                                    data-density={isHard ? "hard" : "soft"}
                                    data-idx={index}
                                >
                                    <div class="bz-page-content" style="position:relative; width:100%; height:100%; overflow:hidden;">
                                        <img
                                            data-pdf-page={page.assetId.startsWith('pdf-page-') ? (page.sourcePageNumber ?? page.pageNumber) : undefined}
                                            src={page.low || page.normal}
                                            data-src={page.normal}
                                            class={`page-content ${page.cropMode !== 'full' ? 'page-content--split page-content--' + page.cropMode : ''}`}
                                            alt={`Page ${index + 1}`}
                                            loading="lazy"
                                        />
                                        <HotspotLayer store={props.store} pageIndex={index} onActivate={props.onHotspotActivate} onClose={props.onHotspotClose} onAnnotationActivate={props.onAnnotationActivate} onAnnotationClose={props.onAnnotationClose} />
                                        <div class="page-shadow"></div>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                <div
                    class="bk-single-view"
                    style={computed(() => `display: ${props.store.isSingleMode.value ? 'flex' : 'none'}; width: 100%; height: 100%; justify-content: center; align-items: center; position: absolute; top: 0; left: 0; z-index: 10;`)}
                >
                    {computed(() => {
                        const page = props.store.pages.value[props.store.currentPage.value];
                        if (!page) return null;
                        return (
                            <img
                                data-pdf-page={page.assetId.startsWith('pdf-page-') ? (page.sourcePageNumber ?? page.pageNumber) : undefined}
                                class={computed(() => `bk-single-img page-content ${page.cropMode !== 'full' ? 'page-content--split page-content--' + page.cropMode : ''} ${props.store.searchResults.value.some((result) => result.pageIndex === props.store.currentPage.value) ? 'bk-page--search-match' : ''}`)}
                                src={props.store.zoomState.value.isActive ? page.normal : (page.low || page.normal)}
                                alt={`Page ${props.store.currentPage.value + 1}`}
                                style="opacity: 1; transition: opacity 0.3s; box-shadow: var(--flipbook-shadow);"
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}






