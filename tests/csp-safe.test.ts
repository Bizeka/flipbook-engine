import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A nonce-only style-src allows el.style.x = ..., but blocks cssText, style attributes and string style props.
const forbidden: Array<[string, RegExp]> = [
  ['cssText', /cssText/],
  ['setAttribute("style"', /setAttribute[(] *['"`]style['"`]/],
  ['style= attribute in a markup string', /(^|[^a-z-])style=[^{ ]/],
  ['string literal style prop', /style=[{] *['"`]/]
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('the guard patterns catch the forbidden forms', () => {
  const hits = ['el.style.cssText = x', 'el.setAttribute("style", x)', '<a style="color:red">', "<a style={'x'} />"];
  hits.forEach((line) => assert.ok(forbidden.some(([, pattern]) => pattern.test(line)), line));
  assert.ok(!forbidden.some(([, pattern]) => pattern.test('<a style={css(x)} />')));
});

test('sources never write inline style text', () => {
  const offences: string[] = [];
  for (const file of ['src', 'react', 'vue'].flatMap((dir) => { try { return sources(dir); } catch { return []; } })) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const [label, pattern] of forbidden) {
        if (pattern.test(line)) offences.push(`${file}:${index + 1} ${label}`);
      }
    });
  }
  assert.deepEqual(offences, []);
});
