import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';
export function showReaderHelp(root: HTMLElement, store: FlipbookStore) {
    root.querySelector<HTMLDialogElement>('.bk-shortcuts-dialog')?.remove();
    const messages = resolveMessages({ locale: store.locale.value, messages: store.messages.value });
    const dialog = document.createElement('dialog'); dialog.className = 'bk-shortcuts-dialog'; dialog.setAttribute('aria-label', messages.keyboardShortcuts);
    const heading = document.createElement('strong'); heading.textContent = messages.keyboardShortcuts; dialog.append(heading);
    const list = document.createElement('dl');
    for (const [keys, label] of [['← / →', `${messages.previous} / ${messages.next}`], ['Home / End', messages.pages], ['+ / −', `${messages.zoomIn} / ${messages.zoomOut}`], ['0', messages.resetZoom], ['N', messages.addNote], ['Shift + N', messages.myNotes], ['/', messages.search], ['I', messages.tableOfContents], ['T', messages.thumbnails], ['F', messages.fullscreen], ['Esc', messages.closeHotspot], ['Tab / Shift + Tab', messages.moreActions]]) {
        const key = document.createElement('dt'); key.textContent = keys; const detail = document.createElement('dd'); detail.textContent = label; list.append(key, detail);
    }
    const close = document.createElement('button'); close.type = 'button'; close.textContent = messages.closeHotspot; close.addEventListener('click', () => dialog.close());
    dialog.append(list, close); root.append(dialog); const previous = root.ownerDocument.activeElement as HTMLElement;
    dialog.addEventListener('close', () => { dialog.remove(); if (previous?.isConnected) previous.focus(); }, { once: true }); dialog.showModal();
}
