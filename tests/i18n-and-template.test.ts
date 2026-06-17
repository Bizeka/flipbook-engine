import test from 'node:test';
import assert from 'node:assert/strict';

// Load DOM mock
import './dom-mock.ts';

// Now import the UI templates and locales
import { buildFlipbookUi, buildEmptyStateUi } from '../src/ui/template.ts';
import { enMessages } from '../src/i18n/locales/en.ts';
import { trMessages } from '../src/i18n/locales/tr.ts';

function buildFlipbookMarkup(state: any, options: any): string {
  const ui = buildFlipbookUi(state, options);
  return (ui.wrapper as any).outerHTML;
}

function buildEmptyStateMarkup(message: string): string {
  const ui = buildEmptyStateUi(message);
  return (ui as any).outerHTML;
}

test('exposes built-in turkish messages', () => {
  assert.equal(trMessages.previous, 'Önceki');
  assert.equal(trMessages.settings, 'Ayarlar');
  assert.equal(trMessages.downloadCatalog, 'Katalogu Indir');
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

test('builds localized viewer markup', () => {
  const markup = buildFlipbookMarkup(
    { showThumbs: true },
    {
      allowDownload: true,
      hasDownloadUrl: true,
      totalPages: 12,
      className: 'custom-shell',
      messages: trMessages
    }
  );

  assert.match(markup, /custom-shell/);
  assert.match(markup, /title="Sayfalar"/);
  assert.match(markup, /title="Önceki"/);
  assert.match(markup, /title="Katalogu Indir"/);
  assert.match(markup, /Küçük Resimler/);
  assert.match(markup, /Tek Sayfa Modu/);
});

test('omits download button when download is disabled', () => {
  const markup = buildFlipbookMarkup(
    { showThumbs: false },
    {
      allowDownload: false,
      hasDownloadUrl: false,
      totalPages: 4,
      messages: enMessages
    }
  );

  assert.doesNotMatch(markup, /bk-download/);
  assert.match(markup, /display:none/);
});

test('builds empty state with translated text', () => {
  const markup = buildEmptyStateMarkup('No data available.');
  assert.match(markup, /No data available\./);
  assert.match(markup, /bk-empty-state/);
});
