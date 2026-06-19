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
import { 
    showThumbs, 
    isSingleMode, 
    currentPage, 
    totalPages, 
    isZoomed, 
    allowDownload, 
    hasDownloadUrl,
    isDoublePageLayout,
    soundEnabled,
    isAutoPlaying
} from '../state/store';
import { resolveMessages } from '../i18n/service';

interface ToolbarProps {
    onToggleThumbs: () => void;
    onToggleSingleMode: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onDownload?: () => void;
    onSoundToggle: () => void;
    onNextPage: () => void;
    onPrevPage: () => void;
    onToggleAutoPlay: () => void;
    onToggleFullscreen: () => void;
}

export function Toolbar(props: ToolbarProps) {
    const messages = resolveMessages();

    return (
        <div class="bk-toolbar">
            <div class="bk-btn-group">
                <button 
                    class={computed(() => `bk-btn ${showThumbs.value ? 'active' : ''}`)} 
                    onClick={props.onToggleThumbs}
                    title={messages.thumbnails || 'Thumbnails'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </button>

                <button 
                    class={computed(() => `bk-btn bz-hide-mobile ${isSingleMode.value ? 'active' : ''}`)} 
                    onClick={props.onToggleSingleMode}
                    title={messages.singlePageMode || 'Single Page'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </button>

                <button 
                    class={computed(() => `bk-btn ${isAutoPlaying.value ? 'active' : ''}`)} 
                    onClick={props.onToggleAutoPlay}
                    title={computed(() => isAutoPlaying.value ? (messages.pause || 'Pause') : (messages.play || 'Play'))}
                >
                    <svg style={{ display: computed(() => isAutoPlaying.value ? 'block' : 'none') as any }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    
                    <svg style={{ display: computed(() => !isAutoPlaying.value ? 'block' : 'none') as any }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
            </div>

            <div class="bk-btn-group bk-btn-group--center">
                <button class="bk-btn" onClick={props.onPrevPage} title={messages.previous || 'Previous'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <span class="bz-page-info">
                    {computed(() => {
                        const current = currentPage.value;
                        const total = totalPages.value;
                        if (isSingleMode.value || current === 0 || current >= total - 1) {
                            return `${current + 1} / ${total}`;
                        }
                        const left = current % 2 === 1 ? current : current - 1;
                        return `${left + 1}-${left + 2} / ${total}`;
                    })}
                </span>
                <button class="bk-btn" onClick={props.onNextPage} title={messages.next || 'Next'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>

            <div class="bk-btn-group">
                <button class="bk-btn" onClick={props.onZoomIn} title={messages.zoomIn || 'Zoom In'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button 
                    class={computed(() => `bk-btn ${isZoomed.value ? 'active' : ''}`)} 
                    onClick={props.onZoomOut} 
                    title={messages.zoomOut || 'Zoom Out'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                
                <button class="bk-btn bk-btn--fullscreen" onClick={props.onToggleFullscreen} title={messages.fullscreen || 'Fullscreen'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
                </button>

                {computed(() => {
                    if (allowDownload.value && props.onDownload) {
                        return (
                            <button class="bk-btn bk-btn--download" onClick={props.onDownload} title={messages.downloadCatalog || 'Download'}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </button>
                        );
                    }
                    return null;
                })}

                <button 
                    // @ts-ignore
                    class={computed(() => `bk-btn ${!soundEnabled.value ? 'muted' : ''}`)}
                    onClick={() => {
                        soundEnabled.value = !soundEnabled.value;
                        props.onSoundToggle();
                    }} 
                    title="Sound"
                >
                    <svg style={{ display: computed(() => soundEnabled.value ? 'block' : 'none') as any }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                    
                    <svg style={{ display: computed(() => !soundEnabled.value ? 'block' : 'none') as any }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                </button>
            </div>
        </div>
    );
}
