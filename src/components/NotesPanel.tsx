/** Copyright (c) 2026 Murat Dogan. SPDX-License-Identifier: AGPL-3.0-or-later */
import { computed, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';
import type { FlipbookAnnotation } from '../model/annotations';
import { NoteEditor } from './NoteEditor';
import { renderNoteDocument, type FlipbookNoteDocument, type FlipbookNoteEditor, type FlipbookNoteValue } from '../model/note-editor';

interface NotesPanelProps {
    store: FlipbookStore;
    onSave: (note: string, document?: FlipbookNoteDocument) => Promise<boolean>;
    onClear: () => Promise<boolean>;
    onClose: () => void;
    onSelect: (pageIndex: number) => void;
    onAnnotation: (annotation: FlipbookAnnotation) => void;
    onAdd: () => void;
    signal: AbortSignal;
}

/** The editor keeps its draft until the host confirms persistence. */
export function NotesPanel(props: NotesPanelProps) {
    const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
    const draft = signal({ page: -1, text: '' });
    const editingPage = signal<number | null>(null);
    const input = { current: null as FlipbookNoteEditor | null };
    const ready = signal(false);
    const drafts = new Map<number, FlipbookNoteValue>();
    const pendingCommits = new Set<number>();
    const currentNote = computed(() => props.store.pageNotes.value.get(props.store.currentPage.value) ?? '');
    const draftValue = computed(() => draft.value.page === props.store.currentPage.value ? draft.value.text : currentNote.value);
    const editing = computed(() => editingPage.value === props.store.currentPage.value || !currentNote.value);
    const beginEdit = () => {
        draft.value = { page: props.store.currentPage.value, text: currentNote.value };
        editingPage.value = props.store.currentPage.value;
    };
    const save = async () => {
        const page = props.store.currentPage.value;
        const value = input.current?.getValue();
        if (!value) return;
        pendingCommits.add(page);
        input.current?.setReadOnly(true);
        if (await props.onSave(value.text, value.document) && props.store.currentPage.value === page) { drafts.delete(page); editingPage.value = null; }
        input.current?.setReadOnly(false);
        pendingCommits.delete(page);
    };
    const clear = async () => {
        const page = props.store.currentPage.value;
        pendingCommits.add(page);
        drafts.delete(page);
        if (await props.onClear()) {
            draft.value = { page, text: '' };
            if (props.store.currentPage.value === page) {
                editingPage.value = page;
            }
        }
        pendingCommits.delete(page);
    };
    return (
        <aside class="bk-notes-panel" style={computed(() => props.store.showNotes.value ? 'display:flex;' : 'display:none;')}
            aria-label={computed(() => messages.value.myNotes)} onKeyDown={(event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); props.onClose(); } }}>
            <div class="bk-notes-heading-row">
                <div class="bk-notes-heading">{computed(() => messages.value.myNotes)} <span class="bk-note-total">{computed(() => props.store.pageNotes.value.size + props.store.annotations.value.length)}</span></div>
                <button type="button" class="bk-notes-close" onClick={props.onClose} aria-label={computed(() => messages.value.closeNote)}>×</button>
            </div>
            <p class="bk-note-privacy">{computed(() => messages.value.privateNotes)}</p>
            <div class="bk-note-tabs" role="group" aria-label={computed(() => messages.value.myNotes)}>
                <button type="button" aria-pressed={computed(() => props.store.notesView.value === 'all' ? 'true' : 'false')} onClick={() => props.store.notesView.value = 'all'}>{computed(() => messages.value.allNotes)}</button>
                <button type="button" aria-pressed={computed(() => props.store.notesView.value === 'page' ? 'true' : 'false')} onClick={() => props.store.notesView.value = 'page'}>{computed(() => `${messages.value.currentPage} · ${props.store.currentPage.value + 1}`)}</button>
            </div>
            <button type="button" class="bk-add-annotation" style={computed(() => props.store.canAnnotate.value ? 'display:block;' : 'display:none;')} onClick={props.onAdd}>{computed(() => messages.value.addNote)}</button>
            <div class="bk-note-list" style={computed(() => props.store.notesView.value === 'all' ? 'display:flex;' : 'display:none;')}>
                {computed(() => {
                    const notes = [...props.store.pageNotes.value].map(([pageIndex, text]) => ({ id: `page-${pageIndex}`, pageIndex, text, annotation: undefined as FlipbookAnnotation | undefined }));
                    notes.push(...props.store.annotations.value.map(annotation => ({ ...annotation, annotation })));
                    notes.sort((a, b) => a.pageIndex - b.pageIndex || a.id.localeCompare(b.id));
                    return notes.length ? <div class="bk-note-list-items">{notes.map(note => <button type="button" class="bk-note-list-item" onClick={() => note.annotation ? props.onAnnotation(note.annotation) : props.onSelect(note.pageIndex)}>
                        <strong>{messages.value.page} {note.pageIndex + 1}</strong><span>{note.text}</span>
                    </button>)}</div> : <p class="bk-note-empty">{messages.value.noNotes}</p>;
                })}
            </div>
            <div class="bk-current-note" style={computed(() => props.store.notesView.value === 'page' ? 'display:block;' : 'display:none;')}>
            {computed(() => !props.store.showNotes.value || props.store.notesView.value !== 'page' ? null : currentNote.value && !editing.value ? (
                <div class="bk-note-saved">
                    <div class="bk-note-content">{renderNoteDocument(props.store.pageNoteDocuments.value.get(props.store.currentPage.value), currentNote.value)}</div>
                    <div class="bk-note-actions">
                        <button type="button" class="bk-note-badge bk-note-badge--edit" onClick={beginEdit} disabled={props.store.notesSaving}>{computed(() => messages.value.editNote)}</button>
                        <button type="button" class="bk-note-badge bk-note-badge--delete" onClick={clear} disabled={props.store.notesSaving}>{computed(() => messages.value.deleteNote)}</button>
                    </div>
                </div>
            ) : (
                <div class="bk-notes-editor">
                    <NoteEditor value={drafts.get(props.store.currentPage.value) ?? { text: draftValue.value, document: props.store.pageNoteDocuments.value.get(props.store.currentPage.value) }} factory={props.store.noteEditor.value} signal={props.signal} label={messages.value.notes} view={input} onReady={value => ready.value = value} onDraft={((page) => value => { if (!pendingCommits.has(page)) drafts.set(page, value); })(props.store.currentPage.value)} />
                    <div class="bk-notes-actions">
                        <button type="button" class="bk-notes-clear" onClick={clear} disabled={props.store.notesSaving}>{computed(() => messages.value.clearNote)}</button>
                        <button type="button" class="bk-notes-save" onClick={save} disabled={computed(() => props.store.notesSaving.value || !ready.value)}>{computed(() => messages.value.saveNote)}</button>
                    </div>
                </div>
            ))}
            </div>
            <div role="status" aria-live="polite">{computed(() => props.store.notesSaving.value ? messages.value.saving : props.store.notesFailed.value ? messages.value.noteFailed : '')}</div>
        </aside>
    );
}
