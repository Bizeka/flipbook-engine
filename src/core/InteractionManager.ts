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
import type { FlipbookStore } from '../state/store';
import type { PageFlipAdapter } from '../adapters/PageFlipAdapter';

export class InteractionManager {
    private container: HTMLElement;
    private pageFlipAdapter: PageFlipAdapter;
    private store: FlipbookStore;
    private touchStartX: number | null = null;
    private unsubs: Array<() => void> = [];
    private listenerAbortController: AbortController;

    constructor(container: HTMLElement, pageFlipAdapter: PageFlipAdapter, store: FlipbookStore) {
        this.container = container;
        this.pageFlipAdapter = pageFlipAdapter;
        this.store = store;
        const AbortControllerCtor = container.ownerDocument.defaultView?.AbortController ?? globalThis.AbortController;
        this.listenerAbortController = new AbortControllerCtor();
    }

    public init() {
        this.bindWheel();
        this.bindMouseDrag();
        this.bindTouch();
        this.setupStateSync();
    }

    private setupStateSync() {
        this.unsubs.push(
            effect(() => {
                this.store.isZoomed.value = this.store.zoomState.value.isActive;

                if (this.store.zoomState.value.isActive) {
                    this.container.style.transform = `translate(${this.store.zoomState.value.translateX}px, ${this.store.zoomState.value.translateY}px) scale(${this.store.zoomState.value.scale})`;
                    this.container.style.transition = 'none';
                } else {
                    this.container.style.transform = '';
                    this.container.style.transition = 'transform 0.3s ease';
                }
            })
        );
    }

    private bindWheel() {
        this.container.addEventListener('wheel', (e) => {
            if (this.store.zoomState.value.isActive) {
                e.preventDefault();
                this.updateZoomPan(
                    this.store.zoomState.value.translateX - e.deltaX,
                    this.store.zoomState.value.translateY - e.deltaY
                );
            }
        }, { passive: false, signal: this.listenerAbortController.signal });
    }

    private bindMouseDrag() {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialTx = 0;
        let initialTy = 0;

        this.container.addEventListener('mousedown', (e) => {
            if (this.store.zoomState.value.isActive) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialTx = this.store.zoomState.value.translateX;
                initialTy = this.store.zoomState.value.translateY;
                this.container.style.cursor = 'grabbing';
            }
        }, { signal: this.listenerAbortController.signal });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.store.zoomState.value.isActive) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.updateZoomPan(initialTx + dx, initialTy + dy);
        }, { signal: this.listenerAbortController.signal });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.cursor = this.store.zoomState.value.isActive ? 'grab' : '';
            }
        }, { signal: this.listenerAbortController.signal });
    }

    private bindTouch() {
        let isDragging = false;
        let startTx = 0;
        let startTy = 0;

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                if (!this.store.zoomState.value.isActive) {
                    this.touchStartX = e.touches[0].clientX;
                } else {
                    isDragging = true;
                    this.touchStartX = e.touches[0].clientX;
                    const touchStartY = e.touches[0].clientY;
                    startTx = this.store.zoomState.value.translateX;
                    startTy = this.store.zoomState.value.translateY;
                    (this.container as any)._touchStartY = touchStartY;
                }
            }
        }, { passive: true, signal: this.listenerAbortController.signal });

        this.container.addEventListener('touchmove', (e) => {
            if (isDragging && this.store.zoomState.value.isActive && e.touches.length === 1 && this.touchStartX !== null) {
                e.preventDefault();
                const dx = e.touches[0].clientX - this.touchStartX;
                const dy = e.touches[0].clientY - (this.container as any)._touchStartY;
                this.updateZoomPan(startTx + dx, startTy + dy);
            }
        }, { passive: false, signal: this.listenerAbortController.signal });

        this.container.addEventListener('touchend', (e) => {
            if (this.touchStartX !== null && !this.store.zoomState.value.isActive && this.store.isSingleMode.value && e.changedTouches.length === 1) {
                const diffX = e.changedTouches[0].clientX - this.touchStartX;
                if (diffX > 50 && this.store.currentPage.value > 0) {
                    this.pageFlipAdapter.turnToPrevPage();
                } else if (diffX < -50 && this.store.currentPage.value < this.store.totalPages.value - 1) {
                    this.pageFlipAdapter.turnToNextPage();
                }
            }
            this.touchStartX = null;
            isDragging = false;
        }, { passive: true, signal: this.listenerAbortController.signal });
    }

    public zoomIn() {
        let newScale = this.store.zoomState.value.scale + 0.5;
        if (newScale > 5) newScale = 5;

        this.store.zoomState.value = {
            ...this.store.zoomState.value,
            isActive: newScale > 1,
            scale: newScale
        };
        if (newScale > 1) {
            this.container.style.cursor = 'grab';
        }
    }

    public zoomOut() {
        let newScale = this.store.zoomState.value.scale - 0.5;
        if (newScale <= 1) {
            newScale = 1;
            this.store.zoomState.value = { ...this.store.zoomState.value, isActive: false, translateX: 0, translateY: 0, scale: 1 };
            this.container.style.cursor = '';
        } else {
            this.store.zoomState.value = { ...this.store.zoomState.value, isActive: true, scale: newScale };
        }
    }

    private updateZoomPan(x: number, y: number) {
        this.store.zoomState.value = {
            ...this.store.zoomState.value,
            translateX: x,
            translateY: y
        };
    }

    public destroy() {
        this.listenerAbortController.abort();
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
    }
}







