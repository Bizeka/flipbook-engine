/**
 * @license FlipbookEngine v0.6.5
 * Copyright (c) 2026 Murat Dogan
 *
 * This source code is dual-licensed under the AGPLv3 and a Commercial License.
 */
import type {
  FlipbookEngine,
  FlipbookEngineEventMap,
  FlipbookEngineEventName,
  FlipbookEngineOptions
} from './engine';
import type { FlipbookSearchOptions, FlipbookSearchResult } from './model/search';

export type FlipbookEmbedCommandName =
  | 'goToPage'
  | 'nextPage'
  | 'prevPage'
  | 'setZoom'
  | 'setSingleMode'
  | 'updateOptions'
  | 'toggleFullscreen'
  | 'search'
  | 'clearSearch'
  | 'getSearchResults'
  | 'getState';

export interface FlipbookEmbedOptions {
  /**
   * Origins allowed to send commands. Defaults to the current origin.
   * Use an explicit origin for cross-origin iframe integrations.
   */
  allowedOrigins?: string[];
  /** Origin used for messages sent to the embedding parent. */
  targetOrigin?: string;
  /** Response timeout for the parent-side controller. */
  responseTimeout?: number;
}

export interface FlipbookEmbedCommand {
  type: 'flipbook:command';
  command: FlipbookEmbedCommandName;
  requestId?: string;
  payload?: unknown;
}

export interface FlipbookEmbedEvent<T extends FlipbookEngineEventName = FlipbookEngineEventName> {
  type: 'flipbook:event';
  event: T;
  payload: FlipbookEngineEventMap[T];
}

export interface FlipbookEmbedResponse {
  type: 'flipbook:response';
  requestId?: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface FlipbookEmbedState {
  currentPage: number;
  totalPages: number;
  zoom: number;
}

type AnyEventHandler = (payload: unknown) => void;

const EMBED_COMMAND = 'flipbook:command';
const EMBED_EVENT = 'flipbook:event';
const EMBED_RESPONSE = 'flipbook:response';

function getWindow(): Window | null {
  return typeof window === 'undefined' ? null : window;
}

function normalizeOrigins(options: FlipbookEmbedOptions, currentOrigin: string): string[] {
  const configured = options.allowedOrigins?.filter(Boolean);
  return configured?.length ? configured : [currentOrigin];
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function readNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return value;
}

/**
 * Runs inside an iframe and exposes a restricted postMessage command bridge.
 * Commands are accepted only from window.parent and configured origins.
 */
export class FlipbookEmbedBridge {
  private readonly engine: FlipbookEngine;
  private readonly options: FlipbookEmbedOptions;
  private readonly listener: (event: MessageEvent) => void;
  private readonly unsubs: Array<() => void> = [];
  private connected = false;
  private parentOrigin: string | null = null;

  constructor(engine: FlipbookEngine, options: FlipbookEmbedOptions = {}) {
    this.engine = engine;
    this.options = options;
    this.listener = (event) => { void this.handleMessage(event); };
  }

  connect(): this {
    if (this.connected) return this;
    const currentWindow = getWindow();
    if (!currentWindow || currentWindow.parent === currentWindow) return this;

    this.connected = true;
    currentWindow.addEventListener('message', this.listener);
    (Object.keys(this.engineEventNames) as FlipbookEngineEventName[]).forEach((eventName) => {
      this.unsubs.push(this.engine.on(eventName, (payload) => {
        this.postEvent(eventName, payload);
      }));
    });
    return this;
  }

  disconnect(): void {
    if (!this.connected) return;
    getWindow()?.removeEventListener('message', this.listener);
    this.unsubs.splice(0).forEach((unsubscribe) => unsubscribe());
    this.connected = false;
    this.parentOrigin = null;
  }

  private readonly engineEventNames: Record<FlipbookEngineEventName, true> = {
    init: true,
    destroy: true,
    pageChange: true,
    zoomChange: true,
    thumbsToggle: true,
    tocToggle: true,
    singlePageModeChange: true,
    orientationChange: true,
    progress: true,
    error: true,
    deepLinkChange: true,
    bookmarkChange: true,
    noteChange: true,
    searchChange: true,
    hotspotActivate: true,
    annotationActivate: true
  };

