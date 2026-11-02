import { computed } from '@preact/signals-core';

/** Parses a declaration list into a style object so domwise assigns each property (el.style.x) instead of a style attribute, which a nonce-only style-src blocks. */
export function css(declarations: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const part of declarations.split(';')) {
        const index = part.indexOf(':');
        if (index < 0) continue;
        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (!name) continue;
        result[name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value;
    }
    return result;
}

/** A computed style object from a function that returns a declaration list. */
export function styled(build: () => string) {
    return computed(() => css(build()));
}
