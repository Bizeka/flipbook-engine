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
import { PageFlip } from 'page-flip';
import { effect } from '@preact/signals-core';
import { currentPage, orientation, flipState, pages, isSingleMode, soundEnabled, isAutoPlaying, autoPlayInterval } from '../state/store';
import type { FlipbookEngineOptions } from '../engine';

export class PageFlipAdapter {
    private pageFlip: any = null;
    private bookContainer: HTMLElement;
    private options: FlipbookEngineOptions;
    private unsubs: Array<() => void> = [];
    private audioEl: HTMLAudioElement | null = null;
    private isLibraryFlipping = false;
    private autoPlayTimer: any = null;

    constructor(bookContainer: HTMLElement, options: FlipbookEngineOptions) {
        this.bookContainer = bookContainer;
        this.options = options;
        if (options.soundUrl) {
            this.audioEl = new Audio(options.soundUrl);
        }
    }

    public init(viewportWidth: number, viewportHeight: number) {
        this.pageFlip = new PageFlip(this.bookContainer, {
            width: viewportWidth,
            height: viewportHeight,
            size: "stretch" as any,
            minWidth: 100,
            maxWidth: 3000,
            minHeight: 100,
            maxHeight: 3000,
            drawShadow: true,
            showCover: true,
            usePortrait: true,
            mobileScrollSupport: false,
            maxShadowOpacity: this.options.maxShadowOpacity || 0.5,
            flippingTime: this.options.flippingTime || 1000
        });

        // Load the HTML pages from the DOM
        const pageElements = this.bookContainer.querySelectorAll('.bz-page');
        this.pageFlip.loadFromHTML(Array.from(pageElements));

        this.bindEvents();
        this.setupSignalSync();
    }

    private bindEvents() {
        // When the library flips a page, update our signal
        this.pageFlip.on('flip', (e: any) => {
            // Check if we are not just initializing
            if (currentPage.value !== e.data) {
                this.isLibraryFlipping = true;
                currentPage.value = e.data;
                this.playSound();
                this.isLibraryFlipping = false;
            }
        });

        // When the library changes state, update our signal
        this.pageFlip.on('changeState', (e: any) => {
            flipState.value = e.data;
        });

        // When the library changes orientation, update our signal
        this.pageFlip.on('changeOrientation', (e: any) => {
            if (orientation.value !== e.data) {
                orientation.value = e.data;
            }
        });
    }

    private setupSignalSync() {
        // When our signal changes, tell the library to flip (if needed)
        this.unsubs.push(
            effect(() => {
                const targetPage = currentPage.value;
                const state = flipState.peek();
                if (!this.pageFlip || this.isLibraryFlipping || state !== 'read') return;
                
                const libCurrentPage = this.pageFlip.getCurrentPageIndex();
                if (libCurrentPage !== targetPage && !isSingleMode.value) {
                    const getSpreadIndex = (p: number) => p === 0 ? 0 : Math.ceil(p / 2);
                    const targetSpread = getSpreadIndex(targetPage);
                    const currentSpread = getSpreadIndex(libCurrentPage);
                    
                    if (targetSpread === currentSpread + 1) {
                        this.pageFlip.flipNext();
                    } else if (targetSpread === currentSpread - 1) {
                        this.pageFlip.flipPrev();
                    } else if (targetSpread !== currentSpread) {
                        this.pageFlip.turnToPage(targetPage);
                    }
                }
            })
        );

        // Watch for singleMode changes from DOMWise UI to trigger layout updates
        this.unsubs.push(
            effect(() => {
                isSingleMode.value;
                if (!this.pageFlip) return;
                
                // We use setTimeout to wait for LayoutManager to update the container dimensions first
                setTimeout(() => {
                    if (this.pageFlip) {
                        this.pageFlip.update();
                    }
                    window.dispatchEvent(new Event('resize'));
                }, 50);
            })
        );
        
        // AutoPlay loop
        this.unsubs.push(
            effect(() => {
                const playing = isAutoPlaying.value;
                const interval = autoPlayInterval.value || 3000;
                
                if (this.autoPlayTimer) {
                    clearInterval(this.autoPlayTimer);
                    this.autoPlayTimer = null;
                }
                
                if (playing) {
                    this.autoPlayTimer = setInterval(() => {
                        // Check if we are at the end
                        const maxIndex = pages.value.length - 1;
                        if (currentPage.peek() >= maxIndex || (currentPage.peek() >= maxIndex - 1 && !isSingleMode.peek())) {
                            // If at end, pause or loop
                            // Let's just pause
                            isAutoPlaying.value = false;
                            return;
                        }
                        this.turnToNextPage();
                    }, interval);
                }
            })
        );
    }

    public turnToNextPage() {
        if (isSingleMode.value) {
            const nextIdx = currentPage.value + 1;
            if (nextIdx < pages.value.length) {
                currentPage.value = nextIdx;
                this.playSound();
            }
        } else if (this.pageFlip) {
            this.pageFlip.flipNext();
        }
    }

    public turnToPrevPage() {
        if (isSingleMode.value) {
            const prevIdx = currentPage.value - 1;
            if (prevIdx >= 0) {
                currentPage.value = prevIdx;
                this.playSound();
            }
        } else if (this.pageFlip) {
            this.pageFlip.flipPrev();
        }
    }

    public playSound() {
        if (soundEnabled.value && this.audioEl) {
            this.audioEl.currentTime = 0;
            this.audioEl.play().catch(err => console.warn('Flipbook Audio Play Error:', err));
        }
    }

    public update() {
        if (this.pageFlip) {
            this.pageFlip.update();
        }
    }

    public destroy() {
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
        if (this.pageFlip) {
            this.pageFlip.destroy();
            this.pageFlip = null;
        }
    }
}