  private isAllowedOrigin(origin: string): boolean {
    const currentWindow = getWindow();
    const currentOrigin = currentWindow?.location.origin ?? '';
    return normalizeOrigins(this.options, currentOrigin).includes('*')
      || normalizeOrigins(this.options, currentOrigin).includes(origin);
  }

  private post(message: FlipbookEmbedEvent | FlipbookEmbedResponse): void {
    const currentWindow = getWindow();
    const parent = currentWindow?.parent;
    if (!currentWindow || !parent || parent === currentWindow) return;

    // Do not guess among multiple allowed origins before the parent has
    // authenticated itself with a message; this avoids cross-origin event leakage.
    const origin = this.options.targetOrigin
      ?? this.parentOrigin
      ?? currentWindow.location.origin;
    parent.postMessage(message, origin);
  }

  private postEvent<T extends FlipbookEngineEventName>(event: T, payload: FlipbookEngineEventMap[T]): void {
    this.post({ type: EMBED_EVENT, event, payload } as FlipbookEmbedEvent);
  }

  private respond(requestId: string | undefined, result?: unknown, error?: unknown): void {
    this.post({
      type: EMBED_RESPONSE,
      requestId,
      ok: !error,
      ...(error ? { error: error instanceof Error ? error.message : String(error) } : { result })
    });
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const currentWindow = getWindow();
    if (!currentWindow || event.source !== currentWindow.parent || !this.isAllowedOrigin(event.origin)) return;

    const message = readRecord(event.data);
    if (message.type !== EMBED_COMMAND || typeof message.command !== 'string') return;
    this.parentOrigin = event.origin;
    const requestId = typeof message.requestId === 'string' ? message.requestId : undefined;
    try {
      const payload = readRecord(message.payload);
      let result: unknown;
      switch (message.command as FlipbookEmbedCommandName) {
        case 'goToPage':
          this.engine.goToPage(Math.trunc(readNumber(payload.pageIndex, 'pageIndex')));
          result = this.getState();
          break;
        case 'nextPage':
          this.engine.nextPage();
          result = this.getState();
          break;
        case 'prevPage':
          this.engine.prevPage();
          result = this.getState();
          break;
        case 'setZoom':
          this.engine.setZoom(readNumber(payload.zoom, 'zoom'));
          result = this.getState();
          break;
        case 'setSingleMode':
          if (typeof payload.isSingle !== 'boolean') throw new Error('isSingle must be a boolean.');
          this.engine.setSingleMode(payload.isSingle);
          result = this.getState();
          break;
        case 'updateOptions':
          this.engine.updateOptions(payload.options as Partial<FlipbookEngineOptions>);
          result = this.getState();
          break;
        case 'toggleFullscreen':
          this.engine.toggleFullscreen();
          result = this.getState();
          break;
        case 'search':
          result = await this.engine.search(String(payload.query ?? ''), payload.options as FlipbookSearchOptions);
          break;
        case 'clearSearch':
          this.engine.clearSearch();
          result = this.getState();
          break;
        case 'getSearchResults':
          result = this.engine.getSearchResults();
          break;
        case 'getState':
          result = this.getState();
          break;
        default:
          throw new Error(`Unknown embed command: ${message.command}`);
      }
      this.respond(requestId, result);
    } catch (error) {
      this.respond(requestId, undefined, error);
    }
  }

