import { computed } from '@preact/signals-core';
/**
 * @license FlipbookEngine v0.8.0
 * Copyright (c) 2026 Murat Dogan
 *
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 *
 * 1. Open Source (AGPLv3): You may use, modify, and distribute this software
 *    under the terms of the GNU Affero General Public License v3.0.
 *
 * 2. Commercial License: If you wish to use this software in commercial,
 *    closed-source, or SaaS products without the AGPLv3 obligations,
 *    you must purchase a Commercial License from:
 *    https://flipbookengine.com/pricing
 */


import { Toolbar } from './Toolbar';
import { Thumbnails } from './Thumbnails';
import { TableOfContents } from './TableOfContents';
import { NotesPanel } from './NotesPanel';
import { Viewer } from './Viewer';
import { NavigationArrows } from './NavigationArrows';
import { SearchPanel } from './SearchPanel';
import { PluginPanels } from './PluginPanels';
import type { FlipbookSearchOptions } from '../model/search';
import type { FlipbookHotspot } from '../model/hotspots';
import type { FlipbookAnnotation } from '../model/annotations';
import type { FlipbookStore } from '../state/store';
import type { PageFlipAdapter } from '../adapters/PageFlipAdapter';
import type { InteractionManager } from '../core/InteractionManager';
import type { FlipbookPluginRegistry } from '../plugins';

interface AppProps {
    pageFlipAdapterRef: { current: PageFlipAdapter | null };
    interactionManagerRef: { current: InteractionManager | null };
    bookWrapperRef: (el: HTMLElement) => void;
    bookSizerRef: (el: HTMLElement) => void;
    bookContainerRef: (el: HTMLElement) => void;
    className?: string;
    onDownload: () => void;
    onShare: () => void;
    onToggleBookmark: () => void;
    onToggleNotes: () => void;
    onSaveNote: (note: string) => void;
    onClearNote: () => void;
    onCloseNotes: () => void;
    onSearch: (query: string, options?: FlipbookSearchOptions) => void;
    onClearSearch: () => void;
    onCloseSearch: () => void;
    onSelectSearchResult: (pageIndex: number) => void;
    onHotspotActivate: (hotspot: FlipbookHotspot) => void;
    onHotspotClose: () => void;
    onAnnotationActivate: (annotation: FlipbookAnnotation) => void;
    onAnnotationClose: () => void;
    onToggleFullscreen: () => void;
    store: FlipbookStore;
    pluginRegistry?: FlipbookPluginRegistry;
}

export function App(props: AppProps) {
    const handleToggleThumbs = () => {
        props.store.showThumbs.value = !props.store.showThumbs.value;
    };

    const handleToggleToc = () => {
        props.store.showToc.value = !props.store.showToc.value;
    };

    const handleToggleNotes = () => {
        props.onToggleNotes();
    };

    const handleToggleSingleMode = () => {
        props.store.isSingleMode.value = !props.store.isSingleMode.value;
    };

    const handleToggleAutoPlay = () => {
        props.store.isAutoPlaying.value = !props.store.isAutoPlaying.value;
    };

    const handleZoomIn = () => {
        props.interactionManagerRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
        props.interactionManagerRef.current?.zoomOut();
    };

    const handleToggleFullscreen = () => props.onToggleFullscreen();
    const handleTocEntryClick = (pageIndex: number) => {
        props.store.currentPage.value = pageIndex;
        props.store.showToc.value = false;
    };

    const handleThumbClick = (index: number) => {
        if (props.store.currentPage.value !== index) {
            props.store.currentPage.value = index;
            props.pageFlipAdapterRef.current?.playSound();
        }
    };

    const handleNextPage = () => {
        props.pageFlipAdapterRef.current?.turnToNextPage();
    };

    const handlePrevPage = () => {
        props.pageFlipAdapterRef.current?.turnToPrevPage();
    };

    return (
        <div
            class={computed(() => `bk-wrapper bk-theme-${props.store.themeMode.value} ${props.className || ''}`)}
        >
            <div class="bk-main-area">
                <Viewer store={props.store}
                    bookWrapperRef={props.bookWrapperRef}
                    bookSizerRef={props.bookSizerRef}
                    bookContainerRef={props.bookContainerRef}
                    onHotspotActivate={props.onHotspotActivate}
                    onHotspotClose={props.onHotspotClose}
                    onAnnotationActivate={props.onAnnotationActivate}
                    onAnnotationClose={props.onAnnotationClose}
                />

                <NavigationArrows store={props.store}
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                />

                {!props.store.whiteLabel.value ? (
                    <div class="bk-watermark">
                        Powered by <a href="https://flipbookengine.com" target="_blank" rel="noopener" style="text-decoration: underline;">FlipbookEngine</a>
                    </div>
                ) : null}
                <TableOfContents store={props.store} onEntryClick={handleTocEntryClick} />
                <SearchPanel store={props.store} onSearch={props.onSearch} onClear={props.onClearSearch} onClose={props.onCloseSearch} onSelect={props.onSelectSearchResult} />
                <NotesPanel store={props.store} onSave={props.onSaveNote} onClear={props.onClearNote} onClose={props.onCloseNotes} />
                {props.pluginRegistry ? <PluginPanels registry={props.pluginRegistry} /> : null}
            </div>

            <Toolbar store={props.store}
                onToggleThumbs={handleToggleThumbs}
                onToggleToc={handleToggleToc}
                onToggleSearch={() => props.store.showSearch.value = !props.store.showSearch.value}
                onToggleSingleMode={handleToggleSingleMode}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onDownload={props.onDownload}
                onShare={props.onShare}
                onToggleBookmark={props.onToggleBookmark}
                onToggleNotes={handleToggleNotes}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                onSoundToggle={() => props.store.soundEnabled.value = !props.store.soundEnabled.value}
                onToggleAutoPlay={handleToggleAutoPlay}
                onToggleFullscreen={handleToggleFullscreen}
                pluginRegistry={props.pluginRegistry}
            />

            <Thumbnails store={props.store}
                onThumbClick={handleThumbClick}
            />
        </div>
    );
}



