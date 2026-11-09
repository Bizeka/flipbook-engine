/** @license FlipbookEngine | SPDX-License-Identifier: AGPL-3.0-or-later */

export type FlipbookDrawingTool = 'highlight' | 'pen';
export type FlipbookDrawingToolName = FlipbookDrawingTool | 'eraser';

/** One freehand stroke. `page` is a zero-based logical page index; points are 0..1 of the page box. */
export interface FlipbookStroke {
    id: string;
    page: number;
    tool: FlipbookDrawingTool;
    color: string;
    /** 0..1 */
    opacity: number;
    /** Stroke width in CSS px at fit zoom. */
    width: number;
    points: Array<[number, number]>;
    createdAt: number;
    updatedAt?: number;
    authorId?: string;
}

export interface FlipbookDrawingChanges { added: FlipbookStroke[]; removed: string[] }
export interface FlipbookDrawingSaveResult {
    /** Maps a client stroke id to the id the backend assigned. */
    ids?: Record<string, string>;
}

/** Host-owned storage. The engine never talks HTTP itself. Pages are zero-based. */
export interface FlipbookDrawingProvider {
    load(ctx: { documentId: string; pages: number[] }, signal: AbortSignal): Promise<FlipbookStroke[]>;
    save(ctx: { documentId: string }, changes: { added: FlipbookStroke[]; removed: string[] }, signal: AbortSignal): Promise<{ ids?: Record<string, string> }>;
    clearPage?(ctx: { documentId: string; page: number }, signal: AbortSignal): Promise<void>;
}

export interface FlipbookDrawingOptions {
    colors?: string[];
    defaultTool?: FlipbookDrawingToolName;
    defaultWidth?: number;
    defaultOpacity?: number;
    tools?: FlipbookDrawingToolName[];
}

export interface ResolvedFlipbookDrawingOptions {
    colors: string[];
    defaultTool: FlipbookDrawingToolName;
    defaultWidth: number | null;
    defaultOpacity: number | null;
    tools: FlipbookDrawingToolName[];
}

export const DEFAULT_DRAWING_COLORS = ['#ffeb3b', '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#212121'];
export const MAX_STROKE_POINTS = 5000;
export const SIMPLIFY_TOLERANCE = 0.001;
const MAX_WIDTH = 200;
const RDP_INPUT_LIMIT = 10000;
const MIN_OPACITY = 0.01;
const UNSAFE_COLOR = /[;{}<>"'\\]/;

const TOOLS: readonly FlipbookDrawingToolName[] = ['highlight', 'pen', 'eraser'];

/** `true` or an object turns drawing on; anything else leaves it off. */
export function resolveDrawingOptions(value: unknown): ResolvedFlipbookDrawingOptions | null {
    if (!value) return null;
    const config: FlipbookDrawingOptions = typeof value === 'object' ? value as FlipbookDrawingOptions : {};
    const colors = Array.isArray(config.colors) ? config.colors.map(cleanColor).filter((color): color is string => !!color) : [];
    const tools = Array.isArray(config.tools) ? config.tools.filter((tool, index, all) => TOOLS.includes(tool) && all.indexOf(tool) === index) : [];
    const allowed = tools.length ? tools : TOOLS.slice();
    const defaultTool = config.defaultTool && allowed.includes(config.defaultTool) ? config.defaultTool : allowed[0];
    return {
        colors: colors.length ? colors : DEFAULT_DRAWING_COLORS.slice(),
        defaultTool,
        defaultWidth: finite(config.defaultWidth) && config.defaultWidth > 0 ? Math.min(MAX_WIDTH, config.defaultWidth) : null,
        defaultOpacity: finite(config.defaultOpacity) ? clamp(config.defaultOpacity, MIN_OPACITY, 1) : null,
        tools: allowed
    };
}

function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
export function cleanColor(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const color = value.trim();
    return color && color.length <= 64 && !UNSAFE_COLOR.test(color) ? color : null;
}

/** Default width and opacity for a tool; a drawing config may override them. */
export function strokeDefaults(tool: FlipbookDrawingTool, options?: ResolvedFlipbookDrawingOptions | null): { width: number; opacity: number } {
    const base = tool === 'highlight' ? { width: 15, opacity: 0.5 } : { width: 3, opacity: 1 };
    return { width: options?.defaultWidth ?? base.width, opacity: options?.defaultOpacity ?? base.opacity };
}

/**
 * Validates and normalises a stroke from the host, the user or storage. Returns null when it cannot be drawn.
 * Coordinates are clamped to 0..1, width and opacity to sane ranges, points are capped, unknown fields are dropped.
 * Missing `id`, `createdAt`, `width` and `opacity` are filled from `defaults`.
 */
export function normalizeStroke(raw: unknown, defaults: { id?: () => string; now?: () => number; options?: ResolvedFlipbookDrawingOptions | null } = {}): FlipbookStroke | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as Record<string, unknown>;
    const page = value.page;
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 0) return null;
    const tool = value.tool;
    if (tool !== 'highlight' && tool !== 'pen') return null;
    const color = cleanColor(value.color);
    if (!color || !Array.isArray(value.points) || value.points.length === 0) return null;
    const points: Array<[number, number]> = [];
    for (const point of value.points) {
        if (!Array.isArray(point) || !finite(point[0]) || !finite(point[1])) return null;
        points.push([clamp(point[0], 0, 1), clamp(point[1], 0, 1)]);
    }
    const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : defaults.id?.();
    if (!id) return null;
    const fallback = strokeDefaults(tool, defaults.options);
    const stroke: FlipbookStroke = {
        id,
        page,
        tool,
        color,
        opacity: finite(value.opacity) ? clamp(value.opacity, MIN_OPACITY, 1) : fallback.opacity,
        width: finite(value.width) && value.width > 0 ? Math.min(MAX_WIDTH, value.width) : fallback.width,
        points: points.length > MAX_STROKE_POINTS ? simplifyPoints(points, SIMPLIFY_TOLERANCE, MAX_STROKE_POINTS) : points,
        createdAt: finite(value.createdAt) ? value.createdAt : (defaults.now?.() ?? Date.now())
    };
    if (finite(value.updatedAt)) stroke.updatedAt = value.updatedAt;
    if (typeof value.authorId === 'string' && value.authorId) stroke.authorId = value.authorId;
    return stroke;
}

