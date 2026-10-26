import { effect } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import type { InteractionManager } from '../core/InteractionManager';
import type { PageFlipAdapter } from '../adapters/PageFlipAdapter';
import { domSignal } from '../core/domSignal';
import { showReaderHelp } from './ReaderHelp';

export function ReaderShortcuts(root: HTMLElement, store: FlipbookStore, commands: {
    pageFlipAdapterRef: { current: PageFlipAdapter | null }; interactionManagerRef: { current: InteractionManager | null };
    onBeginAnnotation: () => void; onToggleNotes: () => void; onToggleFullscreen: () => void; onAnnotationClose: () => void;
}, signal: AbortSignal) {
    signal = domSignal(root, signal);
    root.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End + - 0 n Shift+n / i t f Escape');
    let previousFocus: HTMLElement | null = null, wasOpen = false;
    const stop = effect(() => {
        const open = store.showNotes.value || store.showSearch.value || store.showToc.value || !!store.pendingAnnotation.value || !!store.activeAnnotationId.value;
        if (open && !wasOpen) previousFocus = root.ownerDocument.activeElement as HTMLElement;
        if (open) queueMicrotask(() => {
            if (signal.aborted) return;
            const selector = store.pendingAnnotation.value || store.activeAnnotationId.value ? '.bk-note-popover' : store.showSearch.value ? '.bk-search-panel' : store.showNotes.value ? '.bk-notes-panel' : '.bk-toc';
            const panel = root.querySelector<HTMLElement>(selector);
            const target = panel?.querySelector<HTMLElement>('textarea:not([disabled]),input:not([disabled]),[contenteditable="true"]') ?? panel?.querySelector<HTMLElement>('button');
            if (target && panel?.getBoundingClientRect().width) target.focus();
        });
        else if (wasOpen) queueMicrotask(() => { if (!signal.aborted && previousFocus?.isConnected) previousFocus.focus(); });
        wasOpen = open;
    });
    signal.addEventListener('abort', stop, { once: true });
    root.addEventListener('keydown', event => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        if ((event.target as Element).closest('dialog')) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            // Each press closes only the top-most layer.
            if (store.placingNote.value) store.placingNote.value = false;
            else if (store.pendingAnnotation.value || store.activeAnnotationId.value) commands.onAnnotationClose();
            else if (store.showSearch.value) store.showSearch.value = false;
            else if (store.showNotes.value) store.showNotes.value = false;
            else if (store.showToc.value) store.showToc.value = false;
            else store.textSelection.value = false;
            if (!store.showNotes.value && !store.showSearch.value && !store.showToc.value) root.querySelector<HTMLElement>('.bk-btn--notes')?.focus();
            return;
        }
        if ((event.target as Element).closest('input,textarea,select,[contenteditable="true"],dialog')) return;
        if (event.key === '?') { event.preventDefault(); showReaderHelp(root, store); return; }
        if ((event.target as Element).closest('.bk-toolbar') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
            const buttons = [...root.querySelectorAll<HTMLElement>('.bk-toolbar button,.bk-toolbar summary')].filter(button => button.getBoundingClientRect().width > 0);
            const current = buttons.indexOf(event.target as HTMLElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next]?.focus(); event.preventDefault(); return;
        }
        const panel = store.showNotes.value || store.showSearch.value || store.showToc.value || !!store.pendingAnnotation.value || !!store.activeAnnotationId.value;
        const key = event.key.toLowerCase();
        if (store.textSelection.value && event.shiftKey && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end'].includes(key)) return;
        if (key === 'n') { event.preventDefault(); if (event.shiftKey || !store.canAnnotate.value) commands.onToggleNotes(); else commands.onBeginAnnotation(); return; }
        if (panel || store.placingNote.value) return;
        const pan = { arrowleft: [80, 0], arrowright: [-80, 0], arrowup: [0, 80], arrowdown: [0, -80] }[key];
        if (pan && store.zoomState.value.isActive) { commands.interactionManagerRef.current?.panBy(pan[0], pan[1]); event.preventDefault(); return; }
        switch (key) {
            case 'arrowleft': case 'pageup': commands.pageFlipAdapterRef.current?.turnToPrevPage(); break;
            case 'arrowright': case 'pagedown': commands.pageFlipAdapterRef.current?.turnToNextPage(); break;
            case 'home': store.currentPage.value = 0; break;
            case 'end': store.currentPage.value = Math.max(0, store.totalPages.value - 1); break;
            case '+': case '=': commands.interactionManagerRef.current?.zoomIn(); break;
            case '-': commands.interactionManagerRef.current?.zoomOut(); break;
            case '0': store.zoomState.value = { ...store.zoomState.value, scale: 1, isActive: false, translateX: 0, translateY: 0 }; break;
            case '/': if (store.searchAvailable.value) store.showSearch.value = true; break;
            case 'i': store.showToc.value = true; break;
            case 't': store.showThumbs.value = !store.showThumbs.value; break;
            case 'f': commands.onToggleFullscreen(); break;
            default: return;
        }
        event.preventDefault();
    }, { signal });
}
