/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { signal, type Signal } from '@preact/signals-core';
import type {
    FlipbookEngine,
    FlipbookEngineEventMap,
    FlipbookEngineEventName
} from '../engine';

export type FlipbookPluginEventHandler<T extends FlipbookEngineEventName> =
    (payload: FlipbookEngineEventMap[T]) => void;

export interface FlipbookPluginToolbarButton {
    /** Stable identifier within the plugin namespace. */
    id: string;
    /** Visible label. Keep this short; hosts can localize it before registration. */
    label: string;
    title?: string;
    /** Optional text/icon token rendered by the built-in toolbar. */
    icon?: string;
    /** Toolbar group placement. */
    placement?: 'start' | 'end';
    disabled?: boolean | (() => boolean);
    onClick: () => void;
}

export interface FlipbookPluginPanel {
    /** Stable identifier within the plugin namespace. */
    id: string;
    title?: string;
    /** Called when the panel is mounted. Return a cleanup function when needed. */
    render: (container: HTMLElement) => void | (() => void);
}

export type FlipbookPluginApiHandler = (...args: any[]) => unknown | Promise<unknown>;

export interface FlipbookPluginContext {
    readonly engine: FlipbookEngine;
    readonly pluginName: string;
    readonly activePanelId: Signal<string | null>;
    registerToolbarButton(button: FlipbookPluginToolbarButton): () => void;
    registerPanel(panel: FlipbookPluginPanel): () => void;
    registerApi<T extends FlipbookPluginApiHandler>(name: string, handler: T): () => void;
    on<T extends FlipbookEngineEventName>(eventName: T, handler: FlipbookPluginEventHandler<T>): () => void;
    openPanel(id: string): void;
    closePanel(id?: string): void;
    addCleanup(cleanup: () => void): void;
}

export interface FlipbookPlugin {
    /** Stable plugin namespace. Duplicate names are rejected. */
    name: string;
    /** Installs contributions and may return an additional cleanup callback. */
    install: (engine: FlipbookEngine, context: FlipbookPluginContext) => void | (() => void);
}

interface RegisteredPlugin {
    plugin: FlipbookPlugin;
    context: FlipbookPluginContext;
    cleanups: Set<() => void>;
    toolbarButtons: Map<string, FlipbookPluginToolbarButton>;
    panels: Map<string, FlipbookPluginPanel>;
    apis: Map<string, FlipbookPluginApiHandler>;
}

/** Internal registry exposed to UI components through the engine. */
export class FlipbookPluginRegistry {
    readonly version = signal(0);
    readonly activePanelId = signal<string | null>(null);
    private readonly plugins = new Map<string, RegisteredPlugin>();

