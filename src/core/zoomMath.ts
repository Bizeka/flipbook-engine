/**
 * Pure pinch and pan math for the reader's zoom transform.
 *
 * The zoomed element is drawn as `translate(x, y) scale(scale)` around its own centre, so a point at
 * offset `u` from the untransformed centre `c` appears at `c + t + scale * u` on screen.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

export interface ZoomView { scale: number; x: number; y: number; }
export interface ZoomPoint { x: number; y: number; }
/** Untransformed centre of the zoomed element in client coordinates, and its layout size. */
export interface ZoomFrame { cx: number; cy: number; width: number; height: number; }

/** Fingers and view at the moment the finger count last changed; moves are measured from here. */
export interface ZoomBaseline { view: ZoomView; mid: ZoomPoint; distance: number; fingers: number; }

export function clampZoom(scale: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
}

/** Keeps the zoomed element covering its own box; skipped while the element has no size. */
export function clampPan(x: number, y: number, scale: number, width: number, height: number): ZoomPoint {
    if (!width || !height) return { x, y };
    const limitX = (scale - 1) * width / 2, limitY = (scale - 1) * height / 2;
    return { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
}

/** Starts a gesture segment from the current view and the first one or two fingers. */
export function zoomBaseline(view: ZoomView, points: readonly ZoomPoint[]): ZoomBaseline {
    const [a, b] = points;
    if (!a) return { view, mid: { x: 0, y: 0 }, distance: 0, fingers: 0 };
    if (!b) return { view, mid: { x: a.x, y: a.y }, distance: 0, fingers: 1 };
    return { view, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y), fingers: 2 };
}

/**
 * The view that keeps the content point that was under the fingers at the baseline under the fingers now.
 * Two fingers pinch and pan together; one finger pans a zoomed view. Scale is clamped to 1..5 and the
 * offset to the element's box, so at the limits the content stops instead of following further.
 */
export function zoomFollow(base: ZoomBaseline, points: readonly ZoomPoint[], frame: ZoomFrame): ZoomView {
    const next = zoomBaseline(base.view, points);
    if (!next.fingers || next.fingers !== base.fingers) return base.view;
    const scale = next.fingers === 2 && base.distance > 0 ? clampZoom(base.view.scale * next.distance / base.distance) : base.view.scale;
    if (scale <= MIN_ZOOM) return { scale: MIN_ZOOM, x: 0, y: 0 };
    const ratio = scale / base.view.scale;
    const x = next.mid.x - frame.cx - ratio * (base.mid.x - frame.cx - base.view.x);
    const y = next.mid.y - frame.cy - ratio * (base.mid.y - frame.cy - base.view.y);
    const pan = clampPan(x, y, scale, frame.width, frame.height);
    return { scale, x: pan.x, y: pan.y };
}

/** Zooms to `scale` keeping the client point under itself, starting from the unzoomed view. */
export function zoomAt(point: ZoomPoint, scale: number, frame: ZoomFrame): ZoomView {
    const pan = clampPan((frame.cx - point.x) * (scale - 1), (frame.cy - point.y) * (scale - 1), scale, frame.width, frame.height);
    return { scale, x: pan.x, y: pan.y };
}
