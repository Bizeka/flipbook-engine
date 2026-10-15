/** DOM event listeners require the AbortSignal from their own document realm. */
export function domSignal(element: HTMLElement, session: AbortSignal): AbortSignal {
    const Controller = element.ownerDocument.defaultView?.AbortController ?? AbortController;
    const controller = new Controller();
    if (session.aborted) controller.abort();
    else session.addEventListener('abort', () => controller.abort(), { once: true });
    return controller.signal;
}
