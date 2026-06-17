export async function resolve(specifier, context, nextResolve) {
  if (specifier.includes('.css') || specifier.includes('.css?inline') || specifier.endsWith('?url')) {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export%20default%20%27%27%3B'
    };
  }
  if (specifier === 'pdfjs-dist') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export%20const%20getDocument%20%3D%20%28%29%20%3D%3E%20%28%7B%20promise%3A%20Promise.resolve%28%7B%20numPages%3A%202%2C%20getPage%3A%20%28%29%20%3D%3E%20Promise.resolve%28%7B%20getViewport%3A%20%28%29%20%3D%3E%20%28%7B%20width%3A%20600%2C%20height%3A%20800%20%7D%29%2C%20render%3A%20%28%29%20%3D%3E%20%28%7B%20promise%3A%20Promise.resolve%28%29%20%7D%29%20%7D%29%20%7D%29%20%7D%29%3Bexport%20const%20GlobalWorkerOptions%20%3D%20%7B%20workerSrc%3A%20%27%27%20%7D%3B'
    };
  }
  if (specifier === 'page-flip') {
    return {
      format: 'module',
      shortCircuit: true,
      url: 'data:text/javascript,export%20class%20PageFlip%20%7B%20constructor%28%29%20%7B%7D%20destroy%28%29%20%7B%7D%20loadFromHTML%28%29%20%7B%7D%20on%28%29%20%7B%7D%20getCurrentPageIndex%28%29%20%7B%20return%200%3B%20%7D%20turnToPage%28%29%20%7B%7D%20getPageCount%28%29%20%7B%20return%202%3B%20%7D%20flip%28%29%20%7B%7D%20flipNext%28%29%20%7B%7D%20flipPrev%28%29%20%7B%7D%20update%28%29%20%7B%7D%20%7D'
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('data:text/javascript,')) {
    const cleanUrl = url.split('?')[0];
    const source = decodeURIComponent(cleanUrl.substring('data:text/javascript,'.length));
    return {
      format: 'module',
      shortCircuit: true,
      source
    };
  }
  return nextLoad(url, context);
}
