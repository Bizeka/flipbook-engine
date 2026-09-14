import { computed, signal } from '@preact/signals-core';
import { resolveMessages } from '../i18n/service';
import type { FlipbookStore } from '../state/store';

interface SearchPanelProps {
  store: FlipbookStore;
  onSearch: (query: string) => void;
  onClear: () => void;
  onClose: () => void;
  onSelect: (pageIndex: number) => void;
}

export function SearchPanel(props: SearchPanelProps) {
  const messages = computed(() => resolveMessages({ locale: props.store.locale.value, messages: props.store.messages.value }));
  const inputRef = { current: null as HTMLInputElement | null };
  const query = signal('');
  const submit = () => {
    const value = inputRef.current?.value ?? query.value;
    query.value = value;
    props.onSearch(value);
  };
  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    query.value = '';
    props.onClear();
  };
  return (
    <section class="bk-search-panel" style={computed(() => props.store.showSearch.value ? 'display:flex;' : 'display:none;')} aria-label={computed(() => messages.value.search || 'Search')}>
      <div class="bk-search-heading-row">
        <strong class="bk-search-heading">{computed(() => messages.value.search || 'Search')}</strong>
        <button type="button" class="bk-search-close" onClick={props.onClose} aria-label={computed(() => messages.value.closeSearch || 'Close search')}>×</button>
      </div>
      <div class="bk-search-form">
        <input ref={(el) => { inputRef.current = el; }} class="bk-search-input" type="search" placeholder={computed(() => messages.value.searchPlaceholder || 'Search PDF text')} value={computed(() => props.store.searchQuery.value)} onInput={(event) => { query.value = (event.currentTarget as HTMLInputElement).value; }} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} />
        <button type="button" class="bk-search-submit" onClick={submit}>{computed(() => messages.value.search || 'Search')}</button>
        <button type="button" class="bk-search-clear" onClick={clear}>{computed(() => messages.value.clearSearch || 'Clear')}</button>
      </div>
      <div class="bk-search-results" aria-live="polite">
        {computed(() => {
          const results = props.store.searchResults.value;
          if (!props.store.searchQuery.value) return null;
          if (!results.length) return <div class="bk-search-empty">{messages.value.noSearchResults || 'No results'}</div>;
          return <div class="bk-search-result-list">
            {results.map((result) => (
              <button type="button" class="bk-search-result" onClick={() => props.onSelect(result.pageIndex)}>
                <span class="bk-search-result-page">{result.pageNumber}</span>
                <span class="bk-search-result-text">{result.snippet}</span>
                <span class="bk-search-result-count">{result.matches}</span>
              </button>
            ))}
          </div>;
        })}
      </div>
    </section>
  );
}
