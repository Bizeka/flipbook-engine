/**
 * @license FlipbookEngine v0.6.5
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computed, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';

interface NotesPanelProps {
    store: FlipbookStore;
    onSave: (note: string) => void;
    onClear: () => void;
    onClose: () => void;
}

/**
 * Page-level note UI. Persistence remains host-owned through the engine API and
 * noteChange event; the panel intentionally does not know about a backend.
 */
export function NotesPanel(props: NotesPanelProps) {
    const messages = computed(() => resolveMessages({
        locale: props.store.locale.value,
        messages: props.store.messages.value
    }));
    const draft = signal('');
    const editing = signal(false);
    const noteInputRef = { current: null as HTMLTextAreaElement | null };
    let draftPage = -1;

    const draftValue = computed(() => {
        const page = props.store.currentPage.value;
        const note = props.store.pageNotes.value.get(page) ?? '';
        if (draftPage !== page) {
            draftPage = page;
            draft.value = note;
            editing.value = !note;
        }
        return draft.value;
    });
    const currentNote = computed(() => props.store.pageNotes.value.get(props.store.currentPage.value) ?? '');

    const handleInput = (event: Event) => {
        draft.value = (event.currentTarget as HTMLTextAreaElement).value;
    };
    const beginEdit = () => {
        draft.value = currentNote.value;
        editing.value = true;
    };
    const save = (event?: Event) => {
        event?.preventDefault();
        props.onSave(noteInputRef.current?.value ?? draft.value);
        editing.value = false;
    };
    const clear = (event?: Event) => {
        event?.preventDefault();
        draft.value = '';
        if (noteInputRef.current) noteInputRef.current.value = '';
        props.onClear();
        editing.value = true;
    };

    const renderEditor = () => (
        <div class="bk-notes-editor">
            <textarea
                ref={noteInputRef}
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
        </div>
    );

    const renderSavedNote = () => (
        <div class="bk-note-saved">
            <p class="bk-note-content">{currentNote}</p>
            <div class="bk-note-actions">
                <button type="button" class="bk-note-badge bk-note-badge--edit" onClick={beginEdit}>
                    {computed(() => messages.value.editNote || 'Edit')}
                </button>
                <button type="button" class="bk-note-badge bk-note-badge--delete" onClick={clear}>
                    {computed(() => messages.value.deleteNote || 'Delete')}
                </button>
            </div>
        </div>
    );

    return (
        <aside
            class="bk-notes-panel"
            style={computed(() => props.store.showNotes.value ? 'display:flex;' : 'display:none;')}
            aria-label={computed(() => messages.value.notes || 'Page note')}
        >
            <div class="bk-notes-heading-row">
                <div class="bk-notes-heading">{computed(() => messages.value.notes || 'Page note')}</div>
                <button type="button" class="bk-notes-close" onClick={props.onClose} aria-label={computed(() => messages.value.closeNote || 'Close note editor')} title={computed(() => messages.value.closeNote || 'Close note editor')}>
                    <span aria-hidden="true">×</span>
                </button>
            </div>
            {computed(() => currentNote.value && !editing.value ? renderSavedNote() : renderEditor())}
        </aside>
    );
}
