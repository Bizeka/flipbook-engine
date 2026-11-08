/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export type FlipbookImageTier = 'low' | 'normal' | 'large';

/** What the tier decision sees. `pageZoomed` is true only for a page that is on screen while the book is zoomed. */
export interface FlipbookImageTierContext {
    zoom: number;
    viewportWidth: number;
    narrow: boolean;
    pageZoomed: boolean;
}

export interface FlipbookImageTierOptions {
    /** Zoom levels above which the zoomed page uses `normal`, then `large`. Default `[1.05, 1.75]`. */
    zoomThresholds?: [number, number];
    /** Viewports at most this wide (CSS pixels) count as narrow and use `low` while unzoomed. Default `1024`. */
    narrowMaxWidth?: number;
    /** Overrides the built-in decision. Return nothing to keep the built-in tier. Functions cannot cross an iframe. */
    select?: (context: FlipbookImageTierContext) => FlipbookImageTier | undefined | null;
}

export interface ResolvedImageTiers {
    zoomThresholds: [number, number];
    narrowMaxWidth: number;
    select?: FlipbookImageTierOptions['select'];
}

export const DEFAULT_ZOOM_THRESHOLDS: [number, number] = [1.05, 1.75];
export const DEFAULT_NARROW_MAX_WIDTH = 1024;

/** `true` gives the defaults; `false`, `null` and `undefined` turn tiers off (null result). */
export function resolveImageTiers(value: boolean | FlipbookImageTierOptions | null | undefined): ResolvedImageTiers | null {
    if (!value) return null;
    const options: FlipbookImageTierOptions = value === true ? {} : value;
    const [low, high] = options.zoomThresholds ?? DEFAULT_ZOOM_THRESHOLDS;
    const valid = Number.isFinite(low) && Number.isFinite(high) && low >= 1 && high >= low;
    const narrow = options.narrowMaxWidth;
    return {
        zoomThresholds: valid ? [low, high] : DEFAULT_ZOOM_THRESHOLDS,
        narrowMaxWidth: typeof narrow === 'number' && Number.isFinite(narrow) && narrow > 0 ? narrow : DEFAULT_NARROW_MAX_WIDTH,
        select: typeof options.select === 'function' ? options.select : undefined
    };
}

const isTier = (value: unknown): value is FlipbookImageTier => value === 'low' || value === 'normal' || value === 'large';

/** The one decision shared by single page, double page and the lazy loader. Pure. */
export function chooseImageTier(config: ResolvedImageTiers, input: { zoom: number; viewportWidth: number; pageZoomed: boolean }): FlipbookImageTier {
    const narrow = input.viewportWidth <= config.narrowMaxWidth;
    const context: FlipbookImageTierContext = { zoom: input.zoom, viewportWidth: input.viewportWidth, narrow, pageZoomed: input.pageZoomed };
    if (config.select) {
        try {
            const chosen = config.select(context);
            if (isTier(chosen)) return chosen;
        } catch { /* a throwing host callback falls back to the built-in decision */ }
    }
    const [normalFrom, largeFrom] = config.zoomThresholds;
    if (input.pageZoomed && input.zoom > largeFrom) return 'large';
    if (input.pageZoomed && input.zoom > normalFrom) return 'normal';
    return narrow ? 'low' : 'normal';
}

/** The URL for a tier, falling back: large to normal, low to normal. */
export function pickTierSrc(page: { low?: string; normal: string; large?: string }, tier: FlipbookImageTier): string {
    if (tier === 'large') return page.large || page.normal;
    if (tier === 'low') return page.low || page.normal;
    return page.normal;
}
