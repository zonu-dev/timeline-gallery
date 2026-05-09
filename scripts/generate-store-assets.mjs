import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const outputDir = resolve(process.cwd(), 'store-assets');
const iconPath = resolve(process.cwd(), 'public/icon/128.png');
const iconDataUrl = `data:image/png;base64,${readFileSync(iconPath).toString('base64')}`;

mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  pipe: true,
  ...(findChromeExecutable() ? { executablePath: findChromeExecutable() } : {}),
});

try {
  await renderAsset({
    width: 1280,
    height: 800,
    outputPath: resolve(outputDir, 'screenshot-01-gallery-mode-1280x800.png'),
    body: galleryModeMarkup(),
  });

  await renderAsset({
    width: 1280,
    height: 800,
    outputPath: resolve(outputDir, 'screenshot-02-before-after-1280x800.png'),
    body: beforeAfterMarkup(),
  });

  await renderAsset({
    width: 1280,
    height: 800,
    outputPath: resolve(outputDir, 'screenshot-03-popup-toggle-1280x800.png'),
    body: popupToggleMarkup(),
  });

  await renderAsset({
    width: 440,
    height: 280,
    outputPath: resolve(outputDir, 'promo-small-440x280.png'),
    body: promoMarkup(),
  });
} finally {
  await browser.close();
}

async function renderAsset({ width, height, outputPath, body }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(
    `<!doctype html>
    <html lang="ja">
      <head>
        <meta charset="utf-8">
        <style>${baseStyles()}</style>
      </head>
      <body>${body}</body>
    </html>`,
    { waitUntil: 'networkidle0' },
  );
  await page.screenshot({ path: outputPath, fullPage: false });
  await page.close();
  console.log(outputPath);
}

