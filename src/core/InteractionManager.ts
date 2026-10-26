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
            if (this.store.textSelection.value || this.store.placingNote.value || (e.target as Element).closest('button,input,textarea,select,[contenteditable=true]')) return;
            if (e.ctrlKey || e.metaKey) { e.preventDefault(); e.deltaY < 0 ? this.zoomIn() : this.zoomOut(); return; }
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
            if (e.button !== 0 || this.store.textSelection.value || this.store.placingNote.value || (e.target as Element).closest('button,a,input,textarea,select,[contenteditable=true]')) return;
            if (this.store.zoomState.value.isActive) {
                e.preventDefault(); e.stopPropagation();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialTx = this.store.zoomState.value.translateX;
                initialTy = this.store.zoomState.value.translateY;
                this.container.style.cursor = 'grabbing';
            }
        }, { capture: true, signal: this.listenerAbortController.signal });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.store.zoomState.value.isActive) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.updateZoomPan(initialTx + dx, initialTy + dy);
        }, { capture: true, signal: this.listenerAbortController.signal });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.cursor = this.store.zoomState.value.isActive ? 'grab' : '';
            }
        }, { capture: true, signal: this.listenerAbortController.signal });
    }

    private bindTouch() {
        let startY = 0, startTx = 0, startTy = 0, pinchDistance = 0, pinchScale = 1;
        let lastTapTime = 0, lastTapX = 0, lastTapY = 0;
        let pinchX = 0, pinchY = 0, pinchCenterX = 0, pinchCenterY = 0, wasPinch = false;
        const signal = this.listenerAbortController.signal;
        const interactive = (target: EventTarget | null) => (target as Element)?.closest('button,a,input,textarea,select,[contenteditable="true"]');
        this.container.addEventListener('touchstart', event => {
            if (interactive(event.target) || this.store.textSelection.value || this.store.placingNote.value || this.store.pendingAnnotation.value || this.store.activeAnnotationId.value) { this.touchStartX = null; return; }
            if (event.touches.length === 2) {
                const [a, b] = Array.from(event.touches);
                const box = this.container.parentElement!.getBoundingClientRect();
                pinchDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                pinchScale = this.store.zoomState.value.scale;
                pinchX = (a.clientX + b.clientX) / 2; pinchY = (a.clientY + b.clientY) / 2;
                pinchCenterX = box.left + box.width / 2; pinchCenterY = box.top + box.height / 2;
                startTx = this.store.zoomState.value.translateX; startTy = this.store.zoomState.value.translateY;
                wasPinch = true; this.touchStartX = null;
                event.stopPropagation(); if (event.cancelable) event.preventDefault();
            } else if (event.touches.length === 1) {
                wasPinch = false; pinchDistance = 0;
                this.touchStartX = event.touches[0].clientX; startY = event.touches[0].clientY;
                startTx = this.store.zoomState.value.translateX; startTy = this.store.zoomState.value.translateY;
                if (this.store.zoomState.value.isActive) event.stopPropagation();
            }
        }, { capture: true, passive: false, signal });
        this.container.addEventListener('touchmove', event => {
            if (interactive(event.target) || this.store.placingNote.value) return;
            if (event.touches.length === 2 && pinchDistance > 0) {
                const [a, b] = Array.from(event.touches);
                const scale = Math.max(1, Math.min(5, pinchScale * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinchDistance));
                const ratio = scale / pinchScale;
                const pan = scale > 1 ? this.clampPan(
                    startTx + (pinchX - pinchCenterX) * (1 - ratio) + (a.clientX + b.clientX) / 2 - pinchX,
                    startTy + (pinchY - pinchCenterY) * (1 - ratio) + (a.clientY + b.clientY) / 2 - pinchY, scale) : { x: 0, y: 0 };
                this.store.zoomState.value = { ...this.store.zoomState.value, scale, isActive: scale > 1, translateX: pan.x, translateY: pan.y };
                event.stopPropagation(); if (event.cancelable) event.preventDefault();
            } else if (!wasPinch && this.store.zoomState.value.isActive && this.touchStartX !== null && event.touches.length === 1) {
                this.updateZoomPan(startTx + event.touches[0].clientX - this.touchStartX, startTy + event.touches[0].clientY - startY);
                event.stopPropagation(); if (event.cancelable) event.preventDefault();
            }
        }, { capture: true, passive: false, signal });
        const finish = (event: TouchEvent) => {
            if (!wasPinch && !this.store.placingNote.value && !this.store.pendingAnnotation.value && !this.store.activeAnnotationId.value && this.touchStartX !== null && !this.store.zoomState.value.isActive && this.store.isSingleMode.value && event.changedTouches.length === 1) {
                const dx = event.changedTouches[0].clientX - this.touchStartX, dy = event.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) dx > 0 ? this.pageFlipAdapter.turnToPrevPage() : this.pageFlipAdapter.turnToNextPage();
            }
            const tap = event.changedTouches[0];
            if (!wasPinch && tap && !event.touches.length && this.touchStartX !== null && !interactive(event.target) && !this.store.placingNote.value && !this.store.pendingAnnotation.value && !this.store.activeAnnotationId.value && !this.store.textSelection.value
                && Math.hypot(tap.clientX - this.touchStartX, tap.clientY - startY) < 10) {
                const now = Date.now();
                if (now - lastTapTime < 300 && Math.hypot(tap.clientX - lastTapX, tap.clientY - lastTapY) < 30) { lastTapTime = 0; this.toggleZoomAt(tap.clientX, tap.clientY); event.stopPropagation(); }
                else { lastTapTime = now; lastTapX = tap.clientX; lastTapY = tap.clientY; }
            }
            if (wasPinch || this.store.zoomState.value.isActive) event.stopPropagation();
            this.touchStartX = null; if (!event.touches.length) { wasPinch = false; pinchDistance = 0; }
        };
        // Safari reports trackpad and some touch pinches only as gesture events.
        let gestureStart = 1;
        this.container.addEventListener('gesturestart', event => { gestureStart = this.store.zoomState.value.scale; event.preventDefault(); }, { signal });
        this.container.addEventListener('gesturechange', event => {
            event.preventDefault();
            const scale = Math.max(1, Math.min(5, gestureStart * ((event as Event & { scale?: number }).scale ?? 1)));
            const pan = scale > 1 ? this.clampPan(this.store.zoomState.value.translateX, this.store.zoomState.value.translateY, scale) : { x: 0, y: 0 };
            this.store.zoomState.value = { ...this.store.zoomState.value, scale, isActive: scale > 1, translateX: pan.x, translateY: pan.y };
        }, { signal });
        this.container.addEventListener('touchend', finish, { capture: true, passive: true, signal });
        this.container.addEventListener('touchcancel', () => { this.touchStartX = null; wasPinch = false; pinchDistance = 0; }, { capture: true, signal });
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
            const pan = this.clampPan(this.store.zoomState.value.translateX, this.store.zoomState.value.translateY, newScale);
            this.store.zoomState.value = { ...this.store.zoomState.value, isActive: true, scale: newScale, translateX: pan.x, translateY: pan.y };
        }
    }

    /** Keeps the zoomed page overlapping the viewport; skipped while the container has no size. */
    private clampPan(x: number, y: number, scale: number): { x: number; y: number } {
        const width = this.container.offsetWidth, height = this.container.offsetHeight;
        if (!width || !height) return { x, y };
        const limitX = (scale - 1) * width / 2, limitY = (scale - 1) * height / 2;
        return { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
    }

    private updateZoomPan(x: number, y: number) {
        const pan = this.clampPan(x, y, this.store.zoomState.value.scale);
        this.store.zoomState.value = {
            ...this.store.zoomState.value,
            translateX: pan.x,
            translateY: pan.y
        };
    }

    /** Moves the zoomed page by a pixel offset; ignored when not zoomed. */
    public panBy(dx: number, dy: number) {
        const zoom = this.store.zoomState.value;
        if (zoom.isActive) this.updateZoomPan(zoom.translateX + dx, zoom.translateY + dy);
    }

    /** Zooms to 2.5x around a viewport point, or back to fit when already zoomed. */
    private toggleZoomAt(clientX: number, clientY: number) {
        if (this.store.zoomState.value.isActive) {
            this.store.zoomState.value = { ...this.store.zoomState.value, isActive: false, translateX: 0, translateY: 0, scale: 1 };
            return;
        }
        const box = (this.container.parentElement ?? this.container).getBoundingClientRect();
        const scale = 2.5;
        const pan = this.clampPan((box.left + box.width / 2 - clientX) * (scale - 1), (box.top + box.height / 2 - clientY) * (scale - 1), scale);
        this.store.zoomState.value = { ...this.store.zoomState.value, isActive: true, scale, translateX: pan.x, translateY: pan.y };
    }

    public destroy() {
        this.listenerAbortController.abort();
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
    }
}







