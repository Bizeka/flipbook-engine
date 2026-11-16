// Packs the package, installs it into a throwaway consumer project and type-checks
// tests/types/consumer.mts under nodenext and bundler resolution with skipLibCheck off.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dev = pkg.devDependencies;
const dir = mkdtempSync(join(tmpdir(), 'fbe-types-'));
const run = (cmd, cwd = dir) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' });

try {
  const tarball = run(`npm pack --silent --pack-destination "${dir}"`, root).trim().split('\n').pop();
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
  const deps = [`./${tarball}`, `typescript@${dev.typescript}`, `react@${dev.react}`, `@types/react@${dev['@types/react']}`, `vue@${dev.vue}`];
  run(`npm install --silent --no-audit --no-fund ${deps.map((d) => `"${d}"`).join(' ')}`);
  copyFileSync(join(root, 'tests/types/consumer.mts'), join(dir, 'consumer.mts'));

  const modes = [{ module: 'nodenext', moduleResolution: 'nodenext' }, { module: 'esnext', moduleResolution: 'bundler' }];
  const failures = [];
  for (const mode of modes) {
    const config = { compilerOptions: { ...mode, target: 'es2022', lib: ['es2022', 'dom'], strict: true, noEmit: true, skipLibCheck: false, jsx: 'react-jsx' }, files: ['consumer.mts'] };
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
    try { run('npx tsc -p tsconfig.json'); console.log(`check-types ok: ${mode.moduleResolution}`); }
    catch (error) { failures.push(`${mode.moduleResolution}:\n${error.stdout}${error.stderr}`); }
  }
  if (failures.length) { console.error('check-types failed\n' + failures.join('\n')); process.exitCode = 1; }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