  private getState(): FlipbookEmbedState {
    return {
      currentPage: this.engine.getCurrentPage(),
      totalPages: this.engine.getTotalPages(),
      zoom: this.engine.getZoom()
    };
  }
}

export interface FlipbookEmbedController {
  send(command: FlipbookEmbedCommandName, payload?: unknown): Promise<unknown>;
  goToPage(pageIndex: number): Promise<FlipbookEmbedState>;
  nextPage(): Promise<FlipbookEmbedState>;
  prevPage(): Promise<FlipbookEmbedState>;
  setZoom(zoom: number): Promise<FlipbookEmbedState>;
  setSingleMode(isSingle: boolean): Promise<FlipbookEmbedState>;
  updateOptions(options: Partial<FlipbookEngineOptions>): Promise<FlipbookEmbedState>;
  toggleFullscreen(): Promise<FlipbookEmbedState>;
  search(query: string, options?: FlipbookSearchOptions): Promise<FlipbookSearchResult[]>;
  clearSearch(): Promise<FlipbookEmbedState>;
  getSearchResults(): Promise<FlipbookSearchResult[]>;
  getState(): Promise<FlipbookEmbedState>;
  on<T extends FlipbookEngineEventName>(event: T, handler: (payload: FlipbookEngineEventMap[T]) => void): () => void;
  destroy(): void;
}

export function createFlipbookEmbedController(
  iframe: HTMLIFrameElement,
  options: FlipbookEmbedOptions = {}
): FlipbookEmbedController {
  const currentWindow = getWindow();
  const targetOrigin = options.targetOrigin ?? currentWindow?.location.origin ?? '*';
  const timeout = options.responseTimeout ?? 5000;
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void; timer: ReturnType<typeof setTimeout> }>();
  const handlers: Partial<Record<FlipbookEngineEventName, Set<AnyEventHandler>>> = {};
  let sequence = 0;

  const allowedOrigin = (origin: string) => targetOrigin === '*' || origin === targetOrigin;
  const listener = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || !allowedOrigin(event.origin)) return;
    const message = readRecord(event.data);
    if (message.type === EMBED_RESPONSE && typeof message.requestId === 'string') {
      const request = pending.get(message.requestId);
      if (!request) return;
      pending.delete(message.requestId);
      clearTimeout(request.timer);
      if (message.ok) request.resolve(message.result);
      else request.reject(new Error(typeof message.error === 'string' ? message.error : 'Embed command failed.'));
      return;
    }
    if (message.type === EMBED_EVENT && typeof message.event === 'string') {
      handlers[message.event as FlipbookEngineEventName]?.forEach((handler) => handler(message.payload));
    }
  };

  currentWindow?.addEventListener('message', listener);

  const send = (command: FlipbookEmbedCommandName, payload?: unknown): Promise<unknown> => {
    const requestId = `flipbook-${++sequence}`;
    return new Promise((resolve, reject) => {
      if (!iframe.contentWindow) {
        reject(new Error('The embed iframe is not ready.'));
        return;
      }
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Embed command timed out: ${command}`));
      }, timeout);
      pending.set(requestId, { resolve, reject, timer });
      iframe.contentWindow.postMessage({ type: EMBED_COMMAND, command, payload, requestId }, targetOrigin);
    });
  };

  const controller: FlipbookEmbedController = {
    send,
    goToPage: (pageIndex) => send('goToPage', { pageIndex }) as Promise<FlipbookEmbedState>,
    nextPage: () => send('nextPage') as Promise<FlipbookEmbedState>,
    prevPage: () => send('prevPage') as Promise<FlipbookEmbedState>,
    setZoom: (zoom) => send('setZoom', { zoom }) as Promise<FlipbookEmbedState>,
    setSingleMode: (isSingle) => send('setSingleMode', { isSingle }) as Promise<FlipbookEmbedState>,
    updateOptions: (update) => send('updateOptions', { options: update }) as Promise<FlipbookEmbedState>,
    toggleFullscreen: () => send('toggleFullscreen') as Promise<FlipbookEmbedState>,
    search: (query, searchOptions) => send('search', { query, options: searchOptions }) as Promise<FlipbookSearchResult[]>,
    clearSearch: () => send('clearSearch') as Promise<FlipbookEmbedState>,
    getSearchResults: () => send('getSearchResults') as Promise<FlipbookSearchResult[]>,
    getState: () => send('getState') as Promise<FlipbookEmbedState>,
    on: (event, handler) => {
      const set = handlers[event] ?? new Set<AnyEventHandler>();
      set.add(handler as AnyEventHandler);
      handlers[event] = set;
      return () => set.delete(handler as AnyEventHandler);
    },
    destroy: () => {
      currentWindow?.removeEventListener('message', listener);
      pending.forEach((request) => {
        clearTimeout(request.timer);
        request.reject(new Error('Embed controller destroyed.'));
      });
      pending.clear();
      Object.keys(handlers).forEach((event) => delete handlers[event as FlipbookEngineEventName]);
    }
  };
  return controller;
}
