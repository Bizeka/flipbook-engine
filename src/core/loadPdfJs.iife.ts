/** Browser (IIFE) build: PDF.js comes from the page as the `pdfjsLib` global, as before. */
export async function loadPdfJs(): Promise<any> {
    const lib = (globalThis as any).pdfjsLib;
    if (!lib) throw new Error('pdfjsLib global was not found. Load pdf.js before FlipbookEngine.');
    return lib;
}
