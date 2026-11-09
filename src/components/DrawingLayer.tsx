import { effect } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import { domSignal } from '../core/domSignal';
import { hitTestStroke, pointToPage, simplifyPoints, strokePathData, SIMPLIFY_TOLERANCE, type FlipbookDrawingToolState, type FlipbookStroke } from '../model/drawings';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Pages around the current one that keep their strokes in the DOM: the spread plus one spread on each side. */
const RENDER_BEHIND = 2;
const RENDER_AHEAD = 3;
/** Extra reach, in CSS px, around a stroke where the eraser still hits it. */
const ERASER_REACH = 8;
/** Pointer positions closer than this (CSS px) to the last one are dropped. */
const MIN_STEP = 0.75;
/** How long a pen counts as active after its last event, so a resting palm is not read as a finger. */
const PEN_ACTIVE_MS = 800;

export interface DrawingLayerProps {
    store: FlipbookStore;
    pageIndex: number;
    /** Called on pointer-up with the simplified points (0..1 of the page) and the tool the stroke was started with. */
    onStroke: (pageIndex: number, points: Array<[number, number]>, tool: FlipbookDrawingToolState) => void;
    onErase: (strokeId: string) => void;
    signal: AbortSignal;
}

/** Pointer bookkeeping shared by every layer of one reader session: touches, the pen, and the stroke in progress. */
interface InputSession { touches: Set<number>; penAt: number; cancel: (() => void) | null }
const sessions = new WeakMap<AbortSignal, InputSession>();

function sessionFor(root: HTMLElement, signal: AbortSignal, store: FlipbookStore): InputSession {
    const known = sessions.get(signal);
    if (known) return known;
    const session: InputSession = { touches: new Set(), penAt: -Infinity, cancel: null };
    sessions.set(signal, session);
    const doc = root.ownerDocument;
    const drop = (event: PointerEvent) => {
        if (event.pointerType === 'touch') session.touches.delete(event.pointerId);
        if (event.pointerType === 'pen') session.penAt = Date.now();
    };
    const listen = { capture: true, signal: domSignal(root, signal) } as const;
    doc.addEventListener('pointerdown', event => {
        if (event.pointerType === 'pen') session.penAt = Date.now();
        if (event.pointerType !== 'touch') return;
        session.touches.add(event.pointerId);
        // A second finger belongs to pinch zoom and pan: drop the stroke. The fingers already down never start one later.
        if (session.touches.size > 1) session.cancel?.();
    }, listen);
    doc.addEventListener('pointermove', event => { if (event.pointerType === 'pen') session.penAt = Date.now(); }, { ...listen, passive: true });
    doc.addEventListener('pointerup', drop, listen);
    doc.addEventListener('pointercancel', drop, listen);
    // The reader sees the second finger as a touch event too, which also covers a finger that lands outside any page.
    const forget = (event: TouchEvent) => { if (!event.touches.length) session.touches.clear(); };
    doc.addEventListener('touchend', forget, { ...listen, passive: true });
    doc.addEventListener('touchcancel', forget, { ...listen, passive: true });
    const stop = effect(() => { if (store.drawingCancel.value) session.cancel?.(); });
    signal.addEventListener('abort', stop, { once: true });
    return session;
}

function svgNode<K extends keyof SVGElementTagNameMap>(doc: Document, tag: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const name in attributes) node.setAttribute(name, attributes[name]);
    return node;
}

function styleStroke(path: SVGPathElement, stroke: Pick<FlipbookStroke, 'color' | 'width' | 'opacity'>) {
    path.setAttribute('stroke', stroke.color);
    path.setAttribute('stroke-width', String(stroke.width));
    path.setAttribute('stroke-opacity', String(stroke.opacity));
}

function signature(stroke: FlipbookStroke): string {
    const last = stroke.points[stroke.points.length - 1];
    return [stroke.tool, stroke.color, stroke.width, stroke.opacity, stroke.points.length, last?.[0], last?.[1]].join('|');
}

/**
 * One SVG layer per page. Strokes are drawn in 0..1 page space (`viewBox="0 0 1 1"`) with a non-scaling stroke width,
 * so they follow the page through zoom, single or double page and any image tier or PDF render. Highlights sit in
 * their own SVG that multiplies with the page; pens sit in a second, opaque one.
 */
export function DrawingLayer(props: DrawingLayerProps) {
    return <div class="bk-drawing-layer" aria-hidden="true" ref={(root: HTMLElement) => bindDrawingLayer(root, props)} />;
}