    install(engine: FlipbookEngine, plugin: FlipbookPlugin): void {
        const name = String(plugin?.name || '').trim();
        if (!name) throw new Error('Flipbook plugin name is required.');
        if (this.plugins.has(name)) throw new Error(`Flipbook plugin "${name}" is already installed.`);

        const registered: RegisteredPlugin = {
            plugin,
            context: undefined as unknown as FlipbookPluginContext,
            cleanups: new Set(),
            toolbarButtons: new Map(),
            panels: new Map(),
            apis: new Map()
        };

        const context: FlipbookPluginContext = {
            engine,
            pluginName: name,
            activePanelId: this.activePanelId,
            registerToolbarButton: (button) => {
                const id = this.requireContributionId(button?.id, 'toolbar button');
                if (registered.toolbarButtons.has(id)) throw new Error(`Plugin "${name}" already registered toolbar button "${id}".`);
                registered.toolbarButtons.set(id, button);
                this.version.value++;
                return () => {
                    if (registered.toolbarButtons.delete(id)) this.version.value++;
                };
            },
            registerPanel: (panel) => {
                const id = this.requireContributionId(panel?.id, 'panel');
                if (registered.panels.has(id)) throw new Error(`Plugin "${name}" already registered panel "${id}".`);
                registered.panels.set(id, panel);
                this.version.value++;
                return () => {
                    if (registered.panels.delete(id)) {
                        if (this.activePanelId.value === this.key(name, id)) this.activePanelId.value = null;
                        this.version.value++;
                    }
                };
            },
            registerApi: (id, handler) => {
                const apiId = this.requireContributionId(id, 'API');
                if (registered.apis.has(apiId)) throw new Error(`Plugin "${name}" already registered API "${apiId}".`);
                registered.apis.set(apiId, handler);
                this.version.value++;
                return () => {
                    if (registered.apis.delete(apiId)) this.version.value++;
                };
            },
            on: (eventName, handler) => {
                const unsubscribe = engine.on(eventName, handler);
                registered.cleanups.add(unsubscribe);
                return () => {
                    registered.cleanups.delete(unsubscribe);
                    unsubscribe();
                };
            },
            openPanel: (id) => {
                const panelId = this.requireContributionId(id, 'panel');
                if (!registered.panels.has(panelId)) throw new Error(`Plugin "${name}" has no panel "${panelId}".`);
                this.activePanelId.value = this.key(name, panelId);
            },
            closePanel: (id) => {
                const expected = id ? this.key(name, id) : null;
                if (!id || this.activePanelId.value === expected) this.activePanelId.value = null;
            },
            addCleanup: (cleanup) => {
                if (typeof cleanup === 'function') registered.cleanups.add(cleanup);
            }
        };

        registered.context = context;
        this.plugins.set(name, registered);
        try {
            const cleanup = plugin.install(engine, context);
            if (typeof cleanup === 'function') registered.cleanups.add(cleanup);
        }
        catch (error) {
            this.plugins.delete(name);
            registered.cleanups.forEach((cleanup) => cleanup());
            throw error;
        }
        this.version.value++;
    }

    uninstall(name: string): boolean {
        const registered = this.plugins.get(name);
        if (!registered) return false;
        if (this.activePanelId.value?.startsWith(name + ':')) this.activePanelId.value = null;
        registered.cleanups.forEach((cleanup) => cleanup());
        registered.toolbarButtons.clear();
        registered.panels.clear();
        registered.apis.clear();
        this.plugins.delete(name);
        this.version.value++;
        return true;
    }

    clear(): void {
        Array.from(this.plugins.keys()).forEach((name) => this.uninstall(name));
    }

    getPluginNames(): string[] {
        return Array.from(this.plugins.keys());
    }

    getToolbarButtons(): Array<FlipbookPluginToolbarButton & { pluginName: string; key: string }> {
        const result: Array<FlipbookPluginToolbarButton & { pluginName: string; key: string }> = [];
        this.plugins.forEach((registered, pluginName) => registered.toolbarButtons.forEach((button, id) => {
            result.push({ ...button, pluginName, key: this.key(pluginName, id) });
        }));
        return result;
    }

    getPanels(): Array<FlipbookPluginPanel & { pluginName: string; key: string }> {
        const result: Array<FlipbookPluginPanel & { pluginName: string; key: string }> = [];
        this.plugins.forEach((registered, pluginName) => registered.panels.forEach((panel, id) => {
            result.push({ ...panel, pluginName, key: this.key(pluginName, id) });
        }));
        return result;
    }

    getApi<T extends FlipbookPluginApiHandler>(pluginName: string, id: string): T | undefined {
        return this.plugins.get(pluginName)?.apis.get(id) as T | undefined;
    }

    async callApi<T = unknown>(pluginName: string, id: string, ...args: any[]): Promise<T> {
        const handler = this.getApi(pluginName, id);
        if (!handler) throw new Error(`Plugin API "${pluginName}.${id}" is not registered.`);
        return await handler(...args) as T;
    }

    private key(pluginName: string, id: string): string {
        return `${pluginName}:${id}`;
    }

    private requireContributionId(id: string | undefined, kind: string): string {
        const normalized = String(id || '').trim();
        if (!normalized) throw new Error(`Flipbook plugin ${kind} id is required.`);
        return normalized;
    }
}

