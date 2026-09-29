import { createServer, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import puppeteer, {
  type Browser,
  type Page,
  type WebWorker,
} from 'puppeteer-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_GALLERY_MODE_SETTINGS,
  EXTENSION_STATE_KEY,
  type GalleryModeSettings,
} from '../../src/utils/storage';

const extensionPath = resolve(
  process.cwd(),
  process.env.EXTENSION_PATH ?? '.output/chrome-mv3',
);

describe('Chrome extension smoke test', () => {
  let browser: Browser;
  let extensionId: string;
  let extensionWorker: WebWorker;
  let server: Server;
  let fixtureUrl: string;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(createTimelineFixtureHtml());
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
    const worker = await workerTarget.worker();
    if (!worker) {
      throw new Error('Extension service worker was not available');
    }
    extensionWorker = worker;
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

  it('toggles account metadata and post time independently', async () => {
    await setGalleryMode(extensionWorker, true, {
      imageCount: 4,
      showAccountInfo: true,
      showPostTime: false,
    });
    const page = await browser.newPage();
    await page.goto(`${fixtureUrl}home`);
    await waitForGalleryReady(page);

    await expectMetadataVisibility(page, {
      displayName: true,
      handle: true,
      separator: false,
      time: false,
    });

    await setGalleryMode(extensionWorker, true, {
      imageCount: 4,
      showAccountInfo: false,
      showPostTime: true,
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForGalleryReady(page);

    await expectMetadataVisibility(page, {
      displayName: false,
      handle: false,
      separator: false,
      time: true,
    });

    await page.close();
  });

  it('shows the reply action and count on the lower-left side when enabled', async () => {
    await setGalleryMode(extensionWorker, true, {
      imageCount: 4,
      showReply: true,
    });
    const page = await browser.newPage();
    await page.goto(`${fixtureUrl}home`);
    await waitForGalleryReady(page);

    const metrics = await page.evaluate(() => {
      const article = document.querySelector(
        '[data-timeline-gallery-post="single-image"]',
      );
      const group = article?.querySelector('[role="group"]');
      const replyButton = group?.querySelector<HTMLElement>(
        '[data-testid="reply"]',
      );
      const replyCount = replyButton?.querySelector<HTMLElement>(
        '[data-testid="app-text-transition-container"]',
      );
      const retweetButton = group?.querySelector<HTMLElement>(
        '[data-testid="retweet"]',
      );

      if (!group || !replyButton || !replyCount || !retweetButton) {
        throw new Error('Expected reply action fixture to be available');
      }

      return {
        replyDisplay: getComputedStyle(replyButton).display,
        replyCountDisplay: getComputedStyle(replyCount).display,
        replyLeft: replyButton.getBoundingClientRect().left,
        retweetLeft: retweetButton.getBoundingClientRect().left,
      };
    });

    expect(metrics.replyDisplay).not.toBe('none');
    expect(metrics.replyCountDisplay).not.toBe('none');
    expect(metrics.replyLeft).toBeLessThan(metrics.retweetLeft - 80);

    await page.close();
  });

  it('keeps timeline scroll stable when gallery mode reapplies after DOM mutations', async () => {
    await setGalleryMode(extensionWorker, true, { imageCount: 4 });
    const page = await browser.newPage();
    await page.goto(`${fixtureUrl}home`);
    await waitForGalleryReady(page);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForFunction(() => window.scrollY > 800);

    const beforeMutationScrollY = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => {
      const mutation = document.createElement('div');
      mutation.dataset.testMutation = 'true';
      mutation.textContent = 'external mutation';
      document.body.append(mutation);
    });
    await settleGalleryApply(page);

    const afterMutationScrollY = await page.evaluate(() => window.scrollY);
    expect(Math.abs(afterMutationScrollY - beforeMutationScrollY)).toBeLessThan(
      8,
    );

    await page.close();
  });

  it('keeps photo modal routes simplified and post detail routes unsimplified without returning to the top', async () => {
    await setGalleryMode(extensionWorker, true, { imageCount: 4 });
    const page = await browser.newPage();
    await page.goto(`${fixtureUrl}home`);
    await waitForGalleryReady(page);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForFunction(() => window.scrollY > 700);
    const timelineScrollY = await page.evaluate(() => window.scrollY);

    await page.evaluate(() => {
      history.pushState({}, '', '/example/status/1/photo/1');
    });
    await page.waitForFunction(() => location.pathname.endsWith('/photo/1'));
    await waitForSimplifyPostsAttribute(page, 'true');

    expect(await getSimplifyPostsAttribute(page)).toBe('true');
    expect(await countGalleryPosts(page)).toBeGreaterThan(0);
    expect(
      Math.abs((await page.evaluate(() => window.scrollY)) - timelineScrollY),
    ).toBeLessThan(8);

    await page.evaluate(() => {
      history.pushState({}, '', '/example/status/1');
    });
    await page.waitForFunction(() => location.pathname === '/example/status/1');
    await waitForSimplifyPostsAttribute(page, 'false');

    expect(await getSimplifyPostsAttribute(page)).toBe('false');
    expect(await countGalleryPosts(page)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(600);

    await page.evaluate(() => {
      history.pushState({}, '', '/home');
    });
    await page.waitForFunction(() => location.pathname === '/home');
    await waitForSimplifyPostsAttribute(page, 'true');

    expect(await getSimplifyPostsAttribute(page)).toBe('true');
    expect(await countGalleryPosts(page)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(600);

    await page.evaluate(() => {
      history.pushState({}, '', '/Yenkurl/followers');
    });
    await page.waitForFunction(
      () => location.pathname === '/Yenkurl/followers',
    );
    await waitForSimplifyPostsAttribute(page, 'false');

    expect(await getSimplifyPostsAttribute(page)).toBe('false');
    expect(await countGalleryPosts(page)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(600);

    await page.close();
  });
});

async function setGalleryMode(
  worker: WebWorker,
  enabled: boolean,
  overrides: Partial<GalleryModeSettings> = {},
): Promise<void> {
  await worker.evaluate(
    async ({ key, state }) => {
      await chrome.storage.local.set({ [key]: state });
    },
    {
      key: EXTENSION_STATE_KEY,
      state: {
        installedAt: Date.now(),
        contentReadyCount: 0,
        lastContentPage: null,
        galleryMode: {
          ...DEFAULT_GALLERY_MODE_SETTINGS,
          enabled,
          ...overrides,
        },
      },
    },
  );
}

async function waitForGalleryReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return (
      document.documentElement.dataset.timelineGalleryExtension === 'ready' &&
      document.documentElement.getAttribute('data-timeline-gallery-enabled') ===
        'true' &&
      document.querySelectorAll('[data-timeline-gallery-post="single-image"]')
        .length > 0
    );
  });
}

async function settleGalleryApply(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 140));
}

