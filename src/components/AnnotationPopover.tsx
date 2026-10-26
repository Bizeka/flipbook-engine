import { computed, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookAnnotation } from '../model/annotations';
import type { FlipbookStore } from '../state/store';
import { NoteEditor } from './NoteEditor';
import { NoteMeta, type NoteMetaValue } from './NoteMeta';
import { renderNoteDocument, type FlipbookNoteEditor, type FlipbookNoteValue } from '../model/note-editor';
export function AnnotationPopover(props: { store: FlipbookStore; signal: AbortSignal; onSave: (note: FlipbookAnnotation) => Promise<boolean>; onDelete: (note: FlipbookAnnotation) => Promise<boolean>; onClose: () => void }) {
    const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
    const selected = computed(() => props.store.pendingAnnotation.value ?? props.store.annotations.value.find(note => note.id === props.store.activeAnnotationId.value));
    const drafts = new Map<string, FlipbookNoteValue>(), metas = new Map<string, NoteMetaValue>();
    const editing = signal<string | null>(null), deleting = signal<string | null>(null);
    const input = { current: null as FlipbookNoteEditor | null };
    const ready = signal(false);
    return <aside class="bk-note-popover" role="dialog" aria-label={computed(() => messages.value.notes)}
        style={computed(() => props.store.canAnnotate.value && selected.value ? 'display:flex;' : 'display:none;')}
        onKeyDown={(event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); props.onClose(); } }}>
        {computed(() => {
            const note = selected.value;
            if (!note) return null;
            const isEditing = !!props.store.pendingAnnotation.value || editing.value === note.id;
            return <>
                <div class="bk-notes-heading-row"><strong>{messages.value.notes} · {messages.value.page} {note.pageIndex + 1}</strong><button type="button" class="bk-notes-close" onClick={props.onClose} aria-label={messages.value.closeNote}>×</button></div>
                {isEditing ? <>
                    <NoteEditor value={drafts.get(note.id) ?? { text: note.text, document: note.document }} factory={props.store.noteEditor.value} signal={props.signal} label={messages.value.notes} view={input} onReady={value => ready.value = value} onDraft={value => drafts.set(note.id, value)} />
                    <NoteMeta store={props.store} value={metas.get(note.id) ?? { color: note.color, groupKey: note.groupKey }} onChange={value => metas.set(note.id, value)} />
                    <div class="bk-notes-actions"><button type="button" onClick={props.onClose}>{messages.value.cancel}</button>
                        <button type="button" class="bk-notes-save" disabled={computed(() => props.store.notesSaving.value || !ready.value)} onClick={async () => {
                            const value = input.current?.getValue();
                            if (!value) return;
                            drafts.set(note.id, value);
                            input.current?.setReadOnly(true);
                            if (await props.onSave({ ...note, ...value, ...metas.get(note.id) })) { editing.value = null; drafts.delete(note.id); metas.delete(note.id); }
                            input.current?.setReadOnly(false);
                        }}>{messages.value.saveNote}</button></div>
                </> : <>
                    {note.groupKey ? <span class="bk-note-bubble-group">{props.store.noteGroups.value.find(item => item.key === note.groupKey)?.label ?? note.groupKey}</span> : null}
                    {renderNoteDocument(note.document, note.text)}
                    {deleting.value === note.id ? <div class="bk-notes-actions"><span>{messages.value.confirmDeleteNote}</span><button type="button" onClick={() => deleting.value = null}>{messages.value.cancel}</button><button type="button" disabled={props.store.notesSaving} onClick={() => props.onDelete(note)}>{messages.value.deleteNote}</button></div> :
                        <div class="bk-notes-actions"><button type="button" onClick={() => editing.value = note.id}>{messages.value.editNote}</button><button type="button" onClick={() => deleting.value = note.id}>{messages.value.deleteNote}</button></div>}
                </>}
            </>;
        })}
        <div role="status" aria-live="polite">{computed(() => props.store.notesSaving.value ? messages.value.saving : props.store.notesFailed.value ? messages.value.noteFailed : '')}</div>
    </aside>;
}