function bindDrawingLayer(root: HTMLElement, props: DrawingLayerProps) {
    const { store, pageIndex } = props;
    const doc = root.ownerDocument;
    const attributes = { viewBox: '0 0 1 1', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' };
    const highlightSvg = svgNode(doc, 'svg', { ...attributes, class: 'bk-drawing-svg bk-drawing-svg--highlight' });
    const penSvg = svgNode(doc, 'svg', { ...attributes, class: 'bk-drawing-svg bk-drawing-svg--pen' });
    const input = doc.createElement('div');
    input.className = 'bk-drawing-input';
    root.append(highlightSvg, penSvg, input);
    const svgFor = (tool: FlipbookStroke['tool']) => tool === 'highlight' ? highlightSvg : penSvg;
    const signal = domSignal(root, props.signal);

    // Rendering: keyed by stroke id; only pages near the current spread keep paths in the DOM.
    const rendered = new Map<string, { path: SVGPathElement; sig: string; tool: FlipbookStroke['tool'] }>();
    const render = () => {
        const current = store.currentPage.value;
        const near = pageIndex >= current - RENDER_BEHIND && pageIndex <= current + RENDER_AHEAD;
        const strokes = near ? store.drawingStrokes.value.get(pageIndex) ?? [] : [];
        const keep = new Set(strokes.map((stroke) => stroke.id));
        rendered.forEach((entry, id) => { if (!keep.has(id)) { entry.path.remove(); rendered.delete(id); } });
        for (const stroke of strokes) {
            const sig = signature(stroke);
            let entry = rendered.get(stroke.id);
            if (entry && entry.tool !== stroke.tool) { entry.path.remove(); entry = undefined; }
            if (!entry) {
                const path = svgNode(doc, 'path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', 'data-stroke-id': stroke.id });
                entry = { path, sig: '', tool: stroke.tool };
                rendered.set(stroke.id, entry);
            }
            if (entry.sig !== sig) {
                entry.path.setAttribute('d', strokePathData(stroke.points));
                styleStroke(entry.path, stroke);
                entry.sig = sig;
            }
            // Re-appending keeps the draw order of the store without tracking positions.
            svgFor(stroke.tool).appendChild(entry.path);
        }
    };
    let connected = false;
    const stopRender = effect(() => {
        // The single-page view rebuilds this element on a page change; stop once it has left the document.
        if (root.isConnected) connected = true; else if (connected) { stopRender(); return; }
        render();
    });
    signal.addEventListener('abort', stopRender, { once: true });

    // Input.
    const session = sessionFor(root, props.signal, store);
    interface Active { pointerId: number; tool: FlipbookDrawingToolState; box: DOMRect; points: Array<[number, number]>; last: [number, number]; preview: SVGPathElement | null }
    let active: Active | null = null;

    const release = () => {
        if (!active) return;
        active.preview?.remove();
        try { input.releasePointerCapture(active.pointerId); } catch { /* the capture may already be gone */ }
        active = null;
        if (session.cancel === cancel) session.cancel = null;
    };
    const cancel = () => release();

    const erase = (x: number, y: number, box: { width: number; height: number }) => {
        const strokes = store.drawingStrokes.value.get(pageIndex) ?? [];
        for (let index = strokes.length - 1; index >= 0; index--) {
            if (hitTestStroke(strokes[index], x, y, box, ERASER_REACH)) { props.onErase(strokes[index].id); return; }
        }
    };

    const add = (event: PointerEvent, state: Active) => {
        const point = pointToPage(event.clientX, event.clientY, state.box);
        if (!point) return;
        const px = event.clientX - state.box.left, py = event.clientY - state.box.top;
        if (state.points.length && Math.hypot(px - state.last[0], py - state.last[1]) < MIN_STEP) return;
        if (state.tool.tool === 'eraser') {
            // Sample along the move so a fast drag cannot jump over a thin stroke.
            const from = state.points[state.points.length - 1] ?? point;
            const steps = Math.max(1, Math.ceil(Math.hypot((point[0] - from[0]) * state.box.width, (point[1] - from[1]) * state.box.height) / 6));
            for (let step = 1; step <= steps; step++) erase(from[0] + (point[0] - from[0]) * step / steps, from[1] + (point[1] - from[1]) * step / steps, state.box);
            state.points = [point];
        } else {
            state.points.push(point);
            state.preview?.setAttribute('d', strokePathData(state.points));
        }
        state.last = [px, py];
    };

    const handled = (event: Event) => { if (event.cancelable) event.preventDefault(); event.stopPropagation(); };

    input.addEventListener('pointerdown', event => {
        const tool = store.drawingTool.value;
        if (!store.drawingMode.value || !tool) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (event.pointerType === 'touch') {
            // Palm rejection and multi-touch: a resting hand while the pen is in use, or more than one finger, never draws.
            if (Date.now() - session.penAt < PEN_ACTIVE_MS || session.touches.size > 1) { handled(event); return; }
        }
        if (active) return;
        const box = input.getBoundingClientRect();
        const point = pointToPage(event.clientX, event.clientY, box);
        if (!point) return;
        handled(event);
        try { input.setPointerCapture(event.pointerId); } catch { /* synthetic events have no live pointer */ }
        let preview: SVGPathElement | null = null;
        if (tool.tool !== 'eraser') {
            preview = svgNode(doc, 'path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', class: 'bk-drawing-preview' });
            styleStroke(preview, tool);
            svgFor(tool.tool).appendChild(preview);
        }
        active = { pointerId: event.pointerId, tool: { ...tool }, box, points: [], last: [0, 0], preview };
        session.cancel = cancel;
        add(event, active);
    });

    input.addEventListener('pointermove', event => {
        if (!active || event.pointerId !== active.pointerId) return;
        handled(event);
        const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
        for (const item of coalesced.length ? coalesced : [event]) add(item, active);
    });

    const finish = (event: PointerEvent) => {
        if (!active || event.pointerId !== active.pointerId) return;
        handled(event);
        const state = active;
        add(event, state);
        release();
        if (state.tool.tool !== 'eraser' && state.points.length) props.onStroke(pageIndex, simplifyPoints(state.points, SIMPLIFY_TOLERANCE), state.tool);
    };
    input.addEventListener('pointerup', finish);
    input.addEventListener('pointercancel', event => { if (active && event.pointerId === active.pointerId) release(); });

    // Legacy mouse and touch events still reach page-flip and the reader; while drawing they stop here.
    for (const name of ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'contextmenu']) {
        input.addEventListener(name, event => { if (store.drawingMode.value) handled(event); }, { signal });
    }
    input.addEventListener('touchmove', event => { if (store.drawingMode.value) handled(event); }, { passive: false, signal });
    signal.addEventListener('abort', release, { once: true });
}
