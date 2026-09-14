# Plugin architecture

FlipbookEngine v1 exposes a small plugin contract so optional reader features can
be distributed independently from the rendering core. Plugins are installed
before the first render through `plugins` or `engine.installPlugin(plugin)`.

```ts
import { FlipbookEngine } from 'flipbookengine/core';
import type { FlipbookPlugin } from 'flipbookengine/plugins';

const tocPlugin: FlipbookPlugin = {
  name: 'toc',
  install(engine, context) {
    context.registerToolbarButton({
      id: 'toc',
      label: 'Contents',
      icon: '☰',
      onClick: () => context.openPanel('contents')
    });

    context.registerPanel({
      id: 'contents',
      title: 'Table of contents',
      render: (container) => {
        container.textContent = `Page ${engine.getCurrentPage() + 1}`;
      }
    });

    context.registerApi('getCurrentSection', () => engine.getCurrentPage());
    return () => context.closePanel('contents');
  }
};

const engine = new FlipbookEngine('#viewer', { plugins: [tocPlugin] });
```

The context provides:

- `registerToolbarButton()` for a framework-agnostic toolbar action.
- `registerPanel()` for a panel mounted inside the viewer shell.
- `registerApi()` and `engine.callPluginApi()` for namespaced plugin methods.
- `on()` for typed engine event subscriptions with automatic cleanup.
- `openPanel()` / `closePanel()` for panel state.

Plugin names and contribution identifiers must be unique within an engine.
Calling `engine.destroy()` removes all plugin registrations and runs cleanup
callbacks. A plugin installed after initialization is available on the next
viewer render; install initial plugins in the constructor options when their UI
must be present on the first render.

For example, a host that only needs note persistence can load the notes adapter
without importing the other feature adapters:

```ts
import { FlipbookEngine } from 'flipbookengine/core';
import { notesPlugin } from 'flipbookengine/plugins/notes';

const engine = new FlipbookEngine('#viewer', { plugins: [notesPlugin] });
await engine.callPluginApi('notes', 'set', 0, 'Review this page');
```

Official lightweight adapters are available as independent entry points:

- `flipbookengine/plugins/notes`
- `flipbookengine/plugins/bookmarks`
- `flipbookengine/plugins/toc`
- `flipbookengine/plugins/search`
- `flipbookengine/plugins/annotations`
- `flipbookengine/plugins/hotspots`
- `flipbookengine/plugins/share`
- `flipbookengine/plugins/deep-link`

Each adapter registers namespaced APIs over the existing host-managed engine
methods. The all-in-one entry remains unchanged, so applications can migrate
incrementally without loading an adapter they do not use.

The public `flipbookengine` entry remains the all-in-one build. `flipbookengine/core`
contains the core engine exports, `flipbookengine/plugins` contains the plugin
contract, and the feature subpaths above contain the optional adapters. Analytics is intentionally not an official
open-source plugin; applications may consume events directly or use a private
commercial adapter.


## Activating and deactivating plugins

Pass adapters in the constructor to activate them before the first render:

```ts
import { FlipbookEngine } from 'flipbookengine/core';
import { hotspotsPlugin } from 'flipbookengine/plugins/hotspots';

const engine = new FlipbookEngine('#viewer', { plugins: [hotspotsPlugin] });
```

A plugin can also be enabled or disabled after initialization. installPlugin returns the engine instance; uninstallPlugin returns true when a plugin was removed and clears all registered contributions.

```ts
engine.uninstallPlugin('hotspots');
engine.installPlugin(hotspotsPlugin);
await engine.callPluginApi('hotspots', 'activate', 'product-42');
```

Feature adapters are API-only contributions. The built-in all-in-one viewer continues to render its existing toolbar and panels from the corresponding options; custom plugins can add their own UI contributions with registerToolbarButton and registerPanel.
