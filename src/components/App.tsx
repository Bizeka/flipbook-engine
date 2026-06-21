/**
 * @license FlipbookEngine v0.2.4
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
import { computed } from '@preact/signals-core';
import { Toolbar } from './Toolbar';
import { Thumbnails } from './Thumbnails';
import { Viewer } from './Viewer';
import { NavigationArrows } from './NavigationArrows';
import { 
    themeMode, 
    whiteLabel, 
    showThumbs, 
    isSingleMode,
    currentPage,
    isAutoPlaying,
    soundEnabled
} from '../state/store';
import type { PageFlipAdapter } from '../adapters/PageFlipAdapter';
import type { InteractionManager } from '../core/InteractionManager';

interface AppProps {
    pageFlipAdapterRef: { current: PageFlipAdapter | null };
    interactionManagerRef: { current: InteractionManager | null };
    bookWrapperRef: (el: HTMLElement) => void;
    bookSizerRef: (el: HTMLElement) => void;
    bookContainerRef: (el: HTMLElement) => void;
    className?: string;
    onDownload: () => void;
}

export function App(props: AppProps) {
    const handleToggleThumbs = () => {
        showThumbs.value = !showThumbs.value;
    };

    const handleToggleSingleMode = () => {
        isSingleMode.value = !isSingleMode.value;
    };

    const handleToggleAutoPlay = () => {
        isAutoPlaying.value = !isAutoPlaying.value;
    };

    const handleZoomIn = () => {
        props.interactionManagerRef.current?.zoomIn();
    };

    const handleZoomOut = () => {
        props.interactionManagerRef.current?.zoomOut();
    };

    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            // Find the closest container or just use documentElement
            const el = document.querySelector('.bk-wrapper')?.parentElement || document.documentElement;
            el.requestFullscreen().catch(err => console.warn('Fullscreen err:', err));
        } else {
            document.exitFullscreen().catch(err => console.warn('Exit fullscreen err:', err));
        }
    };

    const handleThumbClick = (index: number) => {
        if (currentPage.value !== index) {
            currentPage.value = index;
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
            class={computed(() => `bk-wrapper bk-theme-${themeMode.value} ${props.className || ''}`)}
        >
            <div class="bk-main-area">
                <Viewer 
                    bookWrapperRef={props.bookWrapperRef}
                    bookSizerRef={props.bookSizerRef}
                    bookContainerRef={props.bookContainerRef}
                />
                
                <NavigationArrows 
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                />

                {!whiteLabel.value ? (
                    <div class="bk-watermark">
                        Powered by <a href="https://flipbookengine.com" target="_blank" rel="noopener" style="text-decoration: underline;">FlipbookEngine</a>
                    </div>
                ) : null}
            </div>

            <Toolbar 
                onToggleThumbs={handleToggleThumbs}
                onToggleSingleMode={handleToggleSingleMode}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onDownload={props.onDownload}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                onSoundToggle={() => soundEnabled.value = !soundEnabled.value}
                onToggleAutoPlay={handleToggleAutoPlay}
                onToggleFullscreen={handleToggleFullscreen}
            />
            
            <Thumbnails 
                onThumbClick={handleThumbClick}
            />
        </div>
    );
}
