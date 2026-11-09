/** @license FlipbookEngine | SPDX-License-Identifier: AGPL-3.0-or-later */
import { createFeaturePlugin } from './feature';
import type { FlipbookPlugin } from './index';
import {
    normalizeStroke,
    type FlipbookDrawingProvider,
    type FlipbookStroke,
    type ResolvedFlipbookDrawingOptions
} from '../model/drawings';

export type FlipbookDrawingChangeAction = 'add' | 'remove' | 'clear' | 'undo' | 'redo' | 'load' | 'rollback';
export interface FlipbookDrawingChange { action: FlipbookDrawingChangeAction; pageIndex: number | null; pageNumber: number | null; strokes: FlipbookStroke[] }
export interface FlipbookDrawingError { code: 'load' | 'save' | 'clear' | 'storage'; message: string; pageIndex?: number; cause?: unknown }

export interface FlipbookDrawingControllerHost {
    documentId: string;
    getProvider(): FlipbookDrawingProvider | undefined;
    getStorage(): 'memory' | 'local';
    getOptions(): ResolvedFlipbookDrawingOptions | null;
    onChange(change: FlipbookDrawingChange): void;
    onError(error: FlipbookDrawingError): void;
    /** Delay before pending changes are saved. Default 800 ms. */
    saveDelay?: number;
    createId?(): string;
    now?(): number;
}

interface HistoryEntry { kind: 'add' | 'remove'; strokes: FlipbookStroke[] }

export const DEFAULT_DRAWING_SAVE_DELAY = 800;
const STORAGE_PREFIX = 'flipbook:drawings:';

