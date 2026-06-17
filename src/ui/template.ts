/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

import type { FlipbookMessages } from '../i18n/service';
import { el } from '../utils/dom';

export interface FlipbookUiState {
  showThumbs: boolean;
}

export interface FlipbookUiOptions {
  allowDownload: boolean;
  hasDownloadUrl: boolean;
  totalPages: number;
  className?: string;
  whiteLabel: boolean;
  watermarkUrl?: string;
  messages: FlipbookMessages;
}

export interface FlipbookUiElements {
    wrapper: HTMLElement;
    area: HTMLElement;
    navPrev: HTMLElement;
    navNext: HTMLElement;
    bookWrapper: HTMLElement;
    book: HTMLElement;
    singleView: HTMLElement;
    singleImg: HTMLImageElement;
    settingsPanel: HTMLElement;
    toggleThumbs: HTMLInputElement;
    toggleSingle: HTMLInputElement;
    btnToggleThumbs: HTMLElement;
    bkPrev: HTMLElement;
    bkNext: HTMLElement;
    pageInfo: HTMLElement;
    zoomOut: HTMLElement;
    zoomIn: HTMLElement;
    fullscreen: HTMLElement;
    btnSettings: HTMLElement;
    downloadBtn?: HTMLElement;
    thumbs: HTMLElement;
}

export function buildFlipbookUi(state: FlipbookUiState, options: FlipbookUiOptions): FlipbookUiElements {
    const wrapperClass = ['bk-wrapper', options.className ?? ''].filter(Boolean).join(' ');

    const refs = {} as Partial<FlipbookUiElements>;

    const downloadBtn = (options.allowDownload && options.hasDownloadUrl)
        ? (refs.downloadBtn = el('button', { class: 'bk-btn bk-btn--download', id: 'bk-download', title: options.messages.downloadCatalog }, ['⬇️']))
        : undefined;

    const wrapper = el('div', { class: wrapperClass, id: 'bk-fullscreen-wrapper' }, [
        (refs.area = el('div', { class: 'bk-main-area', id: 'bk-area' }, [
            (refs.navPrev = el('button', { class: 'nav-float', id: 'nav-prev' }, ['❮'])),
            (refs.bookWrapper = el('div', { id: 'bk-book-wrapper' }, [
                (refs.book = el('div', { id: 'bk-book' })),
                (refs.singleView = el('div', { id: 'bk-single-view' }, [
                    (refs.singleImg = el('img', { id: 'bk-single-img', src: '' }) as HTMLImageElement)
                ]))
            ])),
            (refs.navNext = el('button', { class: 'nav-float', id: 'nav-next' }, ['❯'])),
            (refs.settingsPanel = el('div', { class: 'bk-settings-panel', id: 'settings-panel' }, [
                el('div', { class: 'setting-item' }, [
                    el('span', null, [options.messages.thumbnails]),
                    (refs.toggleThumbs = el('input', { type: 'checkbox', id: 'toggle-thumbs', checked: state.showThumbs }) as HTMLInputElement)
                ]),
                el('div', { class: 'setting-item' }, [
                    el('span', null, [options.messages.singlePageMode]),
                    (refs.toggleSingle = el('input', { type: 'checkbox', id: 'toggle-single' }) as HTMLInputElement)
                ])
            ])),
            (!options.whiteLabel ? el('a', {
                href: 'https://flipbookengine.com',
                target: '_blank',
                class: 'bk-attribution',
                title: 'Powered by FlipbookEngine'
            }, options.watermarkUrl ? [
                el('img', { src: options.watermarkUrl, class: 'bk-attribution-img', alt: 'FlipbookEngine Logo' })
            ] : [
                el('span', { class: 'bk-attribution-icon' }, ['⚡']),
                el('span', null, ['Powered by ']),
                el('strong', null, ['FlipbookEngine'])
            ]) : undefined)
        ])),
        el('div', { class: 'bk-toolbar' }, [
            el('div', { class: 'bk-btn-group' }, [
                (refs.btnToggleThumbs = el('button', { class: `bk-btn ${state.showThumbs ? 'active' : ''}`, id: 'btn-toggle-thumbs', title: options.messages.pages }, ['🖼️']))
            ]),
            el('div', { class: 'bk-btn-group bk-btn-group--center' }, [
                (refs.bkPrev = el('button', { class: 'bk-btn', id: 'bk-prev', title: options.messages.previous }, ['❮'])),
                (refs.pageInfo = el('span', { id: 'bk-page-info' }, [`1 / ${options.totalPages}`])),
                (refs.bkNext = el('button', { class: 'bk-btn', id: 'bk-next', title: options.messages.next }, ['❯']))
            ]),
            el('div', { class: 'bk-btn-group' }, [
                (refs.zoomOut = el('button', { class: 'bk-btn', id: 'bk-zoom-out', title: options.messages.zoomOut }, ['🔍-'])),
                (refs.zoomIn = el('button', { class: 'bk-btn', id: 'bk-zoom-in', title: options.messages.zoomIn }, ['🔍+'])),
                (refs.fullscreen = el('button', { class: 'bk-btn', id: 'bk-fullscreen', title: options.messages.fullscreen }, ['⛶'])),
                (refs.btnSettings = el('button', { class: 'bk-btn', id: 'btn-settings', title: options.messages.settings }, ['⚙️'])),
                downloadBtn
            ])
        ]),
        (refs.thumbs = el('div', { class: 'bk-thumbs', id: 'bk-thumbs', style: { display: state.showThumbs ? 'flex' : 'none' } }))
    ]);

    refs.wrapper = wrapper;
    return refs as FlipbookUiElements;
}

export function buildEmptyStateUi(message: string) {
    return el('div', { class: 'bk-empty-state' }, [
        el('h3', { class: 'bk-empty-state__title' }, [message])
    ]);
}