function distanceToSegment(point: [number, number], a: [number, number], b: [number, number]): number {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);
    const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point[0] - (a[0] + t * dx), point[1] - (a[1] + t * dy));
}

/**
 * Ramer-Douglas-Peucker simplification (iterative, so long strokes cannot overflow the stack). The first and last
 * point are always kept. When `maxPoints` is given and the result is still longer, the tolerance is doubled until it fits.
 */
export function simplifyPoints(points: Array<[number, number]>, tolerance = SIMPLIFY_TOLERANCE, maxPoints = Infinity): Array<[number, number]> {
    if (points.length <= 2) return points.map((point) => [point[0], point[1]]);
    if (Number.isFinite(maxPoints) && points.length > RDP_INPUT_LIMIT) {
        // Worst-case RDP is quadratic, so absurdly long input is thinned evenly first.
        const stride = Math.ceil(points.length / RDP_INPUT_LIMIT);
        points = points.filter((_, index) => index % stride === 0 || index === points.length - 1);
    }
    let epsilon = Math.max(0, tolerance);
    for (let attempt = 0; attempt < 32; attempt++) {
        const result = rdp(points, epsilon);
        if (result.length <= maxPoints) return result;
        epsilon = epsilon > 0 ? epsilon * 2 : SIMPLIFY_TOLERANCE;
    }
    return rdp(points, 1);
}

function rdp(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack: Array<[number, number]> = [[0, points.length - 1]];
    while (stack.length) {
        const [start, end] = stack.pop()!;
        let farthest = -1;
        let max = epsilon;
        for (let index = start + 1; index < end; index++) {
            const distance = distanceToSegment(points[index], points[start], points[end]);
            if (distance > max) { max = distance; farthest = index; }
        }
        if (farthest !== -1) {
            keep[farthest] = 1;
            stack.push([start, farthest], [farthest, end]);
        }
    }
    const result: Array<[number, number]> = [];
    points.forEach((point, index) => { if (keep[index]) result.push([point[0], point[1]]); });
    return result;
}

/** Simplifies a finished stroke (call on pointer-up). */
export function simplifyStroke(stroke: FlipbookStroke, tolerance = SIMPLIFY_TOLERANCE): FlipbookStroke {
    return { ...stroke, points: simplifyPoints(stroke.points, tolerance) };
}

