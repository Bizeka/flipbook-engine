import type { FlipbookNoteEditor, FlipbookNoteEditorFactory, FlipbookNoteValue } from '../model/note-editor';

export function NoteEditor(props: { value: FlipbookNoteValue; factory?: FlipbookNoteEditorFactory; signal: AbortSignal; label: string; view: { current: FlipbookNoteEditor | null }; onReady: (ready: boolean) => void; onDraft?: (value: FlipbookNoteValue) => void }) {
    const root = document.createElement('div'); root.className = 'bk-note-editor-host';
    let view: FlipbookNoteEditor | undefined, observer: MutationObserver | undefined;
    props.onReady(false);
    const cleanup = () => {
        observer?.disconnect();
        if (view && !props.signal.aborted) props.onDraft?.(view.getValue());
        view?.destroy(); view = undefined; props.view.current = null;
    };
    props.signal.addEventListener('abort', cleanup, { once: true });
    queueMicrotask(async () => {
        if (props.signal.aborted || !root.isConnected) return;
        if (props.factory) {
            try { view = await props.factory(root, props.value, props.signal); }
            catch { root.textContent = props.label; props.onReady(false); return; }
        } else {
            const input = document.createElement('textarea'); input.className = 'bk-notes-input'; input.rows = 4; input.maxLength = 4000;
            input.setAttribute('aria-label', props.label); input.placeholder = props.label; input.value = props.value.text; root.append(input);
            view = { getValue: () => ({ text: input.value }), setReadOnly: value => input.disabled = value, destroy: () => input.remove() };
        }
        if (props.signal.aborted || !root.isConnected) { cleanup(); return; }
        props.view.current = view!; props.onReady(true);
        observer = new root.ownerDocument.defaultView!.MutationObserver(() => { if (!root.isConnected) cleanup(); });
        observer.observe(root.ownerDocument.body, { childList: true, subtree: true });
        root.querySelector<HTMLElement>('[contenteditable="true"],textarea')?.focus();
    });
    return root;
}
