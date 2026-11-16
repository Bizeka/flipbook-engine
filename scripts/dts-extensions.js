// Adds explicit ".js" / "/index.js" extensions to relative specifiers in emitted declarations,
// so consumers on moduleResolution node16/nodenext resolve the types (issue #29).
import { existsSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g;
const SOURCE_EXT = ['.ts', '.tsx', '.d.ts', '.mts'];

export function dtsExtensions(root, outDir = 'dist', srcDir = 'src') {
  const out = resolve(root, outDir);
  const src = resolve(root, srcDir);
  const fix = (filePath, spec) => {
    if (/\.(js|mjs|cjs|json|css)$/.test(spec)) return spec;
    const rel = relative(out, dirname(filePath));
    const base = resolve(src, rel, spec);
    if (existsSync(base) && statSync(base).isDirectory()) return `${spec.replace(/\/$/, '')}/index.js`;
    if (SOURCE_EXT.some((ext) => existsSync(base + ext))) return `${spec}.js`;
    const outBase = resolve(dirname(filePath), spec);
    if (existsSync(outBase) && statSync(outBase).isDirectory()) return `${spec.replace(/\/$/, '')}/index.js`;
    return `${spec}.js`;
  };
  return (filePath, content) => ({
    filePath,
    content: content.replace(SPEC, (_, lead, q, spec) => `${lead}${q}${fix(filePath, spec)}${q}`)
  });
}
