/**
 * FlipbookEngine
 * Copyright (c) 2026 Murat Dogan
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * https://flipbookengine.com
 */

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs?: Record<string, any> | null,
    children?: (string | Node | boolean | undefined | null)[] | string | Node | boolean
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);

    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (value === undefined || value === null || value === false) continue;
            
            if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.substring(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else if (key === 'className' || key === 'class') {
                element.className = value.toString();
            } else if (key === 'dataset' && typeof value === 'object') {
                for (const [dataKey, dataValue] of Object.entries(value)) {
                    if (dataValue !== undefined && dataValue !== null) {
                        element.dataset[dataKey] = dataValue.toString();
                    }
                }
            } else if (key === 'style' && typeof value === 'object') {
                for (const [styleKey, styleValue] of Object.entries(value)) {
                    (element.style as any)[styleKey] = styleValue;
                }
            } else if (key === 'innerHTML') {
                element.innerHTML = value.toString();
            } else {
                element.setAttribute(key, value === true ? '' : value.toString());
            }
        }
    }

    if (children) {
        const childArray = Array.isArray(children) ? children : [children];
        for (const child of childArray) {
            if (child === undefined || child === null || child === false) continue;
            if (typeof child === 'string' || typeof child === 'number') {
                element.appendChild(document.createTextNode(child.toString()));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        }
    }

    return element;
}