/** The tool state the pointer layer draws with. The eraser keeps colour, width and opacity so switching back is lossless. */
export interface FlipbookDrawingToolState {
    tool: FlipbookDrawingToolName;
    color: string;
    width: number;
    opacity: number;
}

/** Initial tool state for a drawing config: default tool, first colour, and that tool's default width and opacity. */
export function initialDrawingTool(options: ResolvedFlipbookDrawingOptions): FlipbookDrawingToolState {
    const tool = options.defaultTool;
    const defaults = strokeDefaults(tool === 'eraser' ? 'highlight' : tool, options);
    return { tool, color: options.colors[0], width: defaults.width, opacity: defaults.opacity };
}

/**
 * Applies a partial tool change. Invalid values are ignored. Switching to another drawing tool without an explicit
 * width or opacity takes that tool's defaults. A tool the config does not allow is ignored.
 */
export function mergeDrawingTool(current: FlipbookDrawingToolState, change: Partial<FlipbookDrawingToolState> | null | undefined, options: ResolvedFlipbookDrawingOptions | null): FlipbookDrawingToolState {
    if (!change || typeof change !== 'object') return current;
    const next = { ...current };
    const allowed = options?.tools ?? TOOLS;
    if (change.tool && TOOLS.includes(change.tool) && allowed.includes(change.tool)) next.tool = change.tool;
    const color = cleanColor(change.color);
    if (color) next.color = color;
    const switched = next.tool !== current.tool && next.tool !== 'eraser';
    const defaults = switched ? strokeDefaults(next.tool as FlipbookDrawingTool, options) : null;
    if (finite(change.width) && change.width > 0) next.width = Math.min(MAX_WIDTH, change.width);
    else if (defaults) next.width = defaults.width;
    if (finite(change.opacity)) next.opacity = clamp(change.opacity, MIN_OPACITY, 1);
    else if (defaults) next.opacity = defaults.opacity;
    return next;
}

/** Maps a pointer position to 0..1 of a page box (clamped). Returns null for an empty box. */
export function pointToPage(clientX: number, clientY: number, box: { left: number; top: number; width: number; height: number }): [number, number] | null {
    if (!(box.width > 0) || !(box.height > 0)) return null;
    return [clamp((clientX - box.left) / box.width, 0, 1), clamp((clientY - box.top) / box.height, 0, 1)];
}

/** SVG path data for a stroke in 0..1 page space. A single point becomes a zero-length segment, drawn as a dot by round caps. */
export function strokePathData(points: ReadonlyArray<readonly [number, number]>): string {
    if (!points.length) return '';
    const round = (value: number) => Math.round(value * 100000) / 100000;
    const first = points[0];
    let data = 'M' + round(first[0]) + ' ' + round(first[1]);
    if (points.length === 1) return data + 'L' + round(first[0]) + ' ' + round(first[1]);
    for (let index = 1; index < points.length; index++) data += 'L' + round(points[index][0]) + ' ' + round(points[index][1]);
    return data;
}

/**
 * True when (x, y), both 0..1 of the page box, lies within `tolerancePx` of the stroke's polyline or its own half width.
 * Distances are measured in pixels of the given page box so a tall page does not make the hit area an ellipse.
 */
export function hitTestStroke(stroke: Pick<FlipbookStroke, 'points' | 'width'>, x: number, y: number, box: { width: number; height: number }, tolerancePx = 0): boolean {
    const reach = stroke.width / 2 + Math.max(0, tolerancePx);
    const px = x * box.width;
    const py = y * box.height;
    const pixel = (point: [number, number]): [number, number] => [point[0] * box.width, point[1] * box.height];
    const points = stroke.points;
    if (!points.length) return false;
    if (points.length === 1) return Math.hypot(px - pixel(points[0])[0], py - pixel(points[0])[1]) <= reach;
    for (let index = 1; index < points.length; index++) {
        if (distanceToSegment([px, py], pixel(points[index - 1]), pixel(points[index])) <= reach) return true;
    }
    return false;
}

/** The topmost (latest drawn) stroke under the point, or null. */
export function strokeAtPoint(strokes: ReadonlyArray<FlipbookStroke>, x: number, y: number, box: { width: number; height: number }, tolerancePx = 0): FlipbookStroke | null {
    for (let index = strokes.length - 1; index >= 0; index--) {
        if (hitTestStroke(strokes[index], x, y, box, tolerancePx)) return strokes[index];
    }
    return null;
}
