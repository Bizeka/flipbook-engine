import { effect } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import { validateTextPage, type FlipbookTextLayerProvider } from '../model/text-layer';

/** At most three visible/adjacent pages; stale requests cannot update a new session. */
export function loadTextLayers(store: FlipbookStore, provider: FlipbookTextLayerProvider, lifetime: AbortSignal): () => void {
    const requests = new Map<number, AbortController>();
    const completed = new Set<number>();
    const stop = effect(() => {
        const current = store.currentPage.value, total = store.totalPages.value;
        const wanted = new Set([current - 1, current, current + 1].filter(index => index >= 0 && index < total));
        for (const [index, request] of requests) if (!wanted.has(index)) { request.abort(); requests.delete(index); }
        const retained = new Map([...store.textPages.peek()].filter(([index]) => wanted.has(index)));
        for (const index of [...completed]) if (!wanted.has(index)) completed.delete(index);
        store.textPages.value = retained;
        for (const index of wanted) {
            if (requests.has(index) || completed.has(index) || lifetime.aborted) continue;
            const request = new AbortController(); requests.set(index, request);
            Promise.resolve().then(() => provider(index, request.signal)).then(page => {
                if (request.signal.aborted || lifetime.aborted || requests.get(index) !== request) return;
                if (page) store.textPages.value = new Map(store.textPages.peek()).set(index, validateTextPage(page, index));
                completed.add(index);
            }).catch(() => {
                // Text is optional: failure must leave image navigation and search usable.
                if (!request.signal.aborted) completed.add(index);
            }).finally(() => { if (requests.get(index) === request) requests.delete(index); });
        }
    });
    const dispose = () => { stop(); for (const request of requests.values()) request.abort(); requests.clear(); };
    lifetime.addEventListener('abort', dispose, { once: true });
    return () => { lifetime.removeEventListener('abort', dispose); dispose(); };
}
