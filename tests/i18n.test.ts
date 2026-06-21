import test from 'node:test';
import assert from 'node:assert/strict';

import { enMessages } from '../src/i18n/locales/en.ts';
import { trMessages } from '../src/i18n/locales/tr.ts';

test('exposes built-in turkish messages', () => {
  assert.equal(trMessages.previous, 'Önceki');
  assert.equal(trMessages.settings, 'Ayarlar');
  assert.equal(trMessages.downloadCatalog, 'Kataloğu İndir');
});

test('supports message override composition at call site', () => {
  const messages = {
    ...enMessages,
    downloadCatalog: 'Download PDF',
    settings: 'Viewer Settings'
  };

  assert.equal(messages.downloadCatalog, 'Download PDF');
  assert.equal(messages.settings, 'Viewer Settings');
  assert.equal(messages.previous, 'Previous');
});
