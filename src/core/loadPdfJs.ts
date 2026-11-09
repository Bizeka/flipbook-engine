/** Loads PDF.js on demand, so importing the package in Node or during SSR never evaluates it. */
export async function loadPdfJs(): Promise<any> {
    return import('pdfjs-dist');
}
