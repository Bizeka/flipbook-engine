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
import { effect } from '@preact/signals-core';
import { isSingleMode, isDoublePageLayout, orientation } from '../state/store';

export class LayoutManager {
    private wrapperElement: HTMLElement | null = null;
    private sizerElement: HTMLElement | null = null;
    private pageViewport: { width: number; height: number };
    private resizeObserver: ResizeObserver | null = null;
    private orientationMediaQuery: MediaQueryList | null = null;
    private unsubs: Array<() => void> = [];
    public onResizeCallback?: () => void;

    constructor(pageViewport: { width: number; height: number }) {
        this.pageViewport = pageViewport;
    }

    public init(wrapperElement: HTMLElement, sizerElement: HTMLElement) {
        this.wrapperElement = wrapperElement;
        this.sizerElement = sizerElement;

        this.setupResizeObserver();
        this.setupOrientationMedia();
        this.setupStateSync();

        // Initial update
        this.updateBookAspectRatio();
    }

    private setupStateSync() {
        // When single mode or orientation changes, we need to recalculate the aspect ratio
        this.unsubs.push(
            effect(() => {
                // Accessing signals to track dependencies
                isSingleMode.value;
                orientation.value;
                
                // Debounce slightly to allow DOM to settle if classes were added
                setTimeout(() => this.updateBookAspectRatio(), 10);
            })
        );
    }

    private setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined' && this.wrapperElement) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateBookAspectRatio();
            });
            this.resizeObserver.observe(this.wrapperElement);
        }
    }

    private setupOrientationMedia() {
        if (typeof window !== 'undefined' && window.matchMedia) {
            this.orientationMediaQuery = window.matchMedia("(orientation: portrait)");
            
            const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
                if (e.matches) {
                    // Mobile device turned to portrait -> force single mode? 
                    // This can be decided by the business logic, for now we just recalculate
                }
                this.updateBookAspectRatio();
            };

            // Add listener
            if (this.orientationMediaQuery.addEventListener) {
                this.orientationMediaQuery.addEventListener('change', handleOrientationChange);
            } else {
                this.orientationMediaQuery.addListener(handleOrientationChange);
            }
            
            // Call once
            handleOrientationChange(this.orientationMediaQuery);
        }
    }

    public updateBookAspectRatio() {
        if (!this.wrapperElement || !this.sizerElement) return;

        const availWidth = this.wrapperElement.clientWidth;
        const availHeight = this.wrapperElement.clientHeight;

        if (availWidth === 0 || availHeight === 0) return;

        const width = this.pageViewport.width;
        const height = this.pageViewport.height;

        // Standard aspect ratio calculation
        const isPhysicalPortrait = availWidth < availHeight;
        
        // If the library is in landscape mode AND we are not in forced single mode, we need double width
        const isDouble = isDoublePageLayout.value;
        const targetRatio = isDouble ? (width * 2) / height : width / height;

        let bookWidth = availWidth;
        let bookHeight = availWidth / targetRatio;

        // We must fit the entire book on the screen to prevent unwanted vertical scrolling.
        if (bookHeight > availHeight) {
            bookHeight = availHeight;
            bookWidth = availHeight * targetRatio;
        }

        // Apply exact pixel sizes.
        // Ensure the width is ALWAYS an EVEN number to prevent sub-pixel rendering gaps.
        let finalWidth = Math.ceil(bookWidth);
        if (finalWidth % 2 !== 0) finalWidth += 1;

        this.sizerElement.style.width = `${finalWidth}px`;
        this.sizerElement.style.height = `${Math.floor(bookHeight)}px`;
        this.sizerElement.style.aspectRatio = '';

        if (this.onResizeCallback) {
            this.onResizeCallback();
        }
    }

    public destroy() {
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];

        if (this.resizeObserver && this.wrapperElement) {
            this.resizeObserver.unobserve(this.wrapperElement);
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.orientationMediaQuery) {
            // Remove listeners (safely ignoring for brevity)
            this.orientationMediaQuery = null;
        }
    }
}
