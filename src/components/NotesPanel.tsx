/**
 * @license FlipbookEngine v0.6.5
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computed } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';

interface NotesPanelProps {
    store: FlipbookStore;
    onSave: (note: string) => void;
    onClear: () => void;
    onClose: () => void;
}

/**
 * Inline page-note editor. Storage remains host-owned through the engine note API
 * and noteChange event; this panel only provides a small local editing surface.
 */
export function NotesPanel(props: NotesPanelProps) {
    const messages = computed(() => resolveMessages({
        locale: props.store.locale.value,
        messages: props.store.messages.value
    }));
    let draft = '';
    let draftPage = -1;

    const draftValue = computed(() => {
        const page = props.store.currentPage.value;
        const note = props.store.pageNotes.value.get(page) ?? '';
        if (draftPage !== page) {
            draftPage = page;
            draft = note;
        }
        return draft;
    });
    const handleInput = (event: Event) => {
        draft = (event.currentTarget as HTMLTextAreaElement).value;
    };
    const save = () => {
        props.onSave(draft);
    };
    const clear = () => {
        draft = '';
        props.onClear();
    };

    return (
        <aside
            class="bk-notes-panel"
            style={computed(() => props.store.showNotes.value ? 'display:flex;' : 'display:none;')}
            aria-label={computed(() => messages.value.notes || 'Page note')}
        >
            <div class="bk-notes-heading-row">\n                <div class="bk-notes-heading">{computed(() => messages.value.notes || 'Page note')}</div>\n                <button type="button" class="bk-notes-close" onClick={props.onClose} aria-label={computed(() => messages.value.closeNote || 'Close note editor')} title={computed(() => messages.value.closeNote || 'Close note editor')}>\n                    <span aria-hidden="true">×</span>\n                </button>\n            </div>
            <textarea
                class="bk-notes-input"
                aria-label={computed(() => messages.value.notes || 'Page note')}
                placeholder={computed(() => messages.value.notes || 'Page note')}
                value={draftValue}
                onInput={handleInput}
                rows={4}
            ></textarea>
            <div class="bk-notes-actions">
                <button type="button" class="bk-notes-clear" onClick={clear}>
                    {computed(() => messages.value.clearNote || 'Clear note')}
                </button>
                <button type="button" class="bk-notes-save" onClick={save}>
                    {computed(() => messages.value.saveNote || 'Save note')}
                </button>
            </div>
        </aside>
    );
}
