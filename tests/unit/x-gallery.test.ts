import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GALLERY_MODE_SETTINGS } from '../../src/utils/storage';
import {
  AD_LABEL_CLASS,
  GALLERY_ACCOUNT_INFO_PART_ATTRIBUTE,
  GALLERY_CELL_ATTRIBUTE,
  GALLERY_COMPOSER_ATTRIBUTE,
  GALLERY_CONTENT_COLUMN_ATTRIBUTE,
  GALLERY_HIDDEN_CHROME_ATTRIBUTE,
  GALLERY_MENU_SUPPRESSED_ATTRIBUTE,
  GALLERY_MEDIA_BLOCK_ATTRIBUTE,
  GALLERY_MEDIA_ORIENTATION_ATTRIBUTE,
  GALLERY_MEDIA_SIZE_ATTRIBUTE,
  GALLERY_POST_ATTRIBUTE,
  GALLERY_POST_TIME_LINK_ATTRIBUTE,
  GALLERY_POST_TIME_SEPARATOR_ATTRIBUTE,
  GALLERY_REPOST_CONTEXT_ATTRIBUTE,
  GALLERY_ROOT_ATTRIBUTE,
  GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE,
  GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE,
  GALLERY_SHOW_POST_TIME_ATTRIBUTE,
  GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE,
  GALLERY_SHOW_REPLY_ATTRIBUTE,
  GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE,
  GALLERY_SIMPLIFY_POSTS_ATTRIBUTE,
  GALLERY_STYLE_ID,
  NATIVE_MENU_BUTTON_CLASS,
  NOT_INTERESTED_BUTTON_CLASS,
  applyXGalleryMode,
  classifyGalleryPost,
  setXGalleryModeEnabled,
} from '../../src/utils/x-gallery';

