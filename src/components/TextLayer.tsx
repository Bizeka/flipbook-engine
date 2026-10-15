import { computed } from '@preact/signals-core';
import type { FlipbookStore } from '../state/store';
import { domSignal } from '../core/domSignal';

function fitRuns(group: HTMLElement, lifetime: AbortSignal) {
    const signal = domSignal(group, lifetime);
    const fit = () => {
        const layer = group.parentElement;
        if (!layer?.clientWidth) return;
        for (const span of group.querySelectorAll<HTMLElement>('[data-text-width]')) {
            const natural = span.scrollWidth;
            if (natural) span.style.transform = `scaleX(${Number(span.dataset.textWidth) * layer.clientWidth / natural})`;
        }
    };
    const view = group.ownerDocument.defaultView;
    const observer = view?.ResizeObserver ? new view.ResizeObserver(fit) : null;
    // Observe only groups containing loaded text, not every page in the book.
    queueMicrotask(() => { if (!signal.aborted && group.isConnected) { observer?.observe(group.parentElement!); fit(); } });
    const detached = view ? new view.MutationObserver(() => { if (!group.isConnected) dispose(); }) : null;
    const dispose = () => { observer?.disconnect(); detached?.disconnect(); signal.removeEventListener('abort', dispose); };
    detached?.observe(group.ownerDocument.documentElement, { childList: true, subtree: true });
    signal.addEventListener('abort', dispose, { once: true });
}

/** Transparent text is loaded independently of the PDF and page image resolution. */
export function TextLayer(props: { store: FlipbookStore; pageIndex: number; signal: AbortSignal }) {
    const stop = (event: Event) => { if (props.store.textSelection.value) event.stopPropagation(); };
    return <div class={computed(() => 'bk-text-layer' + (props.store.textSelection.value ? ' is-selectable' : ''))}
        aria-hidden={computed(() => props.store.textSelection.value ? 'false' : 'true')}
        onPointerDown={stop} onPointerMove={stop} onPointerUp={stop} onMouseDown={stop} onMouseMove={stop} onMouseUp={stop}
        onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop} onClick={stop} onContextMenu={stop}>
        {computed(() => {
            const page = props.store.textPages.value.get(props.pageIndex);
            return page?.runs.length ? <div ref={(group: HTMLElement) => fitRuns(group, props.signal)}>{page.runs.map(run =>
                <span dir={run.direction ?? 'ltr'} data-text-start={run.start} data-text-width={run.width}
                    style={`left:${run.x * 100}%;top:${run.y * 100}%;width:max-content;height:${run.height * 100}%;font-size:${run.height * 100}cqh;transform-origin:left top;`}>{run.text}</span>
            )}</div> : null;
        })}
    </div>;
}
