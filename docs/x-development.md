# X Development Browser

This project is for building a Chrome extension that turns the X timeline into an image gallery.

## Open X with the extension installed

X can reject WXT/web-ext launched Chrome sessions during login. Use the manual flow for authenticated X development.

## AI inspection profile

For AI-assisted visual checks without taking over your normal Chrome window, use a dedicated Chrome user data directory.

Terminal 1:

```sh
pnpm dev:x
```

Terminal 2:

```sh
pnpm open:x:ai
```

If `pnpm` is not available directly:

```sh
corepack pnpm dev:x
corepack pnpm open:x:ai
```

This opens Google Chrome with:

- profile: `.wxt/ai-chrome-profile`
- unpacked extension: `.output/chrome-mv3`
- start URL: `https://x.com/home`
- remote debugging: `http://127.0.0.1:9223`

Log in to X once in that dedicated window. It is separate from your normal Chrome profile and is ignored by git.

After login, inspect the dedicated window without touching your normal Chrome:

```sh
pnpm inspect:x:ai
```

## Headless real-X inspection

For inspection that does not bring any Chrome window to the front, use a headless-compatible auth profile. This is separate from your normal Chrome profile.

One-time login:

```sh
pnpm auth:x:headless:reset
```

Log in to X in the opened window, then close that window.

After that, inspect real X in headless Chrome:

```sh
pnpm inspect:x:headless
pnpm inspect:x:headless:gallery
```

The headless scripts copy `.wxt/headless-auth-profile` into a temporary run profile, load `.output/chrome-mv3`, and write screenshots under `.wxt/inspection`.

### Recommended manual flow

```sh
pnpm install
pnpm dev:x
```

If `pnpm` is not available directly:

```sh
corepack pnpm install
corepack pnpm dev:x
```

This starts WXT and writes the development extension to:

```text
.output/chrome-mv3-dev
```

Then use normal Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `.output/chrome-mv3-dev`.
5. Open X:

```sh
pnpm open:x
```

Or open this URL manually:

```text
https://x.com/home
```

Log in using normal Chrome. This avoids the unsafe browser warning that X can show for automated launch sessions.

### Auto-open flow

```sh
pnpm dev:x:auto
```

This asks WXT to launch Chrome with the extension installed and open `https://x.com/home`. Use it for quick non-auth checks only. It may not support X login.

## Login persistence

The recommended manual flow uses your normal Chrome profile, so login state is managed by Chrome.

The auto-open flow uses a repo-local profile:

```text
.wxt/chrome-data
```

This directory is ignored by git and must never be committed.

## Content script scope

The production content script runs on:

- `https://x.com/*`
- `https://twitter.com/*`

Development and e2e test builds also run on local fixture URLs and `https://example.com/*`.

Keep permissions and match patterns narrow. Do not add `<all_urls>` for X-specific work.

## Testing approach

Use live X for manual checks only. For automated tests, create local HTML fixtures that model the timeline markup needed by the extractor, then assert against the extractor and content script behavior.
