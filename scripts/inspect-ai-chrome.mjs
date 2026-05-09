import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const debugPort = process.env.AI_CHROME_DEBUG_PORT ?? '9223';
const outputDir = resolve(process.cwd(), '.wxt/inspection');
mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.connect({
  browserURL: `http://127.0.0.1:${debugPort}`,
  defaultViewport: null,
});

try {
  const pages = await browser.pages();
  const xPage =
    pages.find((page) => page.url().startsWith('https://x.com/home')) ??
    pages.find((page) => page.url().startsWith('https://x.com/'));

  if (!xPage) {
    throw new Error('No x.com tab found in the AI Chrome profile.');
  }

  await xPage.bringToFront();
  await xPage.waitForSelector('main[role="main"]', { timeout: 15_000 });

  const summary = await xPage.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    return {
      url: location.href,
      title: document.title,
      galleryEnabled:
        document.documentElement.getAttribute(
          'data-timeline-gallery-enabled',
        ) ?? null,
      articleCount: articles.length,
      visibleArticles: articles.filter((article) => {
        const rect = article.getBoundingClientRect();
        const style = getComputedStyle(article);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none';
      }).length,
      markedArticles: articles.filter((article) =>
        article.hasAttribute('data-timeline-gallery-post'),
      ).length,
      postStates: Array.from(
        new Set(
          articles.map((article) =>
            article.getAttribute('data-timeline-gallery-post'),
          ),
        ),
      ).filter(Boolean),
      primaryColumn: (() => {
        const element = document.querySelector('[data-testid="primaryColumn"]');
        if (!element) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        return {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })(),
    };
  });

  const screenshotPath = resolve(outputDir, 'x-home.png');
  await xPage.screenshot({ path: screenshotPath, fullPage: false });

  console.log(JSON.stringify({ ...summary, screenshotPath }, null, 2));
} finally {
  browser.disconnect();
}
