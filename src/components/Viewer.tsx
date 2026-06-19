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
import { computed } from '@preact/signals-core';
import { pages, zoomState, isFrontCover, isBackCover, isDoublePageLayout, flipState, isSingleMode, currentPage } from '../state/store';

interface ViewerProps {
    bookWrapperRef: (el: HTMLElement) => void;
    bookSizerRef: (el: HTMLElement) => void;
    bookContainerRef: (el: HTMLElement) => void;
}

export function Viewer(props: ViewerProps) {
    return (
        <div 
            id="bk-book-wrapper"
            class={computed(() => {
                let classes = '';
                if (isDoublePageLayout.value) classes += 'double-mode ';
                if (isFrontCover.value) classes += 'bk-is-cover ';
                if (isBackCover.value) classes += 'bk-is-back-cover ';
                if (zoomState.value.isActive) classes += 'zoomed ';
                return classes.trim();
            })}
            ref={props.bookWrapperRef}
        >
            <div 
                id="bk-book-sizer" 
                ref={props.bookSizerRef}
            >
                <div 
                    id="bk-book" 
                    ref={props.bookContainerRef}
                    class={computed(() => flipState.value !== 'read' ? 'is-flipping' : '')}
                    style={computed(() => `display: ${isSingleMode.value ? 'none' : 'block'};`)}
                >
                    {pages.value.map((page, index) => {
                            const isHard = index === 0 || index === pages.value.length - 1;
                            
                            return (
                                <div 
                                    // @ts-ignore
                                    class={`bz-page ${index === 0 ? 'bz-page--cover' : ''} ${index === pages.value.length - 1 ? 'bz-page--back' : ''}`}
                                    data-density={isHard ? "hard" : "soft"}
                                    data-idx={index}
                                >
                                    <div class="bz-page-content" style="position:relative; width:100%; height:100%; overflow:hidden;">
                                        <img 
                                            src={page.low || page.normal} 
                                            data-src={page.normal} 
                                            class={`page-content ${page.cropMode !== 'full' ? 'page-content--split page-content--' + page.cropMode : ''}`}
                                            alt={`Page ${index + 1}`} 
                                            loading="lazy" 
                                        />
                                        <div class="page-shadow"></div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
                
                <div 
                    id="bk-single-view"
                    style={computed(() => `display: ${isSingleMode.value ? 'flex' : 'none'}; width: 100%; height: 100%; justify-content: center; align-items: center; position: absolute; top: 0; left: 0; z-index: 10;`)}
                >
                    {computed(() => {
                        const page = pages.value[currentPage.value];
                        if (!page) return null;
                        return (
                            <img 
                                id="bk-single-img"
                                class={`page-content ${page.cropMode !== 'full' ? 'page-content--split page-content--' + page.cropMode : ''}`}
                                src={zoomState.value.isActive ? page.normal : (page.low || page.normal)}
                                style="opacity: 1; transition: opacity 0.3s; box-shadow: var(--flipbook-shadow);"
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