describe('x-gallery', () => {
  it('shows only single-image posts with default settings', () => {
    document.body.innerHTML = `
      <article id="text-only" data-testid="tweet">
        <div data-testid="tweetText">Text only</div>
        <div role="group"><button data-testid="like"></button></div>
      </article>
      <article id="single-image" data-testid="tweet">
        <div data-testid="tweetText">Single image</div>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
      <article id="multi-image" data-testid="tweet">
        <a href="/example/status/2/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/b.jpg" /></div>
        </a>
        <a href="/example/status/2/photo/2">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/c.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
      <article id="video" data-testid="tweet">
        <div data-testid="videoPlayer"></div>
        <div role="group"><button data-testid="like"></button></div>
      </article>
      <article id="gif" data-testid="tweet">
        <div data-testid="gifPlayer"></div>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    const summary = applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(summary).toEqual({
      visiblePosts: 1,
      hiddenPosts: 4,
    });
    expect(getPostState('text-only')).toBe('hidden-no-image');
    expect(getPostState('single-image')).toBe('single-image');
    expect(getPostState('multi-image')).toBe('hidden-multiple-images');
    expect(getPostState('video')).toBe('hidden-video');
    expect(getPostState('gif')).toBe('hidden-gif');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).not.toBeNull();
  });

  it('allows image posts up to the configured image count', () => {
    document.body.innerHTML = `
      <article id="multi-image" data-testid="tweet">
        <a href="/example/status/2/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/b.jpg" /></div>
        </a>
        <a href="/example/status/2/photo/2">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/c.jpg" /></div>
        </a>
      </article>
    `;

    expect(
      classifyGalleryPost(document.querySelector('article')!, {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        imageCount: 2,
      }),
    ).toBe('single-image');

    expect(
      classifyGalleryPost(
        document.querySelector('article')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('hidden-multiple-images');
  });

  it('shows GIF and video posts only when their settings are enabled', () => {
    document.body.innerHTML = `
      <article id="gif" data-testid="tweet">
        <div data-testid="gifPlayer"></div>
      </article>
      <article id="video" data-testid="tweet">
        <div data-testid="videoPlayer"></div>
      </article>
    `;

    expect(
      classifyGalleryPost(
        document.getElementById('gif')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('hidden-gif');
    expect(
      classifyGalleryPost(document.getElementById('gif')!, {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        includeGifs: true,
      }),
    ).toBe('single-image');
    expect(
      classifyGalleryPost(
        document.getElementById('video')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('hidden-video');
    expect(
      classifyGalleryPost(document.getElementById('video')!, {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        includeVideos: true,
      }),
    ).toBe('single-image');
  });

  it('does not double count a tweetPhoto wrapped by a photo link', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto">
            <img src="https://pbs.twimg.com/media/a.jpg" />
          </div>
        </a>
      </article>
    `;

    expect(
      classifyGalleryPost(
        document.querySelector('article')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('single-image');
  });

  it('hides posts surfaced because a followed account replied', () => {
    document.body.innerHTML = `
      <article id="followed-reply" data-testid="tweet">
        <div data-testid="socialContext">Exampleさんが返信しました</div>
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    const summary = applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(summary).toEqual({
      visiblePosts: 0,
      hiddenPosts: 1,
    });
    expect(getPostState('followed-reply')).toBe('hidden-reply-context');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
  });

  it('does not hide reposted image posts as followed-account replies', () => {
    document.body.innerHTML = `
      <article id="reposted" data-testid="tweet">
        <div data-testid="socialContext">Exampleさんがリポスト</div>
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(getPostState('reposted')).toBe('single-image');
  });

  it('shows a non-clickable ad label instead of the not interested button for ads', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <article id="ad" data-testid="tweet">
          <div data-testid="placementTracking"></div>
          <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
          <a href="/example/status/1/photo/1">
            <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
          </a>
          <div role="group"><button data-testid="like"></button></div>
        </article>
      </div>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(getPostState('ad')).toBe('single-image');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
    const adLabel = document.querySelector(`.${AD_LABEL_CLASS}`);
    expect(adLabel?.textContent).toBe('Ad');
    expect(adLabel?.tagName).toBe('SPAN');
  });

  it('detects ad labels attached to the timeline cell instead of the article', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <span>広告</span>
        <article id="cell-ad" data-testid="tweet">
          <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
          <a href="/example/status/1/photo/1">
            <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
          </a>
          <div role="group"><button data-testid="like"></button></div>
        </article>
      </div>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(getPostState('cell-ad')).toBe('single-image');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
    expect(document.querySelector(`.${AD_LABEL_CLASS}`)?.textContent).toBe(
      'Ad',
    );
  });

  it('detects nested ad labels in the article chrome', () => {
    document.body.innerHTML = `
      <article id="nested-ad" data-testid="tweet">
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <div>
          <div><span><span>広告</span></span></div>
          <button data-testid="caret"></button>
        </div>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(getPostState('nested-ad')).toBe('single-image');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
    expect(document.querySelector(`.${AD_LABEL_CLASS}`)?.textContent).toBe(
      'Ad',
    );
  });

  it('replaces an existing ad label with the not interested button for regular posts', () => {
    document.body.innerHTML = `
      <article id="regular" data-testid="tweet">
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group">
          <button data-testid="like"></button>
          <span class="${AD_LABEL_CLASS}">Ad</span>
        </div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(document.querySelector(`.${AD_LABEL_CLASS}`)).toBeNull();
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).not.toBeNull();
  });

  it('suppresses the native menu while clicking the custom not interested button', async () => {
    document.body.innerHTML = `
      <article id="regular" data-testid="tweet">
        <button id="caret" data-testid="caret"></button>
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;
    let menuWasSuppressed = false;
    let menuItemClicked = false;
    document.getElementById('caret')?.addEventListener('click', () => {
      menuWasSuppressed =
        document.documentElement.getAttribute(
          GALLERY_MENU_SUPPRESSED_ATTRIBUTE,
        ) === 'true';
      const menu = document.createElement('div');
      menu.setAttribute('role', 'menu');
      const item = document.createElement('div');
      item.setAttribute('role', 'menuitem');
      item.textContent = 'このポストに興味がない';
      item.addEventListener('click', () => {
        menuItemClicked = true;
      });
      menu.append(item);
      document.body.append(menu);
    });

    setXGalleryModeEnabled(document, true);
    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(document.getElementById(GALLERY_STYLE_ID)?.textContent).toContain(
      `[${GALLERY_MENU_SUPPRESSED_ATTRIBUTE}="true"] [role="menu"]`,
    );

    document
      .querySelector<HTMLButtonElement>(`.${NOT_INTERESTED_BUTTON_CLASS}`)
      ?.click();

    await waitFor(() => menuItemClicked);

    expect(menuWasSuppressed).toBe(true);
    expect(menuItemClicked).toBe(true);
    await wait(150);
    expect(
      document.documentElement.hasAttribute(GALLERY_MENU_SUPPRESSED_ATTRIBUTE),
    ).toBe(false);
  });

  it('uses the native menu button on the following timeline', () => {
    document.body.innerHTML = `
      <div role="tab" aria-selected="true">フォロー中</div>
      <article id="following-post" data-testid="tweet">
        <button id="caret" data-testid="caret" aria-label="もっと見る"></button>
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div id="actions" role="group"><button data-testid="like"></button></div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    const caret = document.getElementById('caret');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
    expect(caret?.classList.contains(NATIVE_MENU_BUTTON_CLASS)).toBe(true);
    expect(document.getElementById('actions')?.contains(caret)).toBe(true);
  });

  it('falls back to the native menu when the not interested menu item is unavailable', async () => {
    document.body.innerHTML = `
      <article id="regular" data-testid="tweet">
        <div id="original-menu-parent">
          <button id="caret" data-testid="caret" aria-label="もっと見る"></button>
        </div>
        <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div id="actions" role="group"><button data-testid="like"></button></div>
      </article>
    `;
    document.getElementById('caret')?.addEventListener('click', () => {
      const menu = document.createElement('div');
      menu.setAttribute('role', 'menu');
      const item = document.createElement('div');
      item.setAttribute('role', 'menuitem');
      item.textContent = '@exampleさんのフォローを解除';
      menu.append(item);
      document.body.append(menu);
    });

    setXGalleryModeEnabled(document, true);
    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    document
      .querySelector<HTMLButtonElement>(`.${NOT_INTERESTED_BUTTON_CLASS}`)
      ?.click();

    await waitFor(() => {
      return (
        document
          .getElementById('caret')
          ?.classList.contains(NATIVE_MENU_BUTTON_CLASS) ?? false
      );
    });

    const caret = document.getElementById('caret');
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
    expect(document.getElementById('actions')?.contains(caret)).toBe(true);
  });

  it('does not treat link card or avatar images as post images', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="UserAvatar-Container-example">
          <img src="https://pbs.twimg.com/profile_images/avatar.jpg" />
        </div>
        <div data-testid="card.wrapper">
          <img src="https://pbs.twimg.com/card_img/example.jpg" />
        </div>
      </article>
    `;

    expect(
      classifyGalleryPost(
        document.querySelector('article')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('hidden-no-image');
  });

  it('does not treat quote or card tweetPhoto thumbnails as attached images', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="tweetPhoto">
          <img src="https://pbs.twimg.com/media/quote-thumbnail.jpg" />
        </div>
      </article>
    `;

    expect(
      classifyGalleryPost(
        document.querySelector('article')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('hidden-no-image');
  });

  it('does not treat quoted post images as attached images', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="/outer/status/10"><time datetime="2026-05-06"></time></a>
        <div data-testid="tweetText">Quoting an image post</div>
        <div data-testid="quote-card">
          <a href="/quoted/status/20/photo/1">
            <div data-testid="tweetPhoto">
              <img src="https://pbs.twimg.com/media/quoted.jpg" />
            </div>
          </a>
        </div>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    expect(
      classifyGalleryPost(
        document.querySelector('article')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('hidden-no-image');
  });

  it('counts only the outer post image when a quote card also has an image', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="/outer/status/10"><time datetime="2026-05-06"></time></a>
        <a href="/outer/status/10/photo/1">
          <div data-testid="tweetPhoto">
            <img src="https://pbs.twimg.com/media/outer.jpg" />
          </div>
        </a>
        <div data-testid="quote-card">
          <a href="/quoted/status/20/photo/1">
            <div data-testid="tweetPhoto">
              <img src="https://pbs.twimg.com/media/quoted.jpg" />
            </div>
          </a>
        </div>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    expect(
      classifyGalleryPost(
        document.querySelector('article')!,
        DEFAULT_GALLERY_MODE_SETTINGS,
      ),
    ).toBe('single-image');
  });

  it('hides quoted post cards when the outer post has a single image', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="/outer/status/10"><time datetime="2026-05-06"></time></a>
        <div>
          <a href="/outer/status/10/photo/1">
            <div data-testid="tweetPhoto">
              <img src="https://pbs.twimg.com/media/outer.jpg" />
            </div>
          </a>
          <div id="quote-card">
            <a href="/quoted/status/20/photo/1">
              <div data-testid="tweetPhoto">
                <img src="https://pbs.twimg.com/media/quoted.jpg" />
              </div>
            </a>
          </div>
        </div>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(
      document
        .getElementById('quote-card')
        ?.getAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE),
    ).toBe('true');
  });

  it('hides the whole social context row for reposted posts', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div>
          <div id="social-row">
            <svg aria-label="Repost"></svg>
            <div data-testid="socialContext">Example reposted</div>
          </div>
          <div>
            <a href="/example/status/1/photo/1">
              <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
            </a>
            <div role="group"><button data-testid="like"></button></div>
          </div>
        </div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(
      document
        .getElementById('social-row')
        ?.getAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('social-row')
        ?.getAttribute(GALLERY_REPOST_CONTEXT_ATTRIBUTE),
    ).toBe('true');
  });

  it('marks repost context rows as revealable when enabled', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div>
          <div id="social-row">
            <svg aria-label="Repost"></svg>
            <div data-testid="socialContext">Exampleさんがリポスト</div>
          </div>
          <div>
            <a href="/example/status/1/photo/1">
              <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
            </a>
            <div role="group"><button data-testid="like"></button></div>
          </div>
        </div>
      </article>
    `;
    const settings = {
      ...DEFAULT_GALLERY_MODE_SETTINGS,
      showRepostContext: true,
    };

    setXGalleryModeEnabled(document, true, { settings });
    applyXGalleryMode(document, settings);

    expect(
      document.documentElement.getAttribute(
        GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE,
      ),
    ).toBe('true');
    expect(
      document
        .getElementById('social-row')
        ?.getAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('social-row')
        ?.getAttribute(GALLERY_REPOST_CONTEXT_ATTRIBUTE),
    ).toBe('true');
    expect(document.getElementById(GALLERY_STYLE_ID)?.textContent).toContain(
      GALLERY_REPOST_CONTEXT_ATTRIBUTE,
    );
  });

  it('marks account metadata separately from the post time', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div>
          <div id="metadata-row">
            <div id="user-name" data-testid="User-Name">
              <div id="display-name"><span>Fixture User</span></div>
              <div id="handle-line">
                <span id="handle">@fixture</span>
                <span id="separator"> · </span>
                <a id="time-link" href="/example/status/1"><time datetime="2026-05-06">5月6日</time></a>
              </div>
            </div>
            <a href="/example/status/1/photo/1">
              <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
            </a>
            <div role="group"><button data-testid="like"></button></div>
          </div>
        </div>
      </article>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(
      document
        .getElementById('metadata-row')
        ?.getAttribute(GALLERY_CONTENT_COLUMN_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('user-name')
        ?.getAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('display-name')
        ?.getAttribute(GALLERY_ACCOUNT_INFO_PART_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('handle')
        ?.getAttribute(GALLERY_ACCOUNT_INFO_PART_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('time-link')
        ?.getAttribute(GALLERY_POST_TIME_LINK_ATTRIBUTE),
    ).toBe('true');
    expect(
      document
        .getElementById('separator')
        ?.getAttribute(GALLERY_POST_TIME_SEPARATOR_ATTRIBUTE),
    ).toBe('true');
  });

  it('keeps CSS rules for account info and post time independently toggleable', () => {
    setXGalleryModeEnabled(document, true, { simplifyPosts: true });

    const styleText =
      document.getElementById(GALLERY_STYLE_ID)?.textContent ?? '';

    expect(styleText).toContain(GALLERY_ACCOUNT_INFO_PART_ATTRIBUTE);
    expect(styleText).toContain(GALLERY_POST_TIME_LINK_ATTRIBUTE);
    expect(styleText).toContain(GALLERY_POST_TIME_SEPARATOR_ATTRIBUTE);
    expect(styleText).toContain(
      `[${GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE}="false"][${GALLERY_SHOW_POST_TIME_ATTRIBUTE}="false"]`,
    );
    expect(styleText).toContain(
      `[${GALLERY_SHOW_POST_TIME_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [${GALLERY_POST_TIME_LINK_ATTRIBUTE}="true"]`,
    );
  });

  it('marks landscape media with an aspect ratio for gallery layout', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <div>
          <div id="media-block">
            <a href="/example/status/1/photo/1">
              <div data-testid="tweetPhoto">
                <img id="image" src="https://pbs.twimg.com/media/a.jpg" />
              </div>
            </a>
          </div>
          <div role="group"><button data-testid="like"></button></div>
        </div>
      </article>
    `;
    const image = document.getElementById('image') as HTMLImageElement;
    Object.defineProperties(image, {
      complete: { value: true },
      naturalHeight: { value: 90 },
      naturalWidth: { value: 120 },
    });

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    const mediaBlock = document.querySelector<HTMLElement>(
      `[${GALLERY_MEDIA_BLOCK_ATTRIBUTE}]`,
    );
    expect(mediaBlock?.getAttribute(GALLERY_MEDIA_ORIENTATION_ATTRIBUTE)).toBe(
      'landscape',
    );
    expect(
      mediaBlock?.style.getPropertyValue(
        '--timeline-gallery-media-aspect-ratio',
      ),
    ).toBe('120 / 90');
  });

  it('does not hide unclassified timeline cells through the gallery stylesheet', () => {
    setXGalleryModeEnabled(document, true, { simplifyPosts: true });

    const styleText =
      document.getElementById(GALLERY_STYLE_ID)?.textContent ?? '';

    expect(styleText).not.toContain(
      `[data-testid="cellInnerDiv"]:not([${GALLERY_CELL_ATTRIBUTE}`,
    );
  });

  it('does not push the layout right when the left sidebar is visible', () => {
    setXGalleryModeEnabled(document, true, {
      settings: {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        showLeftSidebar: true,
      },
      simplifyPosts: true,
    });

    const styleText =
      document.getElementById(GALLERY_STYLE_ID)?.textContent ?? '';

    expect(styleText).toContain(
      `[${GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE}="true"] main[role="main"]`,
    );
    expect(styleText).toContain('--timeline-gallery-left-sidebar-width');
    expect(styleText).toContain(':has(> header[role="banner"]):has(> main');
    expect(styleText).toContain('margin-left: 0 !important;');
  });

  it('centers the full layout width when both sidebars are visible', () => {
    setXGalleryModeEnabled(document, true, {
      settings: {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        showLeftSidebar: true,
        showRightSidebar: true,
      },
      simplifyPosts: true,
    });

    const styleText =
      document.getElementById(GALLERY_STYLE_ID)?.textContent ?? '';

    expect(styleText).toContain('--timeline-gallery-right-sidebar-width');
    expect(styleText).toContain(
      `[${GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE}="true"][${GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE}="true"] div:has(> header[role="banner"]):has(> main[role="main"])`,
    );
    expect(styleText).toContain(
      'var(--timeline-gallery-left-sidebar-width) + var(--timeline-gallery-primary-width) + var(--timeline-gallery-right-sidebar-width)',
    );
    expect(styleText).toContain(
      `[${GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE}="true"] [data-testid="sidebarColumn"]`,
    );
  });

  it('allows the reply action to be restored on the lower-left side', () => {
    setXGalleryModeEnabled(document, true, {
      settings: {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        showReply: true,
      },
      simplifyPosts: true,
    });

    const styleText =
      document.getElementById(GALLERY_STYLE_ID)?.textContent ?? '';

    expect(styleText).toContain(
      `button:not([data-testid="reply"]):not([data-testid="like"])`,
    );
    expect(styleText).toContain(
      `[${GALLERY_SHOW_REPLY_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] {`,
    );
    expect(styleText).toContain('grid-template-columns: minmax(40px, 1fr)');
    expect(styleText).toContain(
      `> div:has([data-testid="reply"]) {\n  grid-column: 1`,
    );
  });

  it('preserves existing cell markers and custom actions on repeated applies', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <article id="single-image" data-testid="tweet">
          <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
          <a href="/example/status/1/photo/1">
            <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
          </a>
          <div role="group"><button data-testid="like"></button></div>
        </article>
      </div>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);
    const cell = document.querySelector<HTMLElement>(
      `[data-testid="cellInnerDiv"]`,
    );
    const button = document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`);
    const removeAttribute = vi.spyOn(Element.prototype, 'removeAttribute');

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(cell?.getAttribute(GALLERY_CELL_ATTRIBUTE)).toBe('single-image');
    expect(document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`)).toBe(
      button,
    );
    expect(
      document.querySelectorAll(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toHaveLength(1);
    expect(
      removeAttribute.mock.calls.some(([attribute]) => {
        return attribute === GALLERY_CELL_ATTRIBUTE;
      }),
    ).toBe(false);

    removeAttribute.mockRestore();
  });

  it('does not call browser scroll APIs while applying gallery markers', () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <article id="single-image" data-testid="tweet">
          <a href="/example/status/1"><time datetime="2026-05-06"></time></a>
          <a href="/example/status/1/photo/1">
            <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
          </a>
          <div role="group"><button data-testid="like"></button></div>
        </article>
      </div>
    `;
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    if (!originalScrollIntoView) {
      Element.prototype.scrollIntoView = () => undefined;
    }
    const scrollIntoView = vi
      .spyOn(Element.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);

    setXGalleryModeEnabled(document, true, { simplifyPosts: true });
    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();

    scrollTo.mockRestore();
    scrollIntoView.mockRestore();
    if (!originalScrollIntoView) {
      delete (Element.prototype as Partial<Element>).scrollIntoView;
    }
  });

  it('keeps page layout mode enabled while clearing post simplification markers', () => {
    document.body.innerHTML = `
      <article id="single-image" data-testid="tweet">
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    setXGalleryModeEnabled(document, true, { simplifyPosts: true });
    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);
    setXGalleryModeEnabled(document, true, { simplifyPosts: false });

    expect(document.documentElement.getAttribute(GALLERY_ROOT_ATTRIBUTE)).toBe(
      'true',
    );
    expect(
      document.documentElement.getAttribute(GALLERY_SIMPLIFY_POSTS_ATTRIBUTE),
    ).toBe('false');
    expect(getPostState('single-image')).toBeNull();
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
  });

  it('keeps the composer marker after the composer is hidden', () => {
    document.body.innerHTML = `
      <div data-testid="primaryColumn">
        <div id="composer">
          <div data-testid="tweetTextarea_0"></div>
        </div>
      </div>
    `;
    const composer = document.getElementById('composer') as HTMLElement;
    let composerIsHidden = false;
    const rect = vi
      .spyOn(composer, 'getBoundingClientRect')
      .mockImplementation(() => {
        const width = composerIsHidden ? 0 : 640;
        const height = composerIsHidden ? 0 : 120;
        return {
          x: 0,
          y: 0,
          width,
          height,
          top: 0,
          right: width,
          bottom: height,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect;
      });

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);
    expect(composer.getAttribute(GALLERY_COMPOSER_ATTRIBUTE)).toBe('true');

    composerIsHidden = true;
    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);
    expect(composer.getAttribute(GALLERY_COMPOSER_ATTRIBUTE)).toBe('true');

    rect.mockRestore();
  });

  it('marks the outer composer container when multiple composer ancestors match', () => {
    document.body.innerHTML = `
      <div data-testid="primaryColumn">
        <div id="outer-composer">
          <div id="inner-composer">
            <div data-testid="tweetTextarea_0"></div>
          </div>
        </div>
      </div>
    `;
    const outerComposer = document.getElementById(
      'outer-composer',
    ) as HTMLElement;
    const innerComposer = document.getElementById(
      'inner-composer',
    ) as HTMLElement;
    const outerRect = vi
      .spyOn(outerComposer, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 640,
        height: 180,
        top: 0,
        right: 640,
        bottom: 180,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect);
    const innerRect = vi
      .spyOn(innerComposer, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width: 640,
        height: 100,
        top: 0,
        right: 640,
        bottom: 100,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect);

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(outerComposer.getAttribute(GALLERY_COMPOSER_ATTRIBUTE)).toBe('true');
    expect(innerComposer.hasAttribute(GALLERY_COMPOSER_ATTRIBUTE)).toBe(false);

    outerRect.mockRestore();
    innerRect.mockRestore();
  });

  it('removes a stale composer marker from an ancestor that now contains posts', () => {
    document.body.innerHTML = `
      <div data-testid="primaryColumn">
        <div id="stale-composer" ${GALLERY_COMPOSER_ATTRIBUTE}="true">
          <div>
            <div data-testid="tweetTextarea_0"></div>
          </div>
          <article data-testid="tweet">
            <a href="/example/status/1/photo/1">
              <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
            </a>
            <div role="group"><button data-testid="like"></button></div>
          </article>
        </div>
      </div>
    `;

    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);

    expect(
      document
        .getElementById('stale-composer')
        ?.hasAttribute(GALLERY_COMPOSER_ATTRIBUTE),
    ).toBe(false);
  });

  it('sets root attributes for gallery detail settings', () => {
    setXGalleryModeEnabled(document, true, {
      settings: {
        ...DEFAULT_GALLERY_MODE_SETTINGS,
        mediaSize: 'l',
        showAccountInfo: true,
        showRepostContext: true,
        showReply: true,
        showLeftSidebar: true,
      },
    });

    expect(
      document.documentElement.getAttribute(GALLERY_MEDIA_SIZE_ATTRIBUTE),
    ).toBe('l');
    expect(
      document.documentElement.getAttribute(
        GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE,
      ),
    ).toBe('true');
    expect(
      document.documentElement.getAttribute(
        GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE,
      ),
    ).toBe('true');
    expect(
      document.documentElement.getAttribute(GALLERY_SHOW_REPLY_ATTRIBUTE),
    ).toBe('true');
    expect(
      document.documentElement.getAttribute(
        GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE,
      ),
    ).toBe('true');
  });

  it('removes gallery markers and custom buttons when disabled', () => {
    document.body.innerHTML = `
      <article id="single-image" data-testid="tweet">
        <a href="/example/status/1/photo/1">
          <div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/a.jpg" /></div>
        </a>
        <div role="group"><button data-testid="like"></button></div>
      </article>
    `;

    setXGalleryModeEnabled(document, true);
    applyXGalleryMode(document, DEFAULT_GALLERY_MODE_SETTINGS);
    setXGalleryModeEnabled(document, false);

    expect(document.documentElement.getAttribute(GALLERY_ROOT_ATTRIBUTE)).toBe(
      'false',
    );
    expect(getPostState('single-image')).toBeNull();
    expect(
      document.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`),
    ).toBeNull();
  });
});

function getPostState(id: string): string | null {
  return (
    document.getElementById(id)?.getAttribute(GALLERY_POST_ATTRIBUTE) ?? null
  );
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (predicate()) {
      return;
    }

    await wait(10);
  }

  throw new Error('Timed out waiting for condition');
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
