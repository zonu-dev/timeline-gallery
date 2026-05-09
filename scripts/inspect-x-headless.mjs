import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = process.cwd();
const authProfileDir = resolve(root, '.wxt/headless-auth-profile');
const headlessProfileDir = resolve(root, '.wxt/headless-run-profile');
const extensionDir = resolve(root, '.output/chrome-mv3');
const inspectionDir = resolve(root, '.wxt/inspection');
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const enableGallery = process.argv.includes('--enable-gallery');
const extensionName = 'Timeline Gallery';

if (!existsSync(chromePath)) {
  throw new Error(`Chrome not found: ${chromePath}`);
}

if (!existsSync(authProfileDir)) {
  throw new Error(
    `Auth profile not found: ${authProfileDir}. Run "corepack pnpm auth:x:headless" and log in to X once.`,
  );
}

if (!existsSync(extensionDir)) {
  throw new Error(
    `Extension output not found: ${extensionDir}. Run "corepack pnpm build" first.`,
  );
}

mkdirSync(inspectionDir, { recursive: true });
rmSync(headlessProfileDir, { recursive: true, force: true });
mkdirSync(headlessProfileDir, { recursive: true });

const rsync = spawnSync(
  'rsync',
  [
    '-a',
    '--delete',
    '--exclude=Singleton*',
    '--exclude=*.lock',
    '--exclude=Default/Extension Rules/*',
    '--exclude=Default/Extension Scripts/*',
    '--exclude=Default/Extension State/*',
    '--exclude=Default/Extensions/*',
    '--exclude=Default/IndexedDB/*',
    '--exclude=Default/Local Extension Settings/*',
    '--exclude=Safe Browsing/*',
    `${authProfileDir}/`,
    `${headlessProfileDir}/`,
  ],
  { stdio: 'inherit' },
);

if (rsync.status !== 0) {
  throw new Error('Failed to copy auth profile for headless inspection.');
}

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  pipe: true,
  userDataDir: headlessProfileDir,
  defaultViewport: { width: 1440, height: 1200 },
  enableExtensions: [extensionDir],
  args: [
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--password-store=basic',
    '--use-mock-keychain',
  ],
});

try {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  );
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  await page.goto('https://x.com/home', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForSelector('main[role="main"], a[href="/login"]', {
    timeout: 30_000,
  });
  await wait(6_000);

  const before = await readXPageSummary(page);
  if (before.loggedOut) {
    console.error(
      JSON.stringify(
        {
          status: 'logged-out',
          message:
            'Headless auth profile is not logged in. Run "corepack pnpm auth:x:headless", log in to X, close that Chrome window, then retry.',
          screenshotPath: await screenshot(page, 'x-headless-logged-out.png'),
        },
        null,
        2,
      ),
    );
    process.exitCode = 2;
  } else {
    if (enableGallery) {
      await setGalleryMode(browser, true);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForSelector('main[role="main"]', { timeout: 30_000 });
      await wait(6_000);
    }

    const after = await readXPageSummary(page);
    const screenshotPath = await screenshot(
      page,
      enableGallery
        ? 'x-headless-gallery-on.png'
        : 'x-headless-gallery-off.png',
    );

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          galleryRequested: enableGallery,
          ...after,
          screenshotPath,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}

async function setGalleryMode(browser, enabled) {
  const worker = await findExtensionWorker(browser);
  if (!worker) {
    throw new Error('Extension service worker is not available.');
  }

  await worker.evaluate(async (nextEnabled) => {
    const key = 'timeline-gallery:state';
    const values = await chrome.storage.local.get(key);
    const current = values[key] ?? {};
    await chrome.storage.local.set({
      [key]: {
        installedAt: current.installedAt ?? Date.now(),
        contentReadyCount: current.contentReadyCount ?? 0,
        lastContentPage: current.lastContentPage ?? null,
        galleryMode: {
          enabled: nextEnabled,
          includeVideos: false,
          includeGifs: false,
          includeMultiImagePosts: false,
        },
      },
    });
  }, enabled);
}

async function findExtensionWorker(browser) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    for (const target of browser.targets()) {
      if (
        target.type() !== 'service_worker' ||
        !target.url().startsWith('chrome-extension://')
      ) {
        continue;
      }

      if (await isTimelineGalleryExtension(browser, target)) {
        return target.worker();
      }
    }

    await wait(500);
  }

  throw new Error(`Could not find ${extensionName} service worker.`);
}

async function isTimelineGalleryExtension(browser, target) {
  const extensionId = new URL(target.url()).host;
  const page = await browser.newPage();

  try {
    await page.goto(`chrome-extension://${extensionId}/manifest.json`, {
      waitUntil: 'domcontentloaded',
      timeout: 3_000,
    });
    const manifestText = await page.evaluate(() => document.body.innerText);
    const manifest = JSON.parse(manifestText);
    return manifest.name === extensionName;
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

async function readXPageSummary(page) {
  return page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    const visibleArticles = articles.filter((article) => {
      const rect = article.getBoundingClientRect();
      const style = getComputedStyle(article);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none';
    });
    const postStates = articles.reduce((states, article) => {
      const state = article.getAttribute('data-timeline-gallery-post');
      if (state) {
        states[state] = (states[state] ?? 0) + 1;
      }
      return states;
    }, {});
    const primaryColumn = document
      .querySelector('[data-testid="primaryColumn"]')
      ?.getBoundingClientRect();

    return {
      url: location.href,
      title: document.title,
      loggedOut: Boolean(
        document.querySelector('a[href="/login"], [data-testid="loginButton"]'),
      ),
      marker: document.documentElement.dataset.timelineGalleryExtension ?? null,
      galleryEnabled: document.documentElement.getAttribute(
        'data-timeline-gallery-enabled',
      ),
      articleCount: articles.length,
      visibleArticleCount: visibleArticles.length,
      postStates,
      primaryColumn: primaryColumn
        ? {
            x: Math.round(primaryColumn.x),
            y: Math.round(primaryColumn.y),
            width: Math.round(primaryColumn.width),
            height: Math.round(primaryColumn.height),
          }
        : null,
    };
  });
}

async function screenshot(page, filename) {
  const screenshotPath = resolve(inspectionDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return screenshotPath;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