function baseStyles() {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family:
        Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      background: #1b2f32;
      color: #0d5261;
    }
    .asset {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: #1b2f32;
      border: 8px solid #5b7777;
    }
    .panel {
      background: #f4f0e7;
      border: 4px solid #5b7777;
    }
    .title {
      margin: 0;
      color: #0d5261;
      font-weight: 900;
      letter-spacing: 0;
    }
    .subtitle {
      margin: 0;
      color: #6f8581;
      font-weight: 800;
      letter-spacing: 0;
    }
    .icon {
      display: block;
      width: 92px;
      height: 92px;
      object-fit: contain;
    }
    .screen-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 22px 30px;
    }
    .screen-title h1 {
      margin: 0;
      color: #0d5261;
      font-size: 46px;
      font-weight: 900;
      line-height: 1;
    }
    .screen-title p {
      margin: 8px 0 0;
      color: #6f8581;
      font-size: 22px;
      font-weight: 800;
    }
    .browser {
      overflow: hidden;
      background: #050808;
      border: 3px solid #5b7777;
    }
    .browser-top {
      height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      background: #132528;
      border-bottom: 2px solid #253b3e;
    }
    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #6f8581;
    }
    .addr {
      height: 22px;
      flex: 1;
      margin-left: 10px;
      border-radius: 999px;
      background: #0b1517;
      color: #6f8581;
      font-size: 12px;
      font-weight: 800;
      line-height: 22px;
      padding-left: 18px;
    }
    .x-shell {
      height: 100%;
      display: grid;
      grid-template-columns: 170px 1fr 190px;
      min-height: 0;
    }
    .x-shell.gallery {
      grid-template-columns: 1fr;
    }
    .rail {
      border-right: 2px solid #253b3e;
      padding: 26px 18px;
      opacity: 0.34;
    }
    .rail.right {
      border-right: 0;
      border-left: 2px solid #253b3e;
    }
    .rail-line {
      height: 24px;
      margin-bottom: 24px;
      border-radius: 4px;
      background: #6f8581;
    }
    .timeline {
      min-width: 0;
      border-right: 2px solid #253b3e;
      border-left: 2px solid #253b3e;
    }
    .x-shell.gallery .timeline {
      width: 920px;
      margin: 0 auto;
      border-right: 2px solid #253b3e;
      border-left: 2px solid #253b3e;
    }
    .tabs {
      height: 58px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 2px solid #253b3e;
      color: #f4f0e7;
      font-size: 20px;
      font-weight: 900;
    }
    .tabs span {
      display: grid;
      place-items: center;
      color: #6f8581;
    }
    .tabs .active {
      color: #f4f0e7;
      border-bottom: 5px solid #f3bd3f;
    }
    .post {
      border-bottom: 2px solid #253b3e;
      padding: 18px 26px;
      color: #f4f0e7;
    }
    .post.gallery-post {
      padding: 20px 54px 22px;
    }
    .post-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #5b7777;
    }
    .name-lines {
      flex: 1;
    }
    .line {
      height: 12px;
      border-radius: 999px;
      background: #6f8581;
      opacity: 0.8;
    }
    .line.short { width: 38%; }
    .line.mid { width: 62%; }
    .line.long { width: 86%; }
    .line + .line { margin-top: 7px; opacity: 0.45; }
    .post-text {
      margin: 12px 0;
      display: grid;
      gap: 8px;
    }
    .image {
      width: 100%;
      overflow: hidden;
      position: relative;
      border: 2px solid #253b3e;
      border-radius: 16px;
      background: #e8dfcf;
    }
    .image.landscape { height: 230px; }
    .image.tall {
      width: 360px;
      height: 330px;
      margin: 0 auto;
    }
    .art-sky {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #f4f0e7 0%, #85c7c2 44%, #0d5261 100%);
    }
    .sun {
      position: absolute;
      width: 110px;
      height: 110px;
      right: 95px;
      top: 38px;
      border-radius: 50%;
      background: #f3bd3f;
    }
    .ridge {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 115px;
      background: #0d5261;
      clip-path: polygon(0 68%, 16% 34%, 32% 56%, 48% 16%, 70% 52%, 100% 22%, 100% 100%, 0 100%);
    }
    .ridge.alt {
      height: 78px;
      background: #ff7047;
      opacity: 0.82;
      clip-path: polygon(0 88%, 20% 42%, 40% 72%, 58% 28%, 82% 70%, 100% 45%, 100% 100%, 0 100%);
    }
    .cards {
      position: absolute;
      inset: 0;
      background: #e8dfcf;
    }
    .card {
      position: absolute;
      width: 122px;
      height: 150px;
      background: #f4f0e7;
      border: 5px solid #0d5261;
    }
    .card:nth-child(1) { left: 48px; top: 74px; transform: rotate(-8deg); }
    .card:nth-child(2) { left: 116px; top: 52px; background: #f3bd3f; }
    .card:nth-child(3) { left: 186px; top: 76px; transform: rotate(8deg); background: #ff7047; }
    .actions {
      height: 34px;
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      gap: 34px;
      color: #6f8581;
      font-size: 20px;
      font-weight: 900;
    }
    .actions span {
      width: 23px;
      height: 23px;
      border: 4px solid #6f8581;
      border-radius: 50%;
    }
    .actions span.bookmark { border-radius: 2px; }
    .chip {
      display: inline-grid;
      place-items: center;
      height: 34px;
      padding: 0 14px;
      border: 3px solid #5b7777;
      background: #f4f0e7;
      color: #0d5261;
      font-size: 16px;
      font-weight: 900;
    }
  `;
}

function galleryModeMarkup() {
  return `
    <main class="asset gallery-asset">
      <section class="screen-title panel">
        <div>
          <h1>画像だけを広く、静かに</h1>
          <p>サイドバーを隠して、1枚画像のポストをギャラリー表示</p>
        </div>
        <img class="icon" src="${iconDataUrl}" alt="">
      </section>
      <section class="browser gallery-browser">
        <div class="browser-top">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <div class="addr">x.com/home</div>
        </div>
        <div class="x-shell gallery">
          <section class="timeline">
            <div class="tabs"><span class="active">おすすめ</span><span>フォロー中</span></div>
            ${galleryPost('landscape')}
            ${galleryPost('tall')}
          </section>
        </div>
      </section>
    </main>
    <style>
      .gallery-asset { padding: 28px; }
      .gallery-browser { height: 570px; margin-top: 22px; }
    </style>
  `;
}

function beforeAfterMarkup() {
  return `
    <main class="asset compare-asset">
      <section class="compare-title">
        <div>
          <h1 class="title">通常タイムラインから、画像ギャラリーへ</h1>
          <p class="subtitle">余計な情報を抑えて、画像付きポストを見やすくします</p>
        </div>
        <img class="icon" src="${iconDataUrl}" alt="">
      </section>
      <section class="compare-grid">
        <div class="label">Before</div>
        <div class="label active-label">Gallery Mode</div>
        <div class="browser compare-browser">
          <div class="browser-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="addr">x.com/home</div></div>
          <div class="x-shell compact">
            <aside class="rail">${railLines(6)}</aside>
            <section class="timeline">
              <div class="tabs"><span class="active">おすすめ</span><span>フォロー中</span></div>
              ${normalPost(true)}
              ${normalPost(false)}
              ${normalPost(true)}
            </section>
            <aside class="rail right">${railLines(4)}</aside>
          </div>
        </div>
        <div class="browser compare-browser">
          <div class="browser-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="addr">x.com/home</div></div>
          <div class="x-shell gallery">
            <section class="timeline">
              <div class="tabs"><span class="active">おすすめ</span><span>フォロー中</span></div>
              ${galleryPost('landscape')}
              ${galleryPost('cards')}
            </section>
          </div>
        </div>
      </section>
    </main>
    <style>
      .compare-asset { padding: 30px; }
      .compare-title {
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .compare-title h1 { font-size: 42px; }
      .compare-title .title { color: #f4f0e7; }
      .compare-title .subtitle { color: #9fb1ad; }
      .compare-title p { margin-top: 8px; font-size: 21px; }
      .compare-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 44px 1fr;
        gap: 16px 20px;
        height: 610px;
      }
      .label {
        display: grid;
        place-items: center;
        background: #314d4e;
        border: 3px solid #5b7777;
        color: #f4f0e7;
        font-size: 22px;
        font-weight: 900;
      }
      .active-label { background: #f3bd3f; color: #1b2f32; }
      .compare-browser { min-height: 0; }
      .compare-browser .x-shell { height: calc(100% - 44px); }
      .compare-browser .x-shell.compact {
        grid-template-columns: 115px 1fr 125px;
      }
      .compare-browser .rail { padding: 20px 12px; }
      .compare-browser .rail-line { height: 18px; margin-bottom: 18px; }
      .compare-browser .timeline { border-left: 0; border-right: 0; }
      .compare-browser .x-shell.gallery .timeline { width: 100%; }
      .compare-browser .tabs { height: 48px; font-size: 16px; }
      .compare-browser .post { padding: 14px 16px; }
      .compare-browser .post.gallery-post { padding: 16px 26px 18px; }
      .compare-browser .image.landscape { height: 170px; }
      .compare-browser .image.tall { width: 270px; height: 236px; }
      .compare-browser .actions { gap: 24px; }
    </style>
  `;
}

function popupToggleMarkup() {
  return `
    <main class="asset popup-asset">
      <section class="screen-title panel">
        <div>
          <h1>ワンクリックで切り替え</h1>
          <p>ポップアップからギャラリーモードをオン / オフ</p>
        </div>
        <img class="icon" src="${iconDataUrl}" alt="">
      </section>
      <section class="popup-stage">
        <div class="browser popup-browser">
          <div class="browser-top">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <div class="addr">x.com/home</div>
          </div>
          <div class="x-shell gallery">
            <section class="timeline">
              <div class="tabs"><span class="active">おすすめ</span><span>フォロー中</span></div>
              ${galleryPost('landscape')}
              ${galleryPost('cards')}
            </section>
          </div>
        </div>
        <aside class="popup panel">
          <header>
            <div>
              <h2>Timeline Gallery</h2>
              <p>画像ギャラリー表示</p>
            </div>
            <img src="${iconDataUrl}" alt="">
          </header>
          <section class="toggle-box">
            <h3>ギャラリーモード</h3>
            <div class="segmented">
              <span class="on">オン</span>
              <span>オフ</span>
            </div>
          </section>
        </aside>
      </section>
    </main>
    <style>
      .popup-asset { padding: 28px; }
      .popup-stage {
        position: relative;
        height: 570px;
        margin-top: 22px;
      }
      .popup-browser {
        width: 920px;
        height: 100%;
      }
      .popup {
        position: absolute;
        top: 52px;
        right: 0;
        width: 425px;
        padding: 20px;
        background: #1b2f32;
        border-width: 5px;
      }
      .popup header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        padding: 22px;
        background: #f4f0e7;
        border: 4px solid #5b7777;
      }
      .popup h2 {
        margin: 0;
        color: #0d5261;
        font-size: 34px;
        font-weight: 900;
        line-height: 1;
      }
      .popup p {
        margin: 10px 0 0;
        color: #6f8581;
        font-size: 17px;
        font-weight: 900;
      }
      .popup img {
        width: 70px;
        height: 70px;
      }
      .toggle-box {
        margin-top: 16px;
        padding: 18px;
        background: #f4f0e7;
        border: 4px solid #5b7777;
      }
      .toggle-box h3 {
        margin: 0 0 12px;
        color: #0d5261;
        font-size: 22px;
        font-weight: 900;
      }
      .segmented {
        display: grid;
        grid-template-columns: 1fr 1fr;
        height: 54px;
        border: 3px solid #0d5261;
      }
      .segmented span {
        display: grid;
        place-items: center;
        background: #e8dfcf;
        color: #6f8581;
        font-size: 22px;
        font-weight: 900;
      }
      .segmented .on {
        background: #2ca8a0;
        color: #fff;
      }
    </style>
  `;
}

function promoMarkup() {
  return `
    <main class="asset promo">
      <section class="promo-card panel">
        <div>
          <h1 class="title">Timeline<br>Gallery</h1>
          <p class="subtitle">タイムラインを画像ギャラリーに</p>
        </div>
        <img class="icon" src="${iconDataUrl}" alt="">
      </section>
    </main>
    <style>
      .promo { padding: 18px; border-width: 6px; }
      .promo-card {
        width: 100%;
        height: 100%;
        padding: 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .promo-card > div {
        min-width: 0;
        flex: 1;
      }
      .promo .title {
        font-size: 48px;
        line-height: 0.95;
      }
      .promo .subtitle {
        margin-top: 16px;
        font-size: 16px;
        white-space: nowrap;
      }
      .promo .icon {
        width: 88px;
        height: 88px;
        margin-left: 18px;
      }
    </style>
  `;
}

function galleryPost(kind) {
  return `
    <article class="post gallery-post">
      ${galleryImage(kind)}
      <div class="actions"><span></span><span></span><span class="bookmark"></span><span></span></div>
    </article>
  `;
}

function galleryImage(kind) {
  if (kind === 'tall') {
    return `
      <div class="image tall">
        <div class="cards"><div class="card"></div><div class="card"></div><div class="card"></div></div>
      </div>
    `;
  }

  if (kind === 'cards') {
    return `
      <div class="image landscape">
        <div class="cards"><div class="card"></div><div class="card"></div><div class="card"></div></div>
      </div>
    `;
  }

  return `
    <div class="image landscape">
      <div class="art-sky"></div>
      <div class="sun"></div>
      <div class="ridge"></div>
      <div class="ridge alt"></div>
    </div>
  `;
}

function normalPost(hasImage) {
  return `
    <article class="post">
      <div class="post-head">
        <span class="avatar"></span>
        <div class="name-lines"><div class="line short"></div><div class="line mid"></div></div>
      </div>
      <div class="post-text"><div class="line long"></div><div class="line mid"></div></div>
      ${hasImage ? '<div class="image landscape"><div class="art-sky"></div><div class="sun"></div><div class="ridge"></div><div class="ridge alt"></div></div>' : ''}
      <div class="actions"><span></span><span></span><span></span><span class="bookmark"></span></div>
    </article>
  `;
}

function railLines(count) {
  return Array.from(
    { length: count },
    () => '<div class="rail-line"></div>',
  ).join('');
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}
