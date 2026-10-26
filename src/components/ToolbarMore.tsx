import { computed, type ReadonlySignal } from '@preact/signals-core';
import type { FlipbookMessages } from '../i18n/service';
import { showReaderHelp } from './ReaderHelp';
import type { FlipbookStore } from '../state/store';

/** Secondary commands retain their original handlers and reactive icons. */
export function attachToolbarMore(toolbar: HTMLElement, messages: ReadonlySignal<FlipbookMessages>, store: FlipbookStore) {
    const menu = <div class="bk-more-menu"></div> as HTMLElement;
    const commands = [
        ['.bk-btn--autoplay', 'play'],
        ['.bk-btn--share', 'share'], ['.bk-btn--bookmark', 'bookmark'], ['.bk-btn--download', 'downloadCatalog'], ['.bk-btn--sound', 'sound']
    ] as const;
    for (const [selector, key] of commands) {
        const button = toolbar.querySelector<HTMLButtonElement>(selector);
        if (!button) continue;
        button.append(<span>{computed(() => messages.value[key])}</span> as Node);
        menu.append(button);
    }
    menu.append(<button type="button" class="bk-btn bk-btn--text-selection" style={computed(() => store.textAvailable.value ? '' : 'display:none;')}
        aria-pressed={computed(() => store.textSelection.value ? 'true' : 'false')}
        onClick={() => { store.textSelection.value = !store.textSelection.value; store.placingNote.value = false; }}>{computed(() => messages.value.textSelection)}</button> as Node);
    menu.append(<button type="button" class="bk-btn" onClick={() => showReaderHelp(toolbar.closest<HTMLElement>('.bk-wrapper')!, store)}>{computed(() => messages.value.keyboardShortcuts)}</button> as Node);
    let details: HTMLDetailsElement;
    details = <details class="bk-more" onKeyDown={(event: KeyboardEvent) => {
        if (event.key === 'Escape') { details.open = false; details.querySelector('summary')?.focus(); }
    }}>
        <summary class="bk-btn" aria-label={computed(() => messages.value.moreActions)} title={computed(() => messages.value.moreActions)}>…</summary>
        {menu}
    </details> as HTMLDetailsElement;
    menu.addEventListener('click', event => { if ((event.target as Element).closest('button')) details.open = false; });
    toolbar.lastElementChild!.append(details);
}
