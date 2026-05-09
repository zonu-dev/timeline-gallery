# Manual Testing

## Full Local Checks

```sh
corepack pnpm run check
corepack pnpm run format:check
```

Run these before committing implementation changes when practical.

## Standard WXT Browser

```sh
corepack pnpm dev
```

WXT launches Chrome with the extension installed. Use this for fast popup and extension iteration on pages that do not block automated browser sessions.

The profile is persisted under `.wxt/chrome-data`.

## Authenticated X Manual Flow

```sh
corepack pnpm dev:x
```

This starts WXT without launching Chrome.

In normal Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `.output/chrome-mv3-dev`.
5. Open `https://x.com/home`.
6. Log in normally if needed.

Use this flow when you need to interact with X as a real signed-in user.

## Production-style Unpacked Extension

```sh
corepack pnpm build
```

Then load `.output/chrome-mv3` from `chrome://extensions`.

Use this for checks that should not depend on the WXT dev server.

## Headless Real-X Inspection

One-time login profile setup:

```sh
corepack pnpm auth:x:headless:reset
```

Log in to X in the opened dedicated Chrome window, then close that window.

After that:

```sh
corepack pnpm inspect:x:headless
corepack pnpm inspect:x:headless:gallery
```

The scripts copy `.wxt/headless-auth-profile` into a disposable run profile, load `.output/chrome-mv3`, inspect X in headless Chrome, and save screenshots under `.wxt/inspection`.

## Automated Browser Smoke Test

```sh
corepack pnpm run test:e2e
```

This command builds the extension, loads it into Chrome with Puppeteer, verifies the popup route, serves a local HTML fixture, and confirms content-script injection.

The test uses system Chrome. Set `CHROME_EXECUTABLE_PATH` when Chrome is not installed in one of the default paths checked by `tests/e2e/extension.e2e.test.ts`.

## Live-X Caution

Do not automate login or commit any browser profile data.

Avoid live actions that change account state unless the task explicitly requires them. For example, use unit tests for the not-interested menu behavior instead of repeatedly clicking it on real timeline posts.
