// Rewrites the page-flip dependency so it neither assigns style.cssText nor injects a <style> element,
// both of which a nonce-only style-src blocks. Its base rules live in src/styles/flipbook-engine.css.
import { sep } from 'node:path';
import { EOL } from 'node:os';

// Self-contained on purpose: the dependency is a UMD file, so it cannot take an import.
const prelude = [
  'var __css = function (style) {',
  '  return { set v(text) {',
  '    for (var i = style.length - 1; i >= 0; i--) style.removeProperty(style.item(i));',
  '    String(text).split(";").forEach(function (part) {',
  '      var colon = part.indexOf(":");',
  '      if (colon < 0) return;',
  '      var name = part.slice(0, colon).trim();',
  '      if (name) style.setProperty(name, part.slice(colon + 1).trim());',
  '    });',
  '  } };',
  '};',
  ''
].join(EOL);

export function cspSafePageFlip() {
  return {
    name: 'csp-safe-page-flip',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split(sep).join('/');
      if (!file.includes('/node_modules/page-flip/dist/js/') || !file.endsWith('.js')) return null;
      const assignment = /([A-Za-z0-9_$]+(?:[.][A-Za-z0-9_$]+|[(][)])*)[.]style[.]cssText=/g;
      const injector = 'if(t&&"undefined"!=typeof document){var s=document.head';
      const legacy = 'n.styleSheet?n.styleSheet.cssText=t:n.appendChild';
      if (!code.includes(injector) || !code.includes(legacy)) throw new Error('csp-safe-page-flip: page-flip style injector not found, update the plugin');
      const rewritten = code.replace(assignment, '__css($1.style).v=').replace(injector, 'if(false){var s=document.head').replace(legacy, 'n.appendChild');
      if (rewritten.includes('cssText')) throw new Error('csp-safe-page-flip: a cssText use was not rewritten');
      return { code: prelude + rewritten, map: null };
    }
  };
}
