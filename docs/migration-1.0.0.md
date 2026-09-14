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