function randomId(): string {
    const webCrypto = (globalThis as { crypto?: Crypto }).crypto;
    if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();
    return `stroke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function describe(error: unknown): string {
    return error instanceof Error && error.message ? error.message : 'Drawing request failed.';
}

/**
 * Keeps strokes per page. Strokes show at once (optimistic); a debounced, ordered save batches changes for the
 * provider and a failed batch rolls back. Without a provider strokes live in memory, or in localStorage when the host
 * asks for `drawingStorage: 'local'`. Loading is lazy per page. Saves are not cancelled by destroy, so a stroke drawn
 * just before the reader closes is still sent; loads are.
 */
export class FlipbookDrawingController {
    private readonly strokes = new Map<number, FlipbookStroke[]>();
    private readonly loaded = new Set<number>();
    private readonly loading = new Map<number, Promise<void>>();
    private readonly pendingAdded = new Map<string, FlipbookStroke>();
    private readonly pendingRemoved = new Set<string>();
    private undoStack: HistoryEntry[] = [];
    private redoStack: HistoryEntry[] = [];
    private queue: Promise<void> = Promise.resolve();
    private timer: ReturnType<typeof setTimeout> | null = null;
    private readonly loadAbort = new AbortController();
    private readonly saveSignal = new AbortController().signal;
    private storageRead = false;
    private destroyed = false;

    constructor(private readonly host: FlipbookDrawingControllerHost) {}

    private get makeId(): () => string { return this.host.createId ?? randomId; }

    /** Loads the given zero-based pages once; resolves when they are ready. */
    loadPages(pages: number[]): Promise<void> {
        if (this.destroyed) return Promise.resolve();
        const wanted = Array.from(new Set(pages.filter((page) => Number.isInteger(page) && page >= 0)));
        const provider = this.host.getProvider();
        if (!provider) {
            this.readStorage();
            wanted.forEach((page) => this.loaded.add(page));
            return Promise.resolve();
        }
        const waiting = wanted.filter((page) => this.loading.has(page)).map((page) => this.loading.get(page)!);
        const missing = wanted.filter((page) => !this.loaded.has(page) && !this.loading.has(page));
        if (missing.length) {
            const request = this.fetchPages(provider, missing);
            missing.forEach((page) => this.loading.set(page, request));
            waiting.push(request);
        }
        return Promise.all(waiting).then(() => undefined);
    }

    private async fetchPages(provider: FlipbookDrawingProvider, pages: number[]): Promise<void> {
        const signal = this.loadAbort.signal;
        try {
            const result = await provider.load({ documentId: this.host.documentId, pages: pages.slice() }, signal);
            if (signal.aborted) return;
            const byPage = new Map<number, FlipbookStroke[]>(pages.map((page) => [page, []]));
            for (const raw of Array.isArray(result) ? result : []) {
                const stroke = normalizeStroke(raw, { options: this.host.getOptions(), now: this.host.now });
                if (!stroke || !byPage.has(stroke.page) || this.pendingRemoved.has(stroke.id)) continue;
                byPage.get(stroke.page)!.push(stroke);
            }
            const loadedStrokes: FlipbookStroke[] = [];
            byPage.forEach((list, page) => {
                const known = new Set(list.map((stroke) => stroke.id));
                // Strokes drawn while the page was loading are kept after the stored ones.
                (this.strokes.get(page) ?? []).forEach((stroke) => { if (!known.has(stroke.id)) list.push(stroke); });
                this.strokes.set(page, list);
                this.loaded.add(page);
                loadedStrokes.push(...list);
            });
            this.host.onChange({ action: 'load', pageIndex: pages.length === 1 ? pages[0] : null, pageNumber: pages.length === 1 ? pages[0] + 1 : null, strokes: loadedStrokes });
        } catch (error) {
            if (!signal.aborted) this.host.onError({ code: 'load', message: describe(error), pageIndex: pages.length === 1 ? pages[0] : undefined, cause: error });
        } finally {
            pages.forEach((page) => this.loading.delete(page));
        }
    }

    getStrokes(page?: number): FlipbookStroke[] {
        const copy = (list: FlipbookStroke[]) => list.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => [point[0], point[1]] as [number, number]) }));
        if (page !== undefined) return copy(this.strokes.get(page) ?? []);
        return copy(Array.from(this.strokes.keys()).sort((a, b) => a - b).flatMap((key) => this.strokes.get(key)!));
    }

    canUndo(): boolean { return this.undoStack.length > 0; }
    canRedo(): boolean { return this.redoStack.length > 0; }

    /** Adds a stroke. Returns the stored stroke, or null when it is invalid. */
    add(raw: unknown): FlipbookStroke | null {
        if (this.destroyed) return null;
        const stroke = normalizeStroke(raw, { id: this.makeId, now: this.host.now, options: this.host.getOptions() });
        if (!stroke || this.find(stroke.id)) return null;
        this.insert([stroke]);
        this.undoStack.push({ kind: 'add', strokes: [stroke] });
        this.redoStack = [];
        this.host.onChange(this.change('add', stroke.page, [stroke]));
        this.afterLocalChange();
        return { ...stroke };
    }

    /** Removes one stroke by id. */
    remove(id: string): boolean {
        const found = this.find(id);
        if (!found) return false;
        this.detach([found]);
        this.undoStack.push({ kind: 'remove', strokes: [found] });
        this.redoStack = [];
        this.host.onChange(this.change('remove', found.page, [found]));
        this.afterLocalChange();
        return true;
    }

    /** Removes every stroke of a page, or of all known pages. Uses the provider's `clearPage` when it has one. */
    clear(page?: number): number {
        const pages = page === undefined ? Array.from(this.strokes.keys()) : [page];
        const removed = pages.flatMap((key) => this.strokes.get(key) ?? []);
        if (!removed.length) return 0;
        const provider = this.host.getProvider();
        const useClearPage = !!provider?.clearPage;
        this.detach(removed, useClearPage);
        this.undoStack.push({ kind: 'remove', strokes: removed });
        this.redoStack = [];
        this.host.onChange(this.change('clear', page ?? null, removed));
        if (useClearPage) this.enqueueClear(provider!, pages.filter((key) => removed.some((stroke) => stroke.page === key)), removed);
        this.afterLocalChange();
        return removed.length;
    }

    undo(): boolean { return this.step(this.undoStack, this.redoStack, 'undo'); }
    redo(): boolean { return this.step(this.redoStack, this.undoStack, 'redo'); }

    private step(from: HistoryEntry[], to: HistoryEntry[], action: 'undo' | 'redo'): boolean {
        if (this.destroyed) return false;
        const entry = from.pop();
        if (!entry) return false;
        // Undoing an add removes the strokes; undoing a remove brings them back. Redo is the mirror.
        const removeNow = (entry.kind === 'add') === (action === 'undo');
        const strokes = removeNow ? entry.strokes.filter((stroke) => this.find(stroke.id)) : entry.strokes.filter((stroke) => !this.find(stroke.id));
        if (removeNow) this.detach(strokes); else this.insert(strokes);
        to.push(entry);
        const page = strokes.length && strokes.every((stroke) => stroke.page === strokes[0].page) ? strokes[0].page : null;
        this.host.onChange(this.change(action, page, strokes));
        this.afterLocalChange();
        return true;
    }

    private change(action: FlipbookDrawingChangeAction, pageIndex: number | null, strokes: FlipbookStroke[]): FlipbookDrawingChange {
        return { action, pageIndex, pageNumber: pageIndex === null ? null : pageIndex + 1, strokes: strokes.map((stroke) => ({ ...stroke })) };
    }

    private find(id: string): FlipbookStroke | undefined {
        for (const list of this.strokes.values()) {
            const found = list.find((stroke) => stroke.id === id);
            if (found) return found;
        }
        return undefined;
    }

    private insert(strokes: FlipbookStroke[]): void {
        const track = !!this.host.getProvider();
        for (const stroke of strokes) {
            const list = this.strokes.get(stroke.page) ?? [];
            list.push(stroke);
            this.strokes.set(stroke.page, list);
            // A stroke that was queued for removal but never reached the backend simply stays there.
            if (track && !this.pendingRemoved.delete(stroke.id)) this.pendingAdded.set(stroke.id, stroke);
        }
    }

    private detach(strokes: FlipbookStroke[], skipSave = false): void {
        const track = !!this.host.getProvider() && !skipSave;
        for (const stroke of strokes) {
            const list = this.strokes.get(stroke.page);
            if (!list) continue;
            this.strokes.set(stroke.page, list.filter((item) => item.id !== stroke.id));
            if (this.pendingAdded.delete(stroke.id)) continue;
            if (track) this.pendingRemoved.add(stroke.id);
        }
    }

    private afterLocalChange(): void {
        if (this.host.getProvider()) this.schedule();
        else this.writeStorage();
    }

    private schedule(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, this.host.saveDelay ?? DEFAULT_DRAWING_SAVE_DELAY);
    }

    /** Sends pending changes now (page change, destroy). Resolves when everything queued so far has finished. */
    flush(): Promise<void> {
        if (this.timer) { clearTimeout(this.timer); this.timer = null; }
        const provider = this.host.getProvider();
        if (provider && (this.pendingAdded.size || this.pendingRemoved.size)) {
            const added = Array.from(this.pendingAdded.values());
            const removed = Array.from(this.pendingRemoved);
            this.pendingAdded.clear();
            this.pendingRemoved.clear();
            this.queue = this.queue.then(() => this.send(provider, added, removed));
        }
        return this.queue;
    }

    private async send(provider: FlipbookDrawingProvider, added: FlipbookStroke[], removed: string[]): Promise<void> {
        try {
            const result = await provider.save({ documentId: this.host.documentId }, { added: added.map((stroke) => ({ ...stroke })), removed }, this.saveSignal);
            this.applyIds(result?.ids);
        } catch (error) {
            this.rollback(added, removed);
            this.host.onError({ code: 'save', message: describe(error), cause: error });
        }
    }

    /** Switches client ids to the ids the backend assigned. */
    private applyIds(ids: Record<string, string> | undefined): void {
        if (!ids) return;
        const rename = (stroke: FlipbookStroke) => {
            const next = ids[stroke.id];
            if (typeof next === 'string' && next && next !== stroke.id) stroke.id = next;
        };
        this.strokes.forEach((list) => list.forEach(rename));
        [...this.undoStack, ...this.redoStack].forEach((entry) => entry.strokes.forEach(rename));
        this.pendingAdded.forEach((stroke) => rename(stroke));
    }

    /** Undoes a failed batch: its added strokes disappear, its removed strokes come back. History is reset. */
    private rollback(added: FlipbookStroke[], removed: string[]): void {
        const touched: FlipbookStroke[] = [];
        for (const stroke of added) {
            const current = this.find(stroke.id);
            if (current) { this.detach([current], true); touched.push(current); }
            this.pendingAdded.delete(stroke.id);
        }
        const restore = new Map<string, FlipbookStroke>();
        [...this.undoStack, ...this.redoStack].forEach((entry) => entry.strokes.forEach((stroke) => restore.set(stroke.id, stroke)));
        for (const id of removed) {
            const stroke = restore.get(id);
            if (stroke && !this.find(id)) {
                const list = this.strokes.get(stroke.page) ?? [];
                list.push(stroke);
                this.strokes.set(stroke.page, list);
                touched.push(stroke);
            }
            this.pendingRemoved.delete(id);
        }
        this.undoStack = [];
        this.redoStack = [];
        if (touched.length) this.host.onChange(this.change('rollback', null, touched));
    }

    private enqueueClear(provider: FlipbookDrawingProvider, pages: number[], removed: FlipbookStroke[]): void {
        // Earlier pending edits go first so the backend sees them in order.
        void this.flush();
        this.queue = this.queue.then(async () => {
            for (const page of pages) {
                try {
                    await provider.clearPage!({ documentId: this.host.documentId, page }, this.saveSignal);
                } catch (error) {
                    const own = removed.filter((stroke) => stroke.page === page && !this.find(stroke.id));
                    own.forEach((stroke) => {
                        const list = this.strokes.get(stroke.page) ?? [];
                        list.push(stroke);
                        this.strokes.set(stroke.page, list);
                    });
                    if (own.length) this.host.onChange(this.change('rollback', page, own));
                    this.host.onError({ code: 'clear', message: describe(error), pageIndex: page, cause: error });
                }
            }
        });
    }

    private storageKey(): string {
        const source = this.host.documentId;
        let hash = 0;
        for (let index = 0; index < source.length; index++) hash = (hash * 31 + source.charCodeAt(index)) | 0;
        return STORAGE_PREFIX + (source.length > 120 ? 'h' + (hash >>> 0).toString(36) + '-' + source.length : source);
    }

    private readStorage(): void {
        if (this.storageRead || this.host.getStorage() !== 'local') return;
        this.storageRead = true;
        try {
            const raw = window.localStorage.getItem(this.storageKey());
            const parsed = raw ? JSON.parse(raw) : [];
            for (const item of Array.isArray(parsed) ? parsed : []) {
                const stroke = normalizeStroke(item, { options: this.host.getOptions(), now: this.host.now });
                if (stroke && !this.find(stroke.id)) {
                    const list = this.strokes.get(stroke.page) ?? [];
                    list.push(stroke);
                    this.strokes.set(stroke.page, list);
                }
            }
            this.host.onChange({ action: 'load', pageIndex: null, pageNumber: null, strokes: this.getStrokes() });
        } catch (error) {
            this.host.onError({ code: 'storage', message: describe(error), cause: error });
        }
    }

    private writeStorage(): void {
        if (this.host.getStorage() !== 'local') return;
        try {
            window.localStorage.setItem(this.storageKey(), JSON.stringify(this.getStrokes()));
        } catch (error) {
            this.host.onError({ code: 'storage', message: describe(error), cause: error });
        }
    }

    /** Sends what is pending and stops loading. Saves already queued are not cancelled. */
    destroy(): Promise<void> {
        if (this.destroyed) return this.queue;
        const done = this.flush();
        this.destroyed = true;
        this.loadAbort.abort();
        return done;
    }
}

/** Exposes the drawing methods of the engine through the plugin API (`callPluginApi('drawings', ...)`). */
export function createDrawingsPlugin(): FlipbookPlugin {
    return createFeaturePlugin('drawings', (engine) => ({
        getStrokes: (page?: number) => engine.getStrokes(page),
        addStroke: (stroke: unknown) => engine.addStroke(stroke as any),
        clearStrokes: (page?: number) => engine.clearStrokes(page),
        undoStroke: () => engine.undoStroke(),
        redoStroke: () => engine.redoStroke(),
        setMode: (on: boolean) => engine.setDrawingMode(on),
        getTool: () => engine.getDrawingTool(),
        setTool: (tool: Record<string, unknown>) => engine.setDrawingTool(tool as any)
    }));
}

export const drawingsPlugin = createDrawingsPlugin();
