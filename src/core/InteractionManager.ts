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
import { zoomState, isZoomed, isSingleMode, currentPage, totalPages } from '../state/store';
import type { PageFlipAdapter } from '../adapters/PageFlipAdapter';

export class InteractionManager {
    private container: HTMLElement;
    private pageFlipAdapter: PageFlipAdapter;
    private touchStartX: number | null = null;
    private unsubs: Array<() => void> = [];

    constructor(container: HTMLElement, pageFlipAdapter: PageFlipAdapter) {
        this.container = container;
        this.pageFlipAdapter = pageFlipAdapter;
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
                isZoomed.value = zoomState.value.isActive;
                
                if (zoomState.value.isActive) {
                    this.container.style.transform = `translate(${zoomState.value.translateX}px, ${zoomState.value.translateY}px) scale(${zoomState.value.scale})`;
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
            if (zoomState.value.isActive) {
                e.preventDefault();
                this.updateZoomPan(
                    zoomState.value.translateX - e.deltaX,
                    zoomState.value.translateY - e.deltaY
                );
            }
        }, { passive: false });
    }

    private bindMouseDrag() {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialTx = 0;
        let initialTy = 0;

        this.container.addEventListener('mousedown', (e) => {
            if (zoomState.value.isActive) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialTx = zoomState.value.translateX;
                initialTy = zoomState.value.translateY;
                this.container.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !zoomState.value.isActive) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.updateZoomPan(initialTx + dx, initialTy + dy);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.cursor = zoomState.value.isActive ? 'grab' : '';
            }
        });
    }

    private bindTouch() {
        let isDragging = false;
        let startTx = 0;
        let startTy = 0;

        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                if (!zoomState.value.isActive) {
                    this.touchStartX = e.touches[0].clientX;
                } else {
                    isDragging = true;
                    this.touchStartX = e.touches[0].clientX;
                    const touchStartY = e.touches[0].clientY;
                    startTx = zoomState.value.translateX;
                    startTy = zoomState.value.translateY;
                    (this.container as any)._touchStartY = touchStartY;
                }
            }
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (isDragging && zoomState.value.isActive && e.touches.length === 1 && this.touchStartX !== null) {
                e.preventDefault();
                const dx = e.touches[0].clientX - this.touchStartX;
                const dy = e.touches[0].clientY - (this.container as any)._touchStartY;
                this.updateZoomPan(startTx + dx, startTy + dy);
            }
        }, { passive: false });

        this.container.addEventListener('touchend', (e) => {
            if (this.touchStartX !== null && !zoomState.value.isActive && isSingleMode.value && e.changedTouches.length === 1) {
                const diffX = e.changedTouches[0].clientX - this.touchStartX;
                if (diffX > 50 && currentPage.value > 0) {
                    this.pageFlipAdapter.turnToPrevPage();
                } else if (diffX < -50 && currentPage.value < totalPages.value - 1) {
                    this.pageFlipAdapter.turnToNextPage();
                }
            }
            this.touchStartX = null;
            isDragging = false;
        }, { passive: true });
    }

    public zoomIn() {
        let newScale = zoomState.value.scale + 0.5;
        if (newScale > 3) newScale = 3;
        
        zoomState.value = { 
            ...zoomState.value, 
            isActive: newScale > 1, 
            scale: newScale 
        };
        if (newScale > 1) {
            this.container.style.cursor = 'grab';
        }
    }

    public zoomOut() {
        let newScale = zoomState.value.scale - 0.5;
        if (newScale <= 1) {
            newScale = 1;
            zoomState.value = { ...zoomState.value, isActive: false, translateX: 0, translateY: 0, scale: 1 };
            this.container.style.cursor = '';
        } else {
            zoomState.value = { ...zoomState.value, isActive: true, scale: newScale };
        }
    }

    private updateZoomPan(x: number, y: number) {
        zoomState.value = {
            ...zoomState.value,
            translateX: x,
            translateY: y
        };
    }

    public destroy() {
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
    }
}
