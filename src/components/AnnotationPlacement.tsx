import { computed } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';
export function AnnotationPlacement(props: { store: FlipbookStore }) {
    const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
    return <div class="bk-note-placement-hint" style={computed(() => props.store.placingNote.value ? 'display:flex;' : 'display:none;')} role="status">
        <span>{computed(() => messages.value.placeNote)}</span>
        <button type="button" onClick={(event: Event) => { props.store.placingNote.value = false; (event.currentTarget as HTMLElement).closest('.bk-wrapper')?.querySelector<HTMLElement>('.bk-btn--notes')?.focus(); }}>{computed(() => messages.value.cancel)} (Esc)</button>
    </div>;
}
