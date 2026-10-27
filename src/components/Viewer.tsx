import { TextLayer } from './TextLayer';
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


import { computed } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import { HotspotLayer } from './HotspotLayer';
import type { FlipbookHotspot } from '../model/hotspots';
import type { FlipbookAnnotation } from '../model/annotations';
import { NotePlacementLayer, bindNoteGestures } from './NotePlacementLayer';

interface ViewerProps {
    store: FlipbookStore;
    bookWrapperRef: (el: HTMLElement) => void;
    bookSizerRef: (el: HTMLElement) => void;
    bookContainerRef: (el: HTMLElement) => void;
    onHotspotActivate: (hotspot: FlipbookHotspot) => void;
    onHotspotClose: () => void;
    onAnnotationActivate: (annotation: FlipbookAnnotation) => void;
    onAnnotationClose: () => void;
    onPlaceAnnotation: (pageIndex: number, x: number, y: number) => void;
    signal: AbortSignal;
}


function SearchHighlightLayer(props: { store: FlipbookStore; pageIndex: number }) {
    const highlights = computed(() => props.store.searchResults.value
        .filter((result) => result.pageIndex === props.pageIndex)
        .flatMap((result) => result.highlights ?? []));
    return (
        <div class={computed(() => 'bk-search-highlight-layer is-' + props.store.searchHighlightStyle.value)} aria-hidden="true">
            {computed(() => (
                <div class="bk-search-highlight-items">
                    {highlights.value.map((highlight) => (
                        <span class="bk-search-text-highlight" style={'left:' + (highlight.x * 100) + '%;top:' + (highlight.y * 100) + '%;width:' + (highlight.width * 100) + '%;height:' + (highlight.height * 100) + '%;'} />
                    ))}
                </div>
            ))}
        </div>
    );
}

/** Leaf edges beside the spread: thickness follows the page count, each side its share of read and unread pages. */
function PageStacks(props: { store: FlipbookStore }) {
    const style = (side: 'left' | 'right') => computed(() => {
        const total = props.store.totalPages.value;
        if (!props.store.isDoublePageLayout.value || total < 4) return 'display:none;';
        const page = Math.min(Math.max(props.store.currentPage.value, 0), total - 1);
        const before = page === 0 ? 0 : (page % 2 === 1 ? page : page - 1);
        const after = Math.max(0, total - before - (page === 0 ? 1 : 2));
        const share = (side === 'left' ? before : after) / total;
        const depth = Math.min(4, Math.max(2, total * 0.02));
        return share > 0 ? `--bk-stack-share:${share.toFixed(4)};--bk-stack-depth:${depth.toFixed(2)}%;` : 'display:none;';
    });
    return <>
        <div class="bk-page-stack bk-page-stack--left" aria-hidden="true" style={style('left')} />
        <div class="bk-page-stack bk-page-stack--right" aria-hidden="true" style={style('right')} />
    </>;
}

export function Viewer(props: ViewerProps) {
    return (
        <div
            role="region"
            aria-label="Flipbook viewer"
            class={computed(() => {
                let classes = 'bk-book-wrapper ';
                if (props.store.isSingleMode.value) classes += 'single-mode ';
                if (props.store.isDoublePageLayout.value) classes += 'double-mode ';
                if (props.store.isFrontCover.value) classes += 'bk-is-cover ';
                if (props.store.isBackCover.value) classes += 'bk-is-back-cover ';
                if (props.store.zoomState.value.isActive) classes += 'zoomed ';
                return classes.trim();
            })}
            ref={(element: HTMLElement) => { props.bookWrapperRef(element); bindNoteGestures(element, props.store, props.onPlaceAnnotation, props.signal); }}
        >
            <div
                class="bk-book-sizer"
                ref={props.bookSizerRef}
            >
                <PageStacks store={props.store} />
                <div
                    ref={props.bookContainerRef}
                    // Hidden by class, not by rewriting style: page-flip keeps its own inline sizing on this element.
                    class={computed(() => 'bk-book' + (props.store.flipState.value !== 'read' ? ' is-flipping' : '') + (props.store.isSingleMode.value ? ' is-hidden' : ''))}
                >
                    {props.store.pages.value.map((page, index) => {
                            const isHard = index === 0 || index === props.store.pages.value.length - 1;

                            return (
                                <div
                                    // @ts-ignore
                                    class={computed(() => `bz-page ${index === 0 ? 'bz-page--cover' : ''} ${index === props.store.pages.value.length - 1 ? 'bz-page--back' : ''}`)}
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
                                        />
                                        <TextLayer store={props.store} pageIndex={index} signal={props.signal} />
                                        <SearchHighlightLayer store={props.store} pageIndex={index} />
                                        <HotspotLayer store={props.store} pageIndex={index} onActivate={props.onHotspotActivate} onClose={props.onHotspotClose} onAnnotationActivate={props.onAnnotationActivate} onAnnotationClose={props.onAnnotationClose} />
                                        <div class="page-shadow"></div>
                                        <NotePlacementLayer store={props.store} pageIndex={index} onPlace={props.onPlaceAnnotation} />
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
                            <div class="bk-single-page" data-idx={props.store.currentPage.value}>
                                <img
                                    data-pdf-page={page.assetId.startsWith('pdf-page-') ? (page.sourcePageNumber ?? page.pageNumber) : undefined}
                                    class={computed(() => `bk-single-img page-content ${page.cropMode !== 'full' ? 'page-content--split page-content--' + page.cropMode : ''}`)}
                                    src={props.store.zoomState.value.isActive ? page.normal : (page.low || page.normal)}
                                    alt={`Page ${props.store.currentPage.value + 1}`}
                                    style="opacity: 1; transition: opacity 0.3s; box-shadow: var(--flipbook-shadow);"
                                />
                                {computed(() => props.store.isSingleMode.value ? (
                                    <>
                                        <TextLayer store={props.store} pageIndex={props.store.currentPage.value} signal={props.signal} />
                                        <SearchHighlightLayer store={props.store} pageIndex={props.store.currentPage.value} />
                                        <HotspotLayer store={props.store} pageIndex={props.store.currentPage.value} onActivate={props.onHotspotActivate} onClose={props.onHotspotClose} onAnnotationActivate={props.onAnnotationActivate} onAnnotationClose={props.onAnnotationClose} />
                                        <NotePlacementLayer store={props.store} pageIndex={props.store.currentPage.value} onPlace={props.onPlaceAnnotation} />
                                    </>
                                ) : null)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}






