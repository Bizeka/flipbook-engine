/**
 * Small LRU cache for rendered PDF page data URLs.
 * The cache is intentionally owned by one PdfRenderer instance so pages from
 * different engine instances or documents can never be mixed.
 */
export class PdfRenderCache {
    private readonly entries = new Map<number, string>();
    private hits = 0;
    private misses = 0;

    constructor(private readonly maxEntries: number = 32) {
        if (!Number.isInteger(maxEntries) || maxEntries < 0) {
            throw new RangeError('PDF render cache size must be a non-negative integer.');
        }
    }

    public get(pageNumber: number): string | undefined {
        const value = this.entries.get(pageNumber);
        if (value === undefined) {
            this.misses++;
            return undefined;
        }
        this.hits++;
        this.entries.delete(pageNumber);
        this.entries.set(pageNumber, value);
        return value;
    }

    public set(pageNumber: number, dataUrl: string): void {
        if (this.maxEntries === 0 || !dataUrl) return;
        this.entries.delete(pageNumber);
        this.entries.set(pageNumber, dataUrl);
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value as number | undefined;
            if (oldest === undefined) break;
            this.entries.delete(oldest);
        }
    }

    public clear(): void {
        this.entries.clear();
        this.hits = 0;
        this.misses = 0;
    }

    public get size(): number {
        return this.entries.size;
    }

    public getStats(): { size: number; maxEntries: number; hits: number; misses: number } {
        return { size: this.size, maxEntries: this.maxEntries, hits: this.hits, misses: this.misses };
    }
}
