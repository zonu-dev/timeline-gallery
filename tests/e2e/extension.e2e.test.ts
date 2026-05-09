import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const extensionPath = resolve(
  process.cwd(),
  process.env.EXTENSION_PATH ?? '.output/chrome-mv3',
);

describe('Chrome extension smoke test', () => {
  let browser: Browser;
  let extensionId: string;
  let server: Server;
  let fixtureUrl: string;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html>
        <html>
          <head><title>Timeline Gallery Fixture</title></head>
          <body><main><h1>Fixture Page</h1></main></body>
        </html>`);
    });

    await new Promise<void>((resolveListen) => {
      server.listen(0, '127.0.0.1', resolveListen);
    });

    const address = server.address() as AddressInfo;
    fixtureUrl = `http://127.0.0.1:${address.port}/`;

    const executablePath = findChromeExecutable();
    browser = await puppeteer.launch({
      pipe: true,
      ...(executablePath ? { executablePath } : {}),
      enableExtensions: [extensionPath],
    });

    const workerTarget = await browser.waitForTarget((target) => {
      return (
        target.type() === 'service_worker' &&
        target.url().startsWith('chrome-extension://')
      );
    });

    extensionId = new URL(workerTarget.url()).host;
  });

  afterAll(async () => {
    await browser?.close();
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => {
        if (error) {
          rejectClose(error);
          return;
        }
        resolveClose();
      });
    });
  });

  it('loads the popup page', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.waitForSelector('h1');
    await page.waitForSelector('#gallery-mode');

    expect(await page.$eval('h1', (element) => element.textContent)).toBe(
      'Timeline Gallery',
    );
    expect(
      await page.$eval('#gallery-mode', (element) => {
        return element instanceof HTMLInputElement ? element.checked : null;
      }),
    ).toBe(false);

    await page.close();
  });

  it('injects the content script into matching pages', async () => {
    const page = await browser.newPage();
    await page.goto(fixtureUrl);

    await page.waitForFunction(() => {
      return (
        document.documentElement.dataset.timelineGalleryExtension === 'ready'
      );
    });

    await page.close();
  });
});

function findChromeExecutable(): string | undefined {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(candidate));
}
