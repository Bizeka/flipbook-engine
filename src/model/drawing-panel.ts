import type { FlipbookDrawingTool, FlipbookDrawingToolName, FlipbookDrawingToolState } from './drawings';

/** Opacity slider range, in percent. */
export const OPACITY_MIN_PERCENT = 10;
export const OPACITY_MAX_PERCENT = 100;

/** Width slider range per mode, in CSS px at fit zoom. */
export const WIDTH_LIMITS: Record<FlipbookDrawingTool, { min: number; max: number }> = {
    highlight: { min: 4, max: 48 },
    pen: { min: 1, max: 16 }
};

export type DrawingPanelAction =
    | { type: 'mode'; mode: FlipbookDrawingTool }
    | { type: 'color'; color: string }
    | { type: 'opacity'; percent: number }
    | { type: 'width'; value: number }
    | { type: 'eraser'; on: boolean };

export interface DrawingPanelView {
    /** The drawing mode shown as selected: the current tool, or the last one while the eraser is on. */
    mode: FlipbookDrawingTool;
    eraser: boolean;
    color: string;
    opacityPercent: number;
    width: number;
    widthMin: number;
    widthMax: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function opacityToPercent(opacity: number): number {
    if (!Number.isFinite(opacity)) return OPACITY_MAX_PERCENT;
    return clamp(Math.round(opacity * 100), OPACITY_MIN_PERCENT, OPACITY_MAX_PERCENT);
}

export function percentToOpacity(percent: number): number {
    if (!Number.isFinite(percent)) return 1;
    return clamp(Math.round(percent), OPACITY_MIN_PERCENT, OPACITY_MAX_PERCENT) / 100;
}

export function clampWidth(mode: FlipbookDrawingTool, width: number): number {
    const { min, max } = WIDTH_LIMITS[mode];
    return Number.isFinite(width) ? clamp(Math.round(width), min, max) : min;
}

/** What the panel shows for a tool state. `last` is the drawing mode to show while the eraser is active. */
export function panelView(state: FlipbookDrawingToolState, last: FlipbookDrawingTool = 'highlight'): DrawingPanelView {
    const eraser = state.tool === 'eraser';
    const mode: FlipbookDrawingTool = eraser ? last : state.tool as FlipbookDrawingTool;
    const limits = WIDTH_LIMITS[mode];
    return { mode, eraser, color: state.color, opacityPercent: opacityToPercent(state.opacity), width: clampWidth(mode, state.width), widthMin: limits.min, widthMax: limits.max };
}

/**
 * Turns one panel action into the partial tool state for `setDrawingTool`. Choosing a colour, a mode or a slider value
 * while the eraser is on leaves the eraser and goes back to the last drawing mode.
 */
export function panelChange(state: FlipbookDrawingToolState, action: DrawingPanelAction, last: FlipbookDrawingTool = 'highlight'): Partial<FlipbookDrawingToolState> {
    const back: FlipbookDrawingToolName = state.tool === 'eraser' ? last : state.tool;
    switch (action.type) {
        case 'mode': return { tool: action.mode };
        case 'color': return { tool: back, color: action.color };
        case 'opacity': return { tool: back, opacity: percentToOpacity(action.percent) };
        case 'width': return { tool: back, width: clampWidth(back as FlipbookDrawingTool, action.value) };
        case 'eraser': return { tool: action.on ? 'eraser' : last };
    }
}
