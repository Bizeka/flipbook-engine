export interface FlipbookNoteMark { type: string; attrs?: Record<string, string | null>; }
export interface FlipbookNoteDocument { type: string; text?: string; content?: FlipbookNoteDocument[]; marks?: FlipbookNoteMark[]; }
export interface FlipbookNoteValue { text: string; document?: FlipbookNoteDocument; }
export interface FlipbookNoteEditor { getValue(): FlipbookNoteValue; setReadOnly(value: boolean): void; destroy(): void; }
export type FlipbookNoteEditorFactory = (container: HTMLElement, value: FlipbookNoteValue, signal: AbortSignal) => FlipbookNoteEditor | Promise<FlipbookNoteEditor>;

/** Render a restricted document as DOM nodes. Raw HTML is never accepted. */
export function renderNoteDocument(value: FlipbookNoteDocument | undefined, fallback: string): HTMLElement {
    const root = document.createElement('div'); root.className = 'bk-note-document';
    if (!value) { root.textContent = fallback; return root; }
    let remaining = 512;
    const render = (node: FlipbookNoteDocument, depth = 0): Node => {
        if (depth > 8 || remaining-- <= 0) return document.createTextNode('');
        if (node.type === 'text') {
            let content: Node = document.createTextNode(node.text ?? '');
            for (const mark of (node.marks ?? []).slice(0, 3)) {
                const element = document.createElement(mark.type === 'bold' ? 'strong' : mark.type === 'italic' ? 'em' : 'span');
                if (mark.type === 'textStyle') {
                    for (const [name, value] of Object.entries(mark.attrs ?? {})) {
                        if (!value) continue;
                        if (name === 'fontSize' && /^(12|14|16|18|20|24|28|32)px$/.test(value)) element.style.fontSize = value;
                        if ((name === 'color' || name === 'backgroundColor') && /^#[0-9a-f]{6}$/i.test(value)) element.style[name] = value;
                    }
                }
                element.append(content); content = element;
            }
            return content;
        }
        const element = document.createElement(node.type === 'hardBreak' ? 'br' : node.type === 'paragraph' ? 'p' : 'div');
        for (const child of node.content ?? []) { if (remaining <= 0) break; element.append(render(child, depth + 1)); }
        return element;
    };
    root.append(render(value)); return root;
}
