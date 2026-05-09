# Architecture

## Entrypoints

- `src/entrypoints/background.ts`: Manifest V3 service worker. Handles extension messages and persists state.
- `src/entrypoints/content.ts`: Runs on X and local fixture pages. Applies gallery mode, watches X client-side navigation, and reacts to state changes.
- `src/entrypoints/popup/`: React popup used to toggle gallery mode and inspect basic extension state.

## Shared Modules

- `src/utils/messaging.ts`: Message names, message types, response types, and a typed `chrome.runtime.sendMessage` helper.
- `src/utils/storage.ts`: State schema and `chrome.storage.local` helpers.
- `src/utils/x-page.ts`: X route helpers, including post-detail detection.
- `src/utils/x-gallery.ts`: X timeline classification, layout markers, gallery CSS, ad labeling, the compact not-interested action, and native-menu fallback handling.

## Runtime Flow

1. A matching page loads.
2. The content script marks the document with `document.documentElement.dataset.timelineGalleryExtension = "ready"`.
3. The content script sends `timeline-gallery/content-ready`.
4. The background worker updates state in `chrome.storage.local`.
5. The popup requests state with `timeline-gallery/get-state`.
6. When gallery mode changes, the popup sends `timeline-gallery/set-gallery-mode`.
7. The content script receives the storage change and applies or clears gallery mode.

## Gallery Mode

Gallery mode is implemented by adding attributes to existing X DOM nodes and injecting one stylesheet. The extension avoids cloning or replacing whole posts because X continuously mutates the timeline.

The classifier currently hides:

- posts without an attached image
- video posts
- GIF posts
- multi-image posts
- followed-account reply context posts

For visible single-image posts, the layout code:

- hides side rails and non-gallery post chrome
- marks the image container and action row
- hides quote-source cards
- preserves repost, like, and bookmark actions
- adds a custom not-interested button for regular posts
- falls back to X's native three-dot menu when the not-interested action is unavailable
- replaces that custom action with an `Ad` label for detected ads

On post detail pages, the content script keeps the widened page layout and hidden sidebars but does not simplify the post itself.

## Permission Policy

The extension currently requests only `storage`.

Production content scripts match:

- `https://x.com/*`
- `https://twitter.com/*`

Development and e2e test builds additionally match:

- `http://localhost/*`
- `http://127.0.0.1/*`
- `https://example.com/*`

Keep permissions and production match patterns narrow. Add host permissions only when a feature needs extension-page network access, tab metadata, programmatic injection, cookies, or request control.
