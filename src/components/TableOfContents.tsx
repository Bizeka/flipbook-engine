/**
 * @license FlipbookEngine v0.6.5
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computed } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookTocEntry } from '../model/toc';
import type { FlipbookStore } from '../state/store';

interface TableOfContentsProps {
    store: FlipbookStore;
    onEntryClick: (pageIndex: number) => void;
}

function renderEntries(entries: FlipbookTocEntry[], store: FlipbookStore, onEntryClick: (pageIndex: number) => void): any {
    return (
        <ol class="bk-toc-list">
            {entries.map((entry) => (
                <li class="bk-toc-item">
                    <button
                        type="button"
                        class={computed(() => store.currentPage.value === entry.pageIndex ? 'bk-toc-entry active' : 'bk-toc-entry')}
                        aria-current={computed(() => store.currentPage.value === entry.pageIndex ? 'page' : undefined)}
                        onClick={() => onEntryClick(entry.pageIndex)}
                    >
                        <span class="bk-toc-title">{entry.title}</span>
                        <span class="bk-toc-page">{entry.pageIndex + 1}</span>
                    </button>
                    {entry.children?.length ? renderEntries(entry.children, store, onEntryClick) : null}
                </li>
            ))}
        </ol>
    );
}

export function TableOfContents(props: TableOfContentsProps) {
    const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
    return (
        <nav
            class="bk-toc"
            aria-label={computed(() => messages.value.tableOfContents || 'Table of Contents')}
            style={computed(() => props.store.showToc.value && props.store.toc.value.length ? 'display:flex;' : 'display:none;')}
        >
            <div class="bk-toc-heading">{computed(() => messages.value.tableOfContents || 'Table of Contents')}</div>
            {renderEntries(props.store.toc.value, props.store, props.onEntryClick)}
        </nav>
    );
}