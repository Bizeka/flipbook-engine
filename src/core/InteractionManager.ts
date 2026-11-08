/**
 * @license FlipbookEngine
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


import { computed, effect } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import type { PageFlipAdapter } from '../adapters/PageFlipAdapter';
import { clampPan, zoomAt, zoomBaseline, zoomFollow, type ZoomBaseline, type ZoomFrame, type ZoomPoint, type ZoomView } from './zoomMath';

export class InteractionManager {
    private container: HTMLElement;
    private pageFlipAdapter: PageFlipAdapter;
    private store: FlipbookStore;
    private touchStartX: number | null = null;
    private gesturing = false;
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
        const active = computed(() => this.store.zoomState.value.isActive);
        this.unsubs.push(
            // Runs only when zoom turns on or off, not on every gesture frame.
            effect(() => {
                this.store.isZoomed.value = active.value;
                // The browser must not pinch-zoom or pan the page itself while the reader handles the gesture.
                this.container.style.touchAction = active.value ? 'none' : 'pan-y';
            }),
            // The one per-frame write: a transform, which the compositor applies without layout or repaint.
            effect(() => {
                const zoom = this.store.zoomState.value;
                this.container.style.transition = zoom.isActive || this.gesturing ? 'none' : 'transform 0.3s ease';
                this.container.style.transform = zoom.isActive ? `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})` : '';
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

    /**
     * While fingers zoom or pan, the element keeps one composited layer (will-change), so scale steps
     * reuse its texture instead of re-rasterising the pages every frame; dropping it at the end
     * re-rasterises once at the final scale.
     */
    private setGesturing(on: boolean) {
        if (this.gesturing === on) return;
        this.gesturing = on;
        this.container.style.willChange = on ? 'transform' : '';
        if (on) this.container.style.transition = 'none';
    }

    /** Untransformed centre and size of the zoomed element; read once per finger down, never per move. */
    private measureFrame(): ZoomFrame {
        const view = this.view();
        const box = this.container.getBoundingClientRect();
        return { cx: box.left + box.width / 2 - view.x, cy: box.top + box.height / 2 - view.y, width: this.container.offsetWidth, height: this.container.offsetHeight };
    }

    /** The view as drawn: an inactive zoom has no transform, whatever scale it holds. */
    private view(): ZoomView {
        const zoom = this.store.zoomState.peek();
        return zoom.isActive ? { scale: zoom.scale, x: zoom.translateX, y: zoom.translateY } : { scale: 1, x: 0, y: 0 };
    }

    private applyView(next: ZoomView) {
        const zoom = this.store.zoomState.peek();
        if (zoom.scale === next.scale && zoom.translateX === next.x && zoom.translateY === next.y && zoom.isActive === next.scale > 1) return;
        this.store.zoomState.value = { ...zoom, scale: next.scale, isActive: next.scale > 1, translateX: next.x, translateY: next.y };
    }

    private bindTouch() {
        let startY = 0, lastTapTime = 0, lastTapX = 0, lastTapY = 0;
        // tracking: the reader owns this gesture; multi: it has had two fingers, so it is never a tap or swipe.
        let tracking = false, multi = false, base: ZoomBaseline | null = null;
        let frame: ZoomFrame = { cx: 0, cy: 0, width: 0, height: 0 };
        const signal = this.listenerAbortController.signal;
        const interactive = (target: EventTarget | null) => (target as Element)?.closest('button,a,input,textarea,select,[contenteditable="true"]');
        const points = (touches: TouchList) => Array.from(touches).slice(0, 2).map((touch): ZoomPoint => ({ x: touch.clientX, y: touch.clientY }));
        const reset = () => { tracking = false; multi = false; base = null; this.touchStartX = null; this.setGesturing(false); };
        this.container.addEventListener('touchstart', event => {
            if (interactive(event.target) || this.store.textSelection.value || this.store.placingNote.value || this.store.pendingAnnotation.value || this.store.activeAnnotationId.value) {
                if (event.touches.length === 1) reset();
                this.touchStartX = null;
                return;
            }
            const count = event.touches.length;
            if (count === 1) { multi = false; this.touchStartX = event.touches[0].clientX; startY = event.touches[0].clientY; }
            else if (count >= 2) {
                // page-flip saw the first finger; drop its pending corner fold or swipe so the pinch cannot turn the page.
                if (!multi) this.pageFlipAdapter.cancelUserTouch?.();
                multi = true; this.touchStartX = null;
            }
            tracking = true;
            const zoomed = this.store.zoomState.peek().isActive;
            if (count >= 2 || zoomed) { this.setGesturing(true); frame = this.measureFrame(); }
            // Every finger change restarts the segment from the current view, so adding a finger never jumps.
            base = zoomBaseline(this.view(), points(event.touches));
            if (count >= 2 || zoomed) event.stopPropagation();
            if (count >= 2 && event.cancelable) event.preventDefault();
        }, { capture: true, passive: false, signal });
        this.container.addEventListener('touchmove', event => {
            if (!tracking || !base || interactive(event.target) || this.store.placingNote.value) return;
            const count = event.touches.length;
            const zoomed = this.store.zoomState.peek().isActive;
            // One unzoomed finger belongs to native scrolling and page-flip.
            if (count === 1 && !zoomed && !multi) return;
            const current = points(event.touches);
            if (current.length !== base.fingers) base = zoomBaseline(this.view(), current);
            else if (count >= 2 || zoomed) this.applyView(zoomFollow(base, current, frame));
            event.stopPropagation(); if (event.cancelable) event.preventDefault();
        }, { capture: true, passive: false, signal });
        const finish = (event: TouchEvent) => {
            const zoomed = this.store.zoomState.peek().isActive;
            if (tracking && !multi && !this.store.placingNote.value && !this.store.pendingAnnotation.value && !this.store.activeAnnotationId.value && this.touchStartX !== null && !zoomed && this.store.isSingleMode.value && event.changedTouches.length === 1) {
                const dx = event.changedTouches[0].clientX - this.touchStartX, dy = event.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) dx > 0 ? this.pageFlipAdapter.turnToPrevPage() : this.pageFlipAdapter.turnToNextPage();
            }
            const tap = event.changedTouches[0];
            let doubleTap: Touch | null = null;
            if (tracking && !multi && tap && !event.touches.length && this.touchStartX !== null && !interactive(event.target) && !this.store.placingNote.value && !this.store.pendingAnnotation.value && !this.store.activeAnnotationId.value && !this.store.textSelection.value
                && Math.hypot(tap.clientX - this.touchStartX, tap.clientY - startY) < 10) {
                const now = Date.now();
                if (now - lastTapTime < 300 && Math.hypot(tap.clientX - lastTapX, tap.clientY - lastTapY) < 30) { lastTapTime = 0; doubleTap = tap; event.stopPropagation(); }
                else { lastTapTime = now; lastTapX = tap.clientX; lastTapY = tap.clientY; }
            }
            if (multi || zoomed) event.stopPropagation();
            this.touchStartX = null;
            // The remaining finger carries on from where it is now; the last one ends the gesture.
            if (!event.touches.length) reset();
            else if (tracking) base = zoomBaseline(this.view(), points(event.touches));
            // After the reset, so zooming back out animates.
            if (doubleTap) this.toggleZoomAt(doubleTap.clientX, doubleTap.clientY);
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
        this.container.addEventListener('touchcancel', reset, { capture: true, signal });
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
        return clampPan(x, y, scale, this.container.offsetWidth, this.container.offsetHeight);
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
        this.applyView(zoomAt({ x: clientX, y: clientY }, 2.5, this.measureFrame()));
    }

    public destroy() {
        this.listenerAbortController.abort();
        this.unsubs.forEach(unsub => unsub());
        this.unsubs = [];
    }
}