async function getSimplifyPostsAttribute(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return document.documentElement.getAttribute(
      'data-timeline-gallery-simplify-posts',
    );
  });
}

async function waitForSimplifyPostsAttribute(
  page: Page,
  expected: string,
): Promise<void> {
  await page.waitForFunction(
    (expectedValue) => {
      return (
        document.documentElement.getAttribute(
          'data-timeline-gallery-simplify-posts',
        ) === expectedValue
      );
    },
    {},
    expected,
  );
}

async function countGalleryPosts(page: Page): Promise<number> {
  return page.evaluate(() => {
    return document.querySelectorAll('[data-timeline-gallery-post]').length;
  });
}

async function expectMetadataVisibility(
  page: Page,
  expected: {
    displayName: boolean;
    handle: boolean;
    separator: boolean;
    time: boolean;
  },
): Promise<void> {
  const visibility = await page.evaluate(() => {
    function isVisible(selector: string): boolean {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing metadata fixture: ${selector}`);
      }

      const rect = element.getBoundingClientRect();
      return getComputedStyle(element).display !== 'none' && rect.width > 0;
    }

    return {
      displayName: isVisible('[data-fixture-metadata="display-name"]'),
      handle: isVisible('[data-fixture-metadata="handle"]'),
      separator: isVisible('[data-fixture-metadata="separator"]'),
      time: isVisible('[data-fixture-metadata="time-link"]'),
    };
  });

  expect(visibility).toEqual(expected);
}

function createTimelineFixtureHtml(): string {
  const posts = Array.from({ length: 12 }, (_, index) => {
    const id = index + 1;
    return `
      <div data-testid="cellInnerDiv">
        <article data-testid="tweet" role="article">
          <div class="tweet-row">
            <div class="side-rail">
              <div data-testid="UserAvatar-Container-${id}">A</div>
            </div>
            <div class="content-column">
              <div class="tweet-header">
                <div data-testid="User-Name">
                  <div data-fixture-metadata="display-name"><span>Fixture User ${id}</span></div>
                  <div>
                    <span data-fixture-metadata="handle">@fixture_${id}</span>
                    <span data-fixture-metadata="separator"> · </span>
                    <a data-fixture-metadata="time-link" href="/example/status/${id}">
                      <time datetime="2026-05-09T00:00:00.000Z">5月9日</time>
                    </a>
                  </div>
                </div>
                <button data-testid="caret" aria-label="More"></button>
              </div>
              <div data-testid="tweetText">Fixture post ${id}</div>
              <a class="photo-link" href="/example/status/${id}/photo/1">
                <div data-testid="tweetPhoto">
                  <img alt="Fixture ${id}" src="${createFixtureImageDataUri(id)}" />
                </div>
              </a>
              <div role="group" aria-label="Post actions">
                <div><button data-testid="reply" aria-label="Reply"><span data-testid="app-text-transition-container">${id}</span></button></div>
                <div><button data-testid="retweet" aria-label="Repost"><span data-testid="app-text-transition-container">${id + 1}</span></button></div>
                <div><button data-testid="like" aria-label="Like"><span data-testid="app-text-transition-container">${id + 2}</span></button></div>
                <div><button data-testid="bookmark" aria-label="Bookmark"></button></div>
              </div>
            </div>
          </div>
        </article>
      </div>
    `;
  }).join('');

  return `<!doctype html>
    <html>
      <head>
        <title>Timeline Gallery Fixture</title>
        <style>
          body {
            margin: 0;
            min-height: 6000px;
            background: #050505;
            color: #f7f7f7;
            font-family: system-ui, sans-serif;
          }

          header[role="banner"],
          [data-testid="sidebarColumn"] {
            position: fixed;
            top: 0;
            bottom: 0;
            width: 220px;
            border-right: 1px solid #2f3336;
          }

          header[role="banner"] {
            left: 0;
          }

          [data-testid="sidebarColumn"] {
            right: 0;
            border-right: 0;
            border-left: 1px solid #2f3336;
          }

          main[role="main"] {
            width: 640px;
            margin: 0 auto;
            border-right: 1px solid #2f3336;
            border-left: 1px solid #2f3336;
          }

          [role="tablist"] {
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            background: #050505;
            border-bottom: 1px solid #2f3336;
          }

          [role="tab"] {
            flex: 1;
            padding: 16px;
            text-align: center;
          }

          [data-testid="cellInnerDiv"] {
            border-bottom: 1px solid #2f3336;
          }

          article {
            padding: 12px;
          }

          .tweet-row {
            display: flex;
            gap: 12px;
          }

          .side-rail {
            flex: 0 0 48px;
          }

          .content-column {
            min-width: 0;
            flex: 1;
          }

          .tweet-header {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .photo-link {
            display: block;
            margin-top: 10px;
            border: 1px solid #2f3336;
            border-radius: 16px;
            overflow: hidden;
          }

          [data-testid="tweetPhoto"] img {
            display: block;
            width: 100%;
            height: auto;
          }

          [role="group"] {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <header role="banner">Left sidebar</header>
        <main role="main">
          <div data-testid="primaryColumn">
            <div role="tablist">
              <div role="tab" aria-selected="true">おすすめ</div>
              <div role="tab" aria-selected="false">フォロー中</div>
            </div>
            <section role="region">
              <div>${posts}</div>
            </section>
          </div>
        </main>
        <aside data-testid="sidebarColumn">Right sidebar</aside>
      </body>
    </html>`;
}

function createFixtureImageDataUri(index: number): string {
  const color = index % 2 === 0 ? '#f6c445' : '#2ea6a0';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
    <rect width="1200" height="760" fill="#efe9dd"/>
    <rect x="80" y="80" width="1040" height="600" rx="36" fill="${color}"/>
    <path d="M80 560 340 360 520 500 720 260 1120 560v120H80z" fill="#0b4e5f"/>
    <circle cx="940" cy="170" r="72" fill="#f15b3f"/>
    <text x="120" y="640" fill="#082f3a" font-family="Arial" font-size="72" font-weight="700">Post ${index}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
