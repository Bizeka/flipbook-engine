/**
 * @license FlipbookEngine v1.0.0
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computed } from '@preact/signals-core';
import type { FlipbookPluginPanel, FlipbookPluginRegistry } from '../plugins';

function PluginPanelHost(props: { panel: FlipbookPluginPanel; panelKey: string; registry: FlipbookPluginRegistry }) {
    let cleanup: (() => void) | undefined;
    const mount = (element: HTMLElement | null) => {
        cleanup?.();
        cleanup = undefined;
        if (element) cleanup = props.panel.render(element) || undefined;
    };

    return (
        <section
            class={computed(() => `bk-plugin-panel ${props.registry.activePanelId.value === props.panelKey ? 'is-open' : ''}`)}
            aria-hidden={computed(() => props.registry.activePanelId.value === props.panelKey ? 'false' : 'true')}
            aria-label={props.panel.title || props.panel.id}
        >
            <div class="bk-plugin-panel-content" ref={mount}></div>
        </section>
    );
}

export function PluginPanels(props: { registry: FlipbookPluginRegistry }) {
    const panels = props.registry.getPanels();

    return (
        <div class="bk-plugin-panels">
            {panels.map((panel) => <PluginPanelHost panel={panel} panelKey={panel.key} registry={props.registry} />)}
        </div>
    );
}

