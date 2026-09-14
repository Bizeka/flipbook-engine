# 1.0.0 migration guide

FlipbookEngine 1.0.0 is the first stable open-source release. The 0.x line was
alpha/beta and does not provide a compatibility guarantee. Test the viewer and
wrapper integrations against the new package before deploying.

## Plugin entry points

The all-in-one import remains available:

```ts
import { FlipbookEngine } from 'flipbookengine';
```

Optional feature adapters can be loaded independently:

```ts
import { FlipbookEngine } from 'flipbookengine/core';
import { notesPlugin } from 'flipbookengine/plugins/notes';

const engine = new FlipbookEngine('#viewer', { plugins: [notesPlugin] });
```

Available adapters are documented in [plugin architecture](./plugin-architecture.md).
The official OSS package does not include analytics, OCR, PDF outline extraction,
protected downloads, or backend rendering.

## TOC and iframe API

TOC is supplied as a host-provided `FlipbookTocEntry[]` manifest. Use
`engine.getToc()` and `engine.setToc(entries, show?)` for runtime updates. Iframe
controllers additionally expose `getToc()` and `setToc()` through the validated
postMessage bridge.

## Wrapper validation

React and Vue wrappers continue to accept the engine options object, including
`plugins`. Validate wrapper lifecycle, CSS import, PDF worker configuration, and
host-managed note/bookmark persistence during migration.

## 0.8.0 to 1.0.0 differences

The 1.0.0 release is the first compatibility boundary. The 0.x line was alpha/beta, so applications must validate the complete integration instead of assuming semver compatibility.

| Area | 0.8.0 | 1.0.0 | Migration impact |
| --- | --- | --- | --- |
| Package surface | All-in-one public entry | All-in-one plus core, plugins, and feature subpaths | Imports from documented public paths are supported; imports from internal src/dist files are breaking and must be replaced. |
| Optional features | Built-in reader surface only | Plugin contract with install/uninstall, typed events, toolbar/panel/API contributions | If an application wants an adapter API, register the adapter explicitly; omitted adapters are inactive. |
| TOC | Host-provided TOC panel | Nested TOC plus getToc/setToc and iframe commands | Existing TOC data remains host-provided; update integrations that need runtime or embed control. |
| Hotspots | Basic text/link overlays | info/media/gallery/commerce, image/video/audio previews, galleries, product links | Existing overlays remain valid; new media/gallery fields are additive. |
| Image mode search | Disabled for raster page lists | Still disabled; PDF mode only | No change; raster search requires host/server text metadata. |
| Commercial capabilities | Not part of OSS | Still not part of OSS | Backend rendering, OCR/indexing, protected downloads, persistence, identity, and analytics remain commercial/backend work. |

### Breaking-change requirements

- Do not depend on undocumented internal modules, generated chunk filenames, or 0.x implementation details.
- Re-run wrapper and iframe smoke tests after upgrading; React and Vue wrappers must be rebuilt against the 1.0.0 declarations.
- Treat plugin registration as explicit state. Calling uninstallPlugin removes APIs, UI contributions, event listeners, and cleanup callbacks; it does not merely hide a button.
- Existing all-in-one initialization with documented options is retained, but the 0.x line has no compatibility guarantee and must not be used as a rollback contract.
