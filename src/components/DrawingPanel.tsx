import { computed, effect, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';
import type { FlipbookDrawingTool, FlipbookDrawingToolState } from '../model/drawings';
import { panelChange, panelView, OPACITY_MAX_PERCENT, OPACITY_MIN_PERCENT, type DrawingPanelAction } from '../model/drawing-panel';
import { css, styled } from './style';

interface DrawingPanelProps {
    store: FlipbookStore;
    onTool: (change: Partial<FlipbookDrawingToolState>) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
    onClose: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The panel that opens with drawing mode: mode, colour, opacity, width, preview, eraser, undo, redo, clear page and close. */
export function DrawingPanel(props: DrawingPanelProps) {
    const { store } = props;
    const messages = computed(() => resolveMessages({ locale: store.locale.value, messages: store.messages.value }));
    // The drawing mode to return to when the eraser is switched off.
    let last: FlipbookDrawingTool = 'highlight';
    const confirming = signal(false);
    const view = computed(() => {
        const tool = store.drawingTool.value;
        if (tool && tool.tool !== 'eraser') last = tool.tool;
        return tool ? panelView(tool, last) : null;
    });
    const act = (action: DrawingPanelAction) => {
        const tool = store.drawingTool.peek();
        if (tool) props.onTool(panelChange(tool, action, last));
    };
    const allows = (tool: 'highlight' | 'pen' | 'eraser') => !!store.drawingConfig.value?.tools.includes(tool);
    let panel: HTMLElement;
    const penButton = () => panel?.closest<HTMLElement>('.bk-wrapper')?.querySelector<HTMLElement>('.bk-btn--pen') ?? null;
    const focusClear = () => queueMicrotask(() => panel.querySelector<HTMLElement>('.bk-draw-clear')?.focus());

    let wasOpen = false;
    effect(() => {
        const open = store.drawingMode.value;
        store.currentPage.value;
        confirming.value = false;
        if (open && !wasOpen) queueMicrotask(() => {
            if (!store.drawingMode.peek() || !panel?.getBoundingClientRect().width) return;
            panel.querySelector<HTMLElement>('.bk-draw-mode[aria-pressed=true]')?.focus();
        });
        else if (!open && wasOpen && panel?.contains(panel.ownerDocument.activeElement)) penButton()?.focus();
        wasOpen = open;
    });

    const preview = (element: SVGSVGElement) => {
        const doc = element.ownerDocument;
        const make = (tag: string, attributes: Record<string, string>) => {
            const node = doc.createElementNS(SVG_NS, tag);
            for (const name in attributes) node.setAttribute(name, attributes[name]);
            element.append(node);
            return node;
        };
        // Grey text lines, so a highlight can be seen multiplying with the page.
        for (let line = 0; line < 3; line++) make('rect', { x: '10', y: String(10 + line * 17), width: line === 2 ? '120' : '200', height: '6', rx: '3', fill: '#9e9e9e' });
        const path = make('path', { d: 'M12 28C50 8 80 48 118 28S170 8 208 28', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
        effect(() => {
            const state = view.value;
            if (!state) return;
            path.setAttribute('stroke', state.color);
            path.setAttribute('stroke-width', String(Math.min(40, state.width)));
            path.setAttribute('stroke-opacity', String(state.opacityPercent / 100));
            path.setAttribute('opacity', state.eraser ? '0.25' : '1');
            element.classList.toggle('bk-draw-preview--highlight', state.mode === 'highlight');
        });
    };

    const label = (key: keyof ReturnType<typeof resolveMessages>) => computed(() => messages.value[key]);
    const percentText = computed(() => (view.value?.opacityPercent ?? '') + '%');
    const widthText = computed(() => (view.value?.width ?? '') + ' px');
    panel = (
        <section class="bk-draw-panel" role="group" aria-label={label('drawingPanel')}
            style={styled(() => store.drawingMode.value ? 'display:flex;' : 'display:none;')}
            onKeyDown={(event: KeyboardEvent) => {
                if (event.key !== 'Escape' || !confirming.peek()) return;
                // The first Escape only cancels a pending clear; the next one closes the panel.
                event.preventDefault();
                confirming.value = false;
                focusClear();
            }}>
            <div class="bk-draw-heading-row">
                <strong class="bk-draw-heading">{label('drawingPanel')}</strong>
                <button type="button" class="bk-draw-close" onClick={() => { props.onClose(); penButton()?.focus(); }} aria-label={label('drawingClose')} title={label('drawingClose')}>×</button>
            </div>

            <div class="bk-draw-row bk-draw-modes" role="group" aria-label={label('drawingMode')}>
                {computed(() => <div class="bk-draw-items">{(['highlight', 'pen'] as const).filter(allows).map((mode) => (
                    <button type="button" class="bk-draw-mode" aria-pressed={computed(() => view.value && !view.value.eraser && view.value.mode === mode ? 'true' : 'false')} onClick={() => act({ type: 'mode', mode })}>
                        {computed(() => mode === 'highlight' ? messages.value.drawingHighlight : messages.value.drawingBoardPen)}
                    </button>
                ))}</div>)}
            </div>

            <div class="bk-draw-row bk-draw-swatches" role="radiogroup" aria-label={label('drawingColor')}>
                {computed(() => <div class="bk-draw-items">{(store.drawingConfig.value?.colors ?? []).map((color) => (
                    <button type="button" class="bk-draw-swatch" role="radio" style={css('background-color:' + color + ';')}
                        aria-checked={computed(() => view.value?.color === color ? 'true' : 'false')}
                        aria-label={computed(() => messages.value.drawingColorLabel.replace('{color}', color))}
                        title={color}
                        onClick={() => act({ type: 'color', color })} />
                ))}</div>)}
            </div>

            <label class="bk-draw-slider">
                <span class="bk-draw-slider-label">{label('drawingOpacity')}<output class="bk-draw-value">{percentText}</output></span>
                <input type="range" class="bk-draw-opacity" min={String(OPACITY_MIN_PERCENT)} max={String(OPACITY_MAX_PERCENT)} step="5"
                    value={computed(() => String(view.value?.opacityPercent ?? OPACITY_MAX_PERCENT))}
                    onInput={(event: Event) => act({ type: 'opacity', percent: Number((event.currentTarget as HTMLInputElement).value) })} />
            </label>

            <label class="bk-draw-slider">
                <span class="bk-draw-slider-label">{label('drawingWidth')}<output class="bk-draw-value">{widthText}</output></span>
                <input type="range" class="bk-draw-width" step="1"
                    min={computed(() => String(view.value?.widthMin ?? 1))}
                    max={computed(() => String(view.value?.widthMax ?? 16))}
                    value={computed(() => String(view.value?.width ?? 1))}
                    onInput={(event: Event) => act({ type: 'width', value: Number((event.currentTarget as HTMLInputElement).value) })} />
            </label>

            <svg class="bk-draw-preview" viewBox="0 0 220 56" role="img" aria-label={label('drawingPreview')} ref={preview as any} />

            <div class="bk-draw-row bk-draw-actions">
                {computed(() => allows('eraser') ? (
                    <button type="button" class="bk-draw-eraser" aria-pressed={computed(() => view.value?.eraser ? 'true' : 'false')} onClick={() => act({ type: 'eraser', on: !view.value?.eraser })}>{label('drawingEraser')}</button>
                ) : null)}
                <button type="button" class="bk-draw-undo" disabled={computed(() => !store.drawingHistory.value.undo)} onClick={props.onUndo}>{label('drawingUndo')}</button>
                <button type="button" class="bk-draw-redo" disabled={computed(() => !store.drawingHistory.value.redo)} onClick={props.onRedo}>{label('drawingRedo')}</button>
            </div>

            <div class="bk-draw-row bk-draw-clear-row">
                {computed(() => confirming.value ? (
                    <div class="bk-draw-confirm" role="group" aria-label={label('drawingClearConfirm')}>
                        <span class="bk-draw-confirm-text" role="alert">{label('drawingClearConfirm')}</span>
                        <button type="button" class="bk-draw-confirm-yes" onClick={() => { confirming.value = false; props.onClear(); focusClear(); }}>{label('drawingClearYes')}</button>
                        <button type="button" class="bk-draw-confirm-no" ref={(el: HTMLElement) => queueMicrotask(() => el.focus())} onClick={() => { confirming.value = false; focusClear(); }}>{label('cancel')}</button>
                    </div>
                ) : (
                    <button type="button" class="bk-draw-clear" onClick={() => { confirming.value = true; }}>{label('drawingClear')}</button>
                ))}
            </div>
        </section>
    ) as HTMLElement;
    return panel;
}
