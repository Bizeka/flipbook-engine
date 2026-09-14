/**
 * @license FlipbookEngine v0.8.0
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
import type { FlipbookStore } from '../state/store';
import type { FlipbookEngineOptions } from '../engine';

export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveFlippingTime(flippingTime?: number, reducedMotion = prefersReducedMotion()): number {
    if (reducedMotion) return 0;
    return typeof flippingTime === 'number' && flippingTime >= 0 ? flippingTime : 1000;
}
export class PageFlipAdapter {
    private pageFlip: any = null;
    private bookContainer: HTMLElement;
    private options: FlipbookEngineOptions;
    private store: FlipbookStore;
    private unsubs: Array<() => void> = [];
    private audioEl: HTMLAudioElement | null = null;
    private audioUnlockHandler: (() => void) | null = null;
    private isLibraryFlipping = false;
    private autoPlayTimer: any = null;
    private layoutUpdateTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(bookContainer: HTMLElement, options: FlipbookEngineOptions, store: FlipbookStore) {
        this.bookContainer = bookContainer;
        this.options = options;
        this.store = store;
        if (options.soundUrl) {
            this.audioEl = new Audio(options.soundUrl);
            this.unlockAudio();
        }
    }

    private unlockAudio() {
        if (!this.audioEl) return;
        const unlock = () => {
            if (this.audioEl) {
                const playback = this.audioEl.play();
                if (playback && typeof playback.then === 'function') {
                    playback.then(() => {
                        this.audioEl!.pause();
                        this.audioEl!.currentTime = 0;
                    }).catch(() => {});
                }
            }
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
            this.audioUnlockHandler = null;
        };
        this.audioUnlockHandler = unlock;
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });
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
            // Keep native mobile scrolling available; this avoids preventDefault on non-cancelable touchstart events.
            mobileScrollSupport: true,
            maxShadowOpacity: this.options.maxShadowOpacity || 0.5,
            flippingTime: resolveFlippingTime(this.options.flippingTime)
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
            if (this.store.currentPage.value !== e.data) {
                this.isLibraryFlipping = true;
                this.store.currentPage.value = e.data;
                this.playSound();
                this.isLibraryFlipping = false;
            }
        });

        // When the library changes state, update our signal
        this.pageFlip.on('changeState', (e: any) => {
            this.store.flipState.value = e.data;
        });

        // When the library changes orientation, update our signal
        this.pageFlip.on('changeOrientation', (e: any) => {
            if (this.store.orientation.value !== e.data) {
                this.store.orientation.value = e.data;
            }
        });
    }

    private setupSignalSync() {
        // When our signal changes, tell the library to flip (if needed)
        this.unsubs.push(
            effect(() => {
                const targetPage = this.store.currentPage.value;
                const state = this.store.flipState.peek();
                if (!this.pageFlip || this.isLibraryFlipping || state !== 'read') return;

                const libCurrentPage = this.pageFlip.getCurrentPageIndex();
                if (libCurrentPage !== targetPage && !this.store.isSingleMode.value) {
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
                this.store.isSingleMode.value;
                if (!this.pageFlip) return;

                // We use setTimeout to wait for LayoutManager to update the container dimensions first
                if (this.layoutUpdateTimer) clearTimeout(this.layoutUpdateTimer);
                this.layoutUpdateTimer = setTimeout(() => {
                    this.layoutUpdateTimer = null;
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
                const playing = this.store.isAutoPlaying.value;
                const interval = this.store.autoPlayInterval.value || 3000;

                if (this.autoPlayTimer) {
                    clearInterval(this.autoPlayTimer);
                    this.autoPlayTimer = null;
                }

                if (playing) {
                    this.autoPlayTimer = setInterval(() => {
                        // Check if we are at the end
                        const maxIndex = this.store.pages.value.length - 1;
                        if (this.store.currentPage.peek() >= maxIndex || (this.store.currentPage.peek() >= maxIndex - 1 && !this.store.isSingleMode.peek())) {
                            // If at end, pause or loop
                            // Let's just pause
                            this.store.isAutoPlaying.value = false;
                            return;
                        }
                        this.turnToNextPage();
                    }, interval);
                }
            })
        );
    }

    public turnToNextPage() {
        if (this.store.isSingleMode.value) {
            const nextIdx = this.store.currentPage.value + 1;
            if (nextIdx < this.store.pages.value.length) {
                this.store.currentPage.value = nextIdx;
                this.playSound();
            }
        } else if (this.pageFlip) {
            this.pageFlip.flipNext();
        }
    }

    public turnToPrevPage() {
        if (this.store.isSingleMode.value) {
            const prevIdx = this.store.currentPage.value - 1;
            if (prevIdx >= 0) {
                this.store.currentPage.value = prevIdx;
                this.playSound();
            }
        } else if (this.pageFlip) {
            this.pageFlip.flipPrev();
        }
    }

    public playSound() {
        if (this.store.soundEnabled.value && this.audioEl) {
            this.audioEl.currentTime = 0;
            const playback = this.audioEl.play();
            if (playback && typeof playback.catch === 'function') {
                playback.catch(err => console.warn('Flipbook Audio Play Error:', err));
            }
        }
    }

    public update() {
        if (this.pageFlip) {
            this.pageFlip.update();
        }
        if (this.layoutUpdateTimer) {
            clearTimeout(this.layoutUpdateTimer);
            this.layoutUpdateTimer = null;
        }
    }

    public destroy() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
        if (this.audioUnlockHandler) {
            document.removeEventListener('touchstart', this.audioUnlockHandler);
            document.removeEventListener('click', this.audioUnlockHandler);
            this.audioUnlockHandler = null;
        }
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
        if (this.pageFlip) {
            this.pageFlip.destroy();
            this.pageFlip = null;
        }
    }
}




