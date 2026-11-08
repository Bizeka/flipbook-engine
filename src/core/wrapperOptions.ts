import type { FlipbookEngineOptions } from '../engine';

/**
 * Helpers shared by the React and Vue wrappers.
 *
 * A wrapper re-renders far more often than its options change. Re-applying every option on each render would
 * undo what the reader changed in the viewer (bookmarks, notes, single-page layout, the thumbnail rail) and
 * re-initialise the book whenever the host passes a new but equal `pages` array, so both are compared first.
 */

/** Equality for plain data: identical values, or arrays and plain objects whose members are equal. */
export function sameValue(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => sameValue(item, b[index]));
    if (a && b && typeof a === 'object' && typeof b === 'object' && Object.getPrototypeOf(a) === Object.prototype && Object.getPrototypeOf(b) === Object.prototype) {
        const keys = Object.keys(a as object);
        return keys.length === Object.keys(b as object).length && keys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
    }
    return false;
}

/**
 * The options in `next` whose value differs from `previous` (by identity). Options that disappeared from `next`
 * are not reported, matching `updateOptions`, which has no way to unset an option.
 */
export function changedOptions<T extends object>(previous: Partial<T> | null | undefined, next: T): Partial<T> {
    const changed: Partial<T> = {};
    for (const key of Object.keys(next) as Array<keyof T>) {
        if (!previous || !Object.is(previous[key], next[key])) changed[key] = next[key];
    }
    return changed;
}

/** A copy of plain data (arrays and plain objects), so a later in-place edit cannot hide behind the same reference. */
export function cloneData<T>(value: T): T {
    if (Array.isArray(value)) return value.map(cloneData) as unknown as T;
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)])) as T;
    }
    return value;
}

/**
 * Every engine option name. The Vue wrapper uses it to tell an option passed as a plain prop
 * (`:allowDownload="false"`) from an ordinary HTML attribute (`id`, `class`, `data-*`).
 * The check below fails to compile when an option is added to the engine without being listed here.
 */
export const OPTION_KEYS = [
    'textLayerProvider', 'textSelection', 'searchProvider', 'noteProvider', 'annotationProvider', 'optimisticNotes', 'noteEditor',
    'noteColors', 'noteGroups', 'noteGroupProvider', 'searchHighlightStyle', 'notePinSize', 'noteDocuments', 'allowDownload',
    'showShare', 'showThumbs', 'showToc', 'toc', 'showArrows', 'primaryColor', 'soundEnabled', 'soundUrl', 'flippingTime',
    'maxShadowOpacity', 'backgroundColor', 'backgroundImage', 'background', 'whiteLabel', 'watermarkUrl', 'theme', 'locale',
    'messages', 'className', 'cssVariables', 'onDownload', 'onShare', 'singleMode', 'isSingleMode', 'autoPlay', 'autoPlayInterval',
    'pdfRenderScale', 'pdfRenderQuality', 'pdfRenderFormat', 'pdfRenderConcurrency', 'pdfRenderCacheSize', 'pdfWorkerSrc', 'pageSource',
    'pdfPageMode', 'deepLink', 'startPage', 'rememberPage', 'bookmarks', 'notes', 'hotspots', 'annotations', 'plugins'
] as const satisfies readonly (keyof FlipbookEngineOptions)[];

type UnlistedOption = Exclude<keyof FlipbookEngineOptions, (typeof OPTION_KEYS)[number]>;
const everyOptionIsListed: [UnlistedOption] extends [never] ? true : never = true;
void everyOptionIsListed;

export const OPTION_KEY_SET: ReadonlySet<string> = new Set<string>(OPTION_KEYS);
