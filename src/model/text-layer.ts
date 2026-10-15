/** Backend-owned text in logical-page, top-left, normalized coordinates. */
export interface FlipbookTextRun {
    text: string;
    start: number;
    x: number;
    y: number;
    width: number;
    height: number;
    direction?: 'ltr' | 'rtl';
}

export interface FlipbookTextPage {
    schemaVersion: 1;
    pageIndex: number;
    /** Immutable source/extraction generation, shared with the image manifest. */
    revision: string;
    text: string;
    runs: FlipbookTextRun[];
}

export type FlipbookTextLayerProvider = (pageIndex: number, signal: AbortSignal) => Promise<FlipbookTextPage | null>;

/** Reject invalid host data before creating DOM or CSS. Run offsets use UTF-16 code units. */
export function validateTextPage(page: FlipbookTextPage, index: number): FlipbookTextPage {
    if (page.schemaVersion !== 1 || page.pageIndex !== index || typeof page.revision !== 'string' || !page.revision ||
        typeof page.text !== 'string' || page.text.length > 100000 || !Array.isArray(page.runs) || page.runs.length > 20000)
        throw new Error('Invalid text page');
    let end = 0;
    for (const run of page.runs) {
        if (typeof run.text !== 'string' || !run.text.length || !Number.isInteger(run.start) || run.start < end ||
            page.text.slice(run.start, run.start + run.text.length) !== run.text ||
            ![run.x, run.y, run.width, run.height].every(Number.isFinite) || run.x < 0 || run.y < 0 ||
            run.width <= 0 || run.height <= 0 || run.x + run.width > 1.000001 || run.y + run.height > 1.000001 ||
            (run.direction !== undefined && run.direction !== 'ltr' && run.direction !== 'rtl')) throw new Error('Invalid text run');
        end = run.start + run.text.length;
    }
    return { ...page, runs: page.runs.map(run => ({ ...run })) };
}
