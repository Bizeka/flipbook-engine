import { computed } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import { safeCssColor } from '../model/annotations';
import type { FlipbookStore } from '../state/store';

export interface NoteMetaValue { color?: string; groupKey?: string }

/** Colour palette and group picker; renders nothing unless the host configured colours or groups. */
export function NoteMeta(props: { store: FlipbookStore; value: NoteMetaValue; onChange: (value: NoteMetaValue) => void }) {
    const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
    return <div class="bk-note-meta" style={computed(() => props.store.noteColors.value.length || props.store.noteGroups.value.length ? '' : 'display:none;')}>
        {computed(() => {
            let current = { ...props.value };
            const colors = props.store.noteColors.value, groups = props.store.noteGroups.value;
            const group = groups.find(item => item.key === current.groupKey);
            return <>
                {colors.length ? <fieldset class="bk-note-palette" aria-label={messages.value.noteColor}>
                    {colors.map((color, index) => {
                        const label = color.label || messages.value.noteColorLabel.replace('{n}', String(index + 1));
                        return <button type="button" class="bk-note-swatch" style={`--bk-swatch:${safeCssColor(color.value) ?? 'transparent'};`} data-label={label} aria-label={label}
                        aria-pressed={computed(() => current.color === color.value ? 'true' : 'false')}
                        onClick={(event: Event) => {
                            current = { ...current, color: current.color === color.value ? undefined : color.value }; props.onChange(current);
                            const pressed = (event.currentTarget as HTMLElement).parentElement!.querySelectorAll('.bk-note-swatch');
                            pressed.forEach(item => item.setAttribute('aria-pressed', item === event.currentTarget && current.color ? 'true' : 'false'));
                        }} />;
                    })}
                </fieldset> : null}
                {groups.length ? <>
                    <label class="bk-note-meta-label">{messages.value.noteGroup}
                        <select class="bk-note-group-select" value={current.groupKey ?? ''} onChange={(event: Event) => {
                            const key = (event.currentTarget as HTMLSelectElement).value || undefined;
                            current = { ...current, groupKey: key, color: current.color ?? groups.find(item => item.key === key)?.color }; props.onChange(current);
                            const text = (event.currentTarget as HTMLElement).closest('.bk-note-meta')?.querySelector('.bk-note-group-desc');
                            if (text) text.textContent = groups.find(item => item.key === key)?.description ?? '';
                        }}>
                            <option value="">{messages.value.noGroup}</option>
                            {groups.map(item => <option value={item.key} selected={item.key === current.groupKey}>{item.label}</option>)}
                        </select>
                    </label>
                    <p class="bk-note-group-desc">{group?.description ?? ''}</p>
                </> : null}
            </>;
        })}
    </div>;
}
