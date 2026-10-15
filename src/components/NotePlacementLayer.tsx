import { computed } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';
import { domSignal } from '../core/domSignal';

type Place = (page: number, x: number, y: number) => void;
const controls = 'button,a,input,textarea,select,[contenteditable="true"],.bk-hotspot-popup';
const stop = (event: Event) => event.stopPropagation();

export function NotePlacementLayer(props: { store: FlipbookStore; pageIndex: number; onPlace: Place }) {
    const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
    return <button type="button" class="bk-note-placement-layer" aria-label={computed(() => messages.value.placeNote)}
        style={computed(() => props.store.placingNote.value ? 'display:block;' : 'display:none;')}
        onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} onMouseDown={stop}
        onClick={(event: MouseEvent) => {
            event.preventDefault(); event.stopPropagation();
            const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
            props.onPlace(props.pageIndex, event.detail === 0 ? .5 : (event.clientX - box.left) / box.width, event.detail === 0 ? .5 : (event.clientY - box.top) / box.height);
        }} />;
}

/** Long press tolerates small finger movement; dragging/pinching always cancels it. */
export function bindNoteGestures(element: HTMLElement, store: FlipbookStore, place: Place, signal: AbortSignal) {
    signal = domSignal(element, signal);
    let timer: ReturnType<typeof setTimeout> | undefined, held = false, startX = 0, startY = 0;
    let blockedClickUntil = 0;
    const cancel = () => { clearTimeout(timer); timer = undefined; };
    const pageAt = (target: EventTarget | null) => (target as Element | null)?.closest<HTMLElement>('.bz-page-content,.bk-single-page');
    const pick = (target: EventTarget | null, x: number, y: number) => {
        const page = pageAt(target), holder = page?.closest<HTMLElement>('[data-idx]');
        if (!page || !holder || !store.canAnnotate.value) return;
        const box = page.getBoundingClientRect();
        if (!box.width || !box.height) return;
        store.placingNote.value = true;
        place(Number(holder.dataset.idx), (x - box.left) / box.width, (y - box.top) / box.height);
    };
    element.addEventListener('pointerdown', event => {
        cancel();
        if (store.textSelection.value || !store.canAnnotate.value || store.placingNote.value || (event.target as Element).closest(controls)) return;
        if (event.button === 2) { event.stopPropagation(); return; }
        if (event.pointerType === 'mouse' || !event.isPrimary) return;
        startX = event.clientX; startY = event.clientY; held = false;
        timer = setTimeout(() => { held = true; blockedClickUntil = Date.now() + 1000; pick(event.target, startX, startY); }, 550);
    }, { capture: true, signal });
    element.addEventListener('pointermove', event => { if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) cancel(); }, { capture: true, signal });
    element.addEventListener('pointerup', event => {
        cancel();
        if (held) { event.preventDefault(); event.stopImmediatePropagation(); held = false; }
    }, { capture: true, signal });
    element.addEventListener('click', event => { if (Date.now() < blockedClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); } }, { capture: true, signal });
    element.addEventListener('touchend', event => { if (Date.now() < blockedClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); } }, { capture: true, passive: false, signal });
    element.addEventListener('pointercancel', () => { cancel(); held = false; }, { capture: true, signal });
    element.addEventListener('contextmenu', event => {
        if (store.textSelection.value || !store.canAnnotate.value || (event.target as Element).closest(controls)) return;
        event.preventDefault(); event.stopPropagation(); cancel();
        if (!held) pick(event.target, event.clientX, event.clientY);
    }, { capture: true, signal });
    signal.addEventListener('abort', cancel, { once: true });
}
