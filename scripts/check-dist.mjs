// Fails when dist is missing, older than the sources, or lacks the public names a release must ship.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);

const required = [
  'notePinSize', 'searchHighlightStyle', 'noteColors', 'noteGroups', 'noteGroupProvider',
  'DEFAULT_NOTE_COLORS', 'optimisticNotes', 'searchProgress'
];

let files;
try { files = walk('dist'); } catch { console.error('check-dist: dist is missing, run the build first'); process.exit(1); }

const bundle = files.filter((file) => /\.(js|css)$/.test(file) && !file.endsWith('.map')).map((file) => readFileSync(file, 'utf8')).join('\n');
const types = files.filter((file) => file.endsWith('.d.ts')).map((file) => readFileSync(file, 'utf8')).join('\n');
const newestSource = Math.max(...walk('src').map((file) => statSync(file).mtimeMs));
const oldestBuild = Math.min(...files.filter((file) => file.endsWith('.js')).map((file) => statSync(file).mtimeMs));

const problems = [];
for (const name of required) {
  if (!bundle.includes(name)) problems.push(`dist bundle does not contain "${name}"`);
}
for (const name of ['notePinSize', 'searchHighlightStyle', 'noteColors', 'noteGroups', 'noteGroupProvider', 'optimisticNotes']) {
  if (!types.includes(name)) problems.push(`dist type declarations do not contain "${name}"`);
}
if (oldestBuild < newestSource - 60_000) problems.push('dist is older than the sources, rebuild before publishing');

if (problems.length) {
  console.error('check-dist failed:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log(`check-dist ok: ${files.length} files, ${required.length} public names present`);
