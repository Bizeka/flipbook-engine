declare const __FLIPBOOK_VERSION__: string | undefined;

/** The package version, filled in by the build from package.json; 'development' when running from source. */
export const VERSION: string = typeof __FLIPBOOK_VERSION__ === 'string' ? __FLIPBOOK_VERSION__ : 'development';
