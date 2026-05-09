import type { GalleryModeSettings } from './storage';

export const GALLERY_ROOT_ATTRIBUTE = 'data-timeline-gallery-enabled';
export const GALLERY_SIMPLIFY_POSTS_ATTRIBUTE =
  'data-timeline-gallery-simplify-posts';
export const GALLERY_MEDIA_SIZE_ATTRIBUTE = 'data-timeline-gallery-media-size';
export const GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE =
  'data-timeline-gallery-show-account-info';
export const GALLERY_SHOW_POST_TIME_ATTRIBUTE =
  'data-timeline-gallery-show-post-time';
export const GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE =
  'data-timeline-gallery-show-repost-context';
export const GALLERY_SHOW_LIKE_COUNT_ATTRIBUTE =
  'data-timeline-gallery-show-like-count';
export const GALLERY_SHOW_REPOST_COUNT_ATTRIBUTE =
  'data-timeline-gallery-show-repost-count';
export const GALLERY_SHOW_REPLY_ATTRIBUTE = 'data-timeline-gallery-show-reply';
export const GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE =
  'data-timeline-gallery-show-view-count';
export const GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE =
  'data-timeline-gallery-show-share-button';
export const GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE =
  'data-timeline-gallery-show-left-sidebar';
export const GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE =
  'data-timeline-gallery-show-right-sidebar';
export const GALLERY_POST_ATTRIBUTE = 'data-timeline-gallery-post';
export const GALLERY_CELL_ATTRIBUTE = 'data-timeline-gallery-cell';
export const GALLERY_COMPOSER_ATTRIBUTE = 'data-timeline-gallery-composer';
export const GALLERY_SIDE_RAIL_ATTRIBUTE = 'data-timeline-gallery-side-rail';
export const GALLERY_CONTENT_COLUMN_ATTRIBUTE =
  'data-timeline-gallery-content-column';
export const GALLERY_MEDIA_BLOCK_ATTRIBUTE =
  'data-timeline-gallery-media-block';
export const GALLERY_MEDIA_FRAME_ATTRIBUTE =
  'data-timeline-gallery-media-frame';
export const GALLERY_MEDIA_ORIENTATION_ATTRIBUTE =
  'data-timeline-gallery-media-orientation';
export const GALLERY_ACTIONS_BLOCK_ATTRIBUTE =
  'data-timeline-gallery-actions-block';
export const GALLERY_HIDDEN_CHROME_ATTRIBUTE =
  'data-timeline-gallery-hidden-chrome';
export const GALLERY_REPOST_CONTEXT_ATTRIBUTE =
  'data-timeline-gallery-repost-context';
export const GALLERY_MENU_SUPPRESSED_ATTRIBUTE =
  'data-timeline-gallery-menu-suppressed';
const GALLERY_NATIVE_MENU_REASON_ATTRIBUTE =
  'data-timeline-gallery-native-menu-reason';
export const GALLERY_STYLE_ID = 'timeline-gallery-mode-style';
export const NOT_INTERESTED_BUTTON_CLASS = 'timeline-gallery-not-interested';
export const NATIVE_MENU_BUTTON_CLASS = 'timeline-gallery-native-menu';
export const AD_LABEL_CLASS = 'timeline-gallery-ad-label';

const MENU_SUPPRESSION_CLEAR_DELAY_MS = 120;

export type GalleryPostState =
  | 'single-image'
  | 'hidden-no-image'
  | 'hidden-multiple-images'
  | 'hidden-video'
  | 'hidden-gif'
  | 'hidden-reply-context';

export type GalleryApplySummary = {
  visiblePosts: number;
  hiddenPosts: number;
};

type GalleryModeOptions = {
  settings?: GalleryModeSettings;
  simplifyPosts?: boolean;
};

type MenuItemMatch = {
  element: HTMLElement;
  type: 'ad' | 'not-interested';
};

const nativeMenuButtonLocations = new WeakMap<
  HTMLElement,
  {
    nextSibling: ChildNode | null;
    parent: Node;
  }
>();

export function applyXGalleryMode(
  documentRef: Document,
  settings: GalleryModeSettings,
): GalleryApplySummary {
  const articles = findTimelineArticles(documentRef);
  clearGalleryLayoutMarkers(documentRef);
  markComposerContainers(documentRef);
  let visiblePosts = 0;
  let hiddenPosts = 0;

  for (const article of articles) {
    const state = classifyGalleryPost(article, settings);
    article.setAttribute(GALLERY_POST_ATTRIBUTE, state);
    markGalleryCell(article, state);

    if (state === 'single-image') {
      visiblePosts += 1;
      markSingleImagePostLayout(article);
      ensureTrailingAction(article, documentRef);
    } else {
      hiddenPosts += 1;
      removeTrailingAction(article);
    }
  }

  return {
    visiblePosts,
    hiddenPosts,
  };
}

export function setXGalleryModeEnabled(
  documentRef: Document,
  enabled: boolean,
  options: GalleryModeOptions = {},
): void {
  const simplifyPosts = enabled && (options.simplifyPosts ?? true);
  const settings = options.settings;

  documentRef.documentElement.setAttribute(
    GALLERY_ROOT_ATTRIBUTE,
    enabled ? 'true' : 'false',
  );
  documentRef.documentElement.setAttribute(
    GALLERY_SIMPLIFY_POSTS_ATTRIBUTE,
    simplifyPosts ? 'true' : 'false',
  );

  if (settings) {
    setGallerySettingsAttributes(documentRef, settings);
  }

  if (enabled) {
    ensureGalleryStyle(documentRef);
    if (simplifyPosts) {
      return;
    }
  }

  clearGalleryPostSimplification(documentRef);
}

function setGallerySettingsAttributes(
  documentRef: Document,
  settings: GalleryModeSettings,
): void {
  const root = documentRef.documentElement;
  root.setAttribute(GALLERY_MEDIA_SIZE_ATTRIBUTE, settings.mediaSize);
  root.setAttribute(
    GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE,
    String(settings.showAccountInfo),
  );
  root.setAttribute(
    GALLERY_SHOW_POST_TIME_ATTRIBUTE,
    String(settings.showPostTime),
  );
  root.setAttribute(
    GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE,
    String(settings.showRepostContext),
  );
  root.setAttribute(
    GALLERY_SHOW_LIKE_COUNT_ATTRIBUTE,
    String(settings.showLikeCount),
  );
  root.setAttribute(
    GALLERY_SHOW_REPOST_COUNT_ATTRIBUTE,
    String(settings.showRepostCount),
  );
  root.setAttribute(GALLERY_SHOW_REPLY_ATTRIBUTE, String(settings.showReply));
  root.setAttribute(
    GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE,
    String(settings.showViewCount),
  );
  root.setAttribute(
    GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE,
    String(settings.showShareButton),
  );
  root.setAttribute(
    GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE,
    String(settings.showLeftSidebar),
  );
  root.setAttribute(
    GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE,
    String(settings.showRightSidebar),
  );
}

function clearGalleryPostSimplification(documentRef: Document): void {
  for (const article of findTimelineArticles(documentRef)) {
    article.removeAttribute(GALLERY_POST_ATTRIBUTE);
  }

  for (const composer of documentRef.querySelectorAll(
    `[${GALLERY_COMPOSER_ATTRIBUTE}]`,
  )) {
    composer.removeAttribute(GALLERY_COMPOSER_ATTRIBUTE);
  }

  clearGalleryLayoutMarkers(documentRef);

  for (const button of documentRef.querySelectorAll(
    `.${NOT_INTERESTED_BUTTON_CLASS}, .${AD_LABEL_CLASS}`,
  )) {
    button.remove();
  }

  restoreNativeMenuButtons(documentRef);

  documentRef.documentElement.removeAttribute(
    GALLERY_MENU_SUPPRESSED_ATTRIBUTE,
  );
}

export function classifyGalleryPost(
  article: Element,
  settings: GalleryModeSettings,
): GalleryPostState {
  if (hasReplySocialContext(article)) {
    return 'hidden-reply-context';
  }

  const hasGif = hasGifMedia(article);
  const hasVideo = hasVideoMedia(article);

  if (hasGif && !settings.includeGifs) {
    return 'hidden-gif';
  }

  if (hasVideo && !settings.includeVideos) {
    return 'hidden-video';
  }

  const imageCount = getPostImageCount(article);
  if (
    imageCount === 0 &&
    !(hasGif && settings.includeGifs) &&
    !(hasVideo && settings.includeVideos)
  ) {
    return 'hidden-no-image';
  }

  if (imageCount > settings.imageCount) {
    return 'hidden-multiple-images';
  }

  return 'single-image';
}

export function getPostImageCount(article: Element): number {
  return findPostPhotoContainers(article).length;
}

function findTimelineArticles(documentRef: Document): HTMLElement[] {
  return Array.from(
    documentRef.querySelectorAll<HTMLElement>(
      'article[data-testid="tweet"], article[role="article"]',
    ),
  );
}

function clearGalleryLayoutMarkers(documentRef: Document): void {
  const attributes = [
    GALLERY_CELL_ATTRIBUTE,
    GALLERY_SIDE_RAIL_ATTRIBUTE,
    GALLERY_CONTENT_COLUMN_ATTRIBUTE,
    GALLERY_MEDIA_BLOCK_ATTRIBUTE,
    GALLERY_MEDIA_FRAME_ATTRIBUTE,
    GALLERY_MEDIA_ORIENTATION_ATTRIBUTE,
    GALLERY_ACTIONS_BLOCK_ATTRIBUTE,
    GALLERY_HIDDEN_CHROME_ATTRIBUTE,
    GALLERY_REPOST_CONTEXT_ATTRIBUTE,
  ];

  for (const attribute of attributes) {
    for (const element of documentRef.querySelectorAll(`[${attribute}]`)) {
      element.removeAttribute(attribute);
    }
  }
}

function markGalleryCell(article: HTMLElement, state: GalleryPostState): void {
  article
    .closest<HTMLElement>('[data-testid="cellInnerDiv"]')
    ?.setAttribute(GALLERY_CELL_ATTRIBUTE, state);
}

function markSingleImagePostLayout(article: HTMLElement): void {
  const mediaItems = findPostMediaContainers(article);
  const media = mediaItems[0];
  if (!media) {
    return;
  }

  markQuotedPostCards(article, media);

  const actionsGroup = article.querySelector<HTMLElement>('[role="group"]');
  if (!actionsGroup) {
    return;
  }

  const contentColumn = findLowestCommonAncestor(media, actionsGroup, article);
  if (!contentColumn || contentColumn === article) {
    return;
  }

  contentColumn.setAttribute(GALLERY_CONTENT_COLUMN_ATTRIBUTE, 'true');

  const mediaBlock = findDirectChildContaining(contentColumn, media);
  const actionsBlock = findDirectChildContaining(contentColumn, actionsGroup);

  mediaBlock?.setAttribute(GALLERY_MEDIA_BLOCK_ATTRIBUTE, 'true');
  actionsBlock?.setAttribute(GALLERY_ACTIONS_BLOCK_ATTRIBUTE, 'true');

  if (mediaBlock) {
    markMediaFrameChain(mediaBlock, media);
    markMediaOrientation(mediaBlock, media);
  }

  markSocialContextRows(article, media);

  for (const child of Array.from(contentColumn.children)) {
    if (child !== mediaBlock && child !== actionsBlock) {
      child.setAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE, 'true');
    }
  }

  const contentRow = contentColumn.parentElement;
  if (contentRow && contentRow !== article) {
    for (const child of Array.from(contentRow.children)) {
      if (child !== contentColumn) {
        child.setAttribute(GALLERY_SIDE_RAIL_ATTRIBUTE, 'true');
      }
    }
  }
}

function markQuotedPostCards(article: HTMLElement, media: HTMLElement): void {
  const mainStatusPath = findMainStatusPath(article);
  if (!mainStatusPath) {
    return;
  }

  for (const statusLink of article.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/status/"]',
  )) {
    const statusPath = normalizeStatusPath(statusLink.getAttribute('href'));
    if (!statusPath || statusPath === mainStatusPath) {
      continue;
    }

    const quoteCard = findLargestAncestorWithoutDescendant(
      statusLink,
      article,
      media,
    );
    quoteCard.setAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE, 'true');
  }
}

function markSocialContextRows(article: HTMLElement, media: HTMLElement): void {
  for (const socialContext of article.querySelectorAll<HTMLElement>(
    '[data-testid="socialContext"]',
  )) {
    const row = findLargestAncestorWithoutDescendant(
      socialContext,
      article,
      media,
    );
    if (isRepostSocialContext(socialContext)) {
      row.setAttribute(GALLERY_REPOST_CONTEXT_ATTRIBUTE, 'true');
    }
    row.setAttribute(GALLERY_HIDDEN_CHROME_ATTRIBUTE, 'true');
  }
}

function findLargestAncestorWithoutDescendant(
  element: HTMLElement,
  boundary: HTMLElement,
  excludedDescendant: HTMLElement,
): HTMLElement {
  let candidate = element;
  let current: HTMLElement | null = element;

  while (
    current.parentElement &&
    current.parentElement !== boundary &&
    !current.parentElement.contains(excludedDescendant)
  ) {
    candidate = current.parentElement;
    current = current.parentElement;
  }

  return candidate;
}

function findPostPhotoContainers(article: Element): HTMLElement[] {
  const photoLinks = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[href*="/photo/"]'),
  );
  const mainStatusPath = findMainStatusPath(article);

  const containers = new Set<HTMLElement>();
  for (const link of photoLinks) {
    if (!isPhotoLinkForMainStatus(link, mainStatusPath)) {
      continue;
    }

    const photo = link.querySelector<HTMLElement>('[data-testid="tweetPhoto"]');
    if (photo) {
      containers.add(photo);
    }
  }

  return Array.from(containers);
}

function findPostMediaContainers(article: Element): HTMLElement[] {
  const photos = findPostPhotoContainers(article);
  if (photos.length > 0) {
    return photos;
  }

  const media = article.querySelector<HTMLElement>(
    [
      '[data-testid="gifPlayer"]',
      '[data-testid="videoPlayer"]',
      '[data-testid="videoComponent"]',
      'video',
    ].join(','),
  );

  return media ? [media] : [];
}

function findMainStatusPath(article: Element): string | null {
  const timeLink = article
    .querySelector('time')
    ?.closest<HTMLAnchorElement>('a[href*="/status/"]');
  const timeStatusPath = normalizeStatusPath(timeLink?.getAttribute('href'));
  if (timeStatusPath) {
    return timeStatusPath;
  }

  const statusLink = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'),
  ).find((link) => !link.getAttribute('href')?.includes('/photo/'));

  return normalizeStatusPath(statusLink?.getAttribute('href'));
}

function isPhotoLinkForMainStatus(
  link: HTMLAnchorElement,
  mainStatusPath: string | null,
): boolean {
  if (!mainStatusPath) {
    return true;
  }

  return normalizeStatusPath(link.getAttribute('href')) === mainStatusPath;
}

function normalizeStatusPath(href: string | null | undefined): string | null {
  if (!href) {
    return null;
  }

  let path: string;
  try {
    path = new URL(href, 'https://x.com').pathname;
  } catch {
    return null;
  }

  const match = /^\/([^/]+)\/status\/(\d+)/.exec(path);
  if (!match) {
    return null;
  }

  return `/${match[1]}/status/${match[2]}`;
}

function markMediaFrameChain(
  mediaBlock: HTMLElement,
  media: HTMLElement,
): void {
  let current: HTMLElement | null = media;

  while (current && current !== mediaBlock) {
    current.setAttribute(GALLERY_MEDIA_FRAME_ATTRIBUTE, 'true');
    current = current.parentElement;
  }
}

function markMediaOrientation(
  mediaBlock: HTMLElement,
  media: HTMLElement,
): void {
  const image = media.querySelector<HTMLImageElement>('img');
  if (!image) {
    return;
  }

  const applyOrientation = (): void => {
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return;
    }

    const orientation =
      image.naturalHeight > image.naturalWidth * 1.1
        ? 'portrait'
        : image.naturalWidth > image.naturalHeight * 1.1
          ? 'landscape'
          : 'square';

    mediaBlock.setAttribute(GALLERY_MEDIA_ORIENTATION_ATTRIBUTE, orientation);
    mediaBlock.style.setProperty(
      '--timeline-gallery-media-aspect-ratio',
      `${image.naturalWidth} / ${image.naturalHeight}`,
    );
  };

  applyOrientation();

  if (!image.complete) {
    image.addEventListener('load', applyOrientation, { once: true });
  }
}

function findLowestCommonAncestor(
  first: HTMLElement,
  second: HTMLElement,
  boundary: HTMLElement,
): HTMLElement | null {
  const firstAncestors = new Set<HTMLElement>();
  let current: HTMLElement | null = first;

  while (current) {
    firstAncestors.add(current);
    if (current === boundary) {
      break;
    }
    current = current.parentElement;
  }

  current = second;
  while (current) {
    if (firstAncestors.has(current)) {
      return current;
    }
    if (current === boundary) {
      break;
    }
    current = current.parentElement;
  }

  return null;
}

function findDirectChildContaining(
  parent: HTMLElement,
  descendant: HTMLElement,
): HTMLElement | null {
  for (const child of Array.from(parent.children)) {
    if (child === descendant || child.contains(descendant)) {
      return child as HTMLElement;
    }
  }

  return null;
}

function markComposerContainers(documentRef: Document): void {
  for (const composer of documentRef.querySelectorAll(
    `[${GALLERY_COMPOSER_ATTRIBUTE}]`,
  )) {
    composer.removeAttribute(GALLERY_COMPOSER_ATTRIBUTE);
  }

  for (const textArea of documentRef.querySelectorAll<HTMLElement>(
    '[data-testid="tweetTextarea_0"]',
  )) {
    const container = findComposerContainer(textArea);
    container?.setAttribute(GALLERY_COMPOSER_ATTRIBUTE, 'true');
  }
}

function findComposerContainer(textArea: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = textArea;
  let candidate: HTMLElement | null = null;

  while (current && !current.matches('[data-testid="primaryColumn"]')) {
    if (current.querySelector('article')) {
      break;
    }

    const rect = current.getBoundingClientRect();
    if (rect.width >= 520 && rect.height >= 80) {
      candidate = current;
    }

    current = current.parentElement;
  }

  return candidate;
}

function hasVideoMedia(article: Element): boolean {
  return Boolean(
    article.querySelector(
      [
        'video',
        '[data-testid="videoPlayer"]',
        '[data-testid="videoComponent"]',
        '[aria-label*="Video"]',
        '[aria-label*="動画"]',
      ].join(','),
    ),
  );
}

function hasGifMedia(article: Element): boolean {
  return Boolean(
    article.querySelector(
      [
        '[data-testid="gifPlayer"]',
        '[aria-label*="GIF"]',
        '[aria-label*="Gif"]',
      ].join(','),
    ),
  );
}

function hasReplySocialContext(article: Element): boolean {
  return Array.from(
    article.querySelectorAll<HTMLElement>('[data-testid="socialContext"]'),
  ).some((socialContext) => {
    const text = socialContext.textContent ?? '';
    return /返信|repl(?:y|ied|ies)/i.test(text);
  });
}

function isRepostSocialContext(socialContext: HTMLElement): boolean {
  const text = socialContext.textContent ?? '';
  return /リポスト|repost(?:ed)?/i.test(text);
}

function hasAdDisclosure(article: Element): boolean {
  const scope = article.closest('[data-testid="cellInnerDiv"]') ?? article;
  if (hasAdDisclosureText(scope)) {
    return true;
  }

  if (
    scope.querySelector(
      [
        '[data-testid="placementTracking"]',
        '[data-testid="promotedIndicator"]',
        '[aria-label*="Promoted"]',
        '[aria-label*="広告"]',
        '[aria-label*="プロモーション"]',
      ].join(','),
    )
  ) {
    return true;
  }

  return Array.from(
    scope.querySelectorAll<HTMLElement>(
      '[data-testid="socialContext"], [data-testid="promotedIndicator"], [aria-label], [title], span, div',
    ),
  ).some(isAdDisclosureElement);
}

function hasAdDisclosureText(scope: Element): boolean {
  return Array.from(scope.querySelectorAll<HTMLElement>('span, div')).some(
    (element) => {
      if (
        element.classList.contains(AD_LABEL_CLASS) ||
        element.querySelector(`.${AD_LABEL_CLASS}`)
      ) {
        return false;
      }

      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent ?? '')
        .join('')
        .trim();
      const text = ownText || (element.textContent ?? '').trim();
      return /^(Ad|Promoted|広告|プロモーション)$/i.test(text);
    },
  );
}

function isAdDisclosureElement(element: HTMLElement): boolean {
  if (
    element.classList.contains(AD_LABEL_CLASS) ||
    element.querySelector(`.${AD_LABEL_CLASS}`)
  ) {
    return false;
  }

  for (const attribute of ['data-testid', 'aria-label', 'title']) {
    const value = element.getAttribute(attribute);
    if (
      value &&
      /Promoted|promotion|advertis|プロモーション|広告/i.test(value)
    ) {
      return true;
    }
  }

  const text = (element.textContent ?? '').trim();
  return /^(Ad|Promoted|広告|プロモーション)$/i.test(text);
}

function ensureTrailingAction(
  article: HTMLElement,
  documentRef: Document,
): void {
  if (hasAdDisclosure(article)) {
    ensureAdLabel(article, documentRef);
    return;
  }

  removeAdLabel(article);

  if (shouldUseNativeMenuButton(article, documentRef)) {
    ensureNativeMenuButton(article, 'following');
    return;
  }

  ensureNotInterestedButton(article, documentRef);
}

function removeTrailingAction(article: HTMLElement): void {
  article.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`)?.remove();
  removeAdLabel(article);
  restoreNativeMenuButton(article);
}

function ensureAdLabel(article: HTMLElement, documentRef: Document): void {
  article.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`)?.remove();
  restoreNativeMenuButton(article);

  if (article.querySelector(`.${AD_LABEL_CLASS}`)) {
    return;
  }

  const actionsGroup = article.querySelector<HTMLElement>('[role="group"]');
  if (!actionsGroup) {
    return;
  }

  const label = documentRef.createElement('span');
  label.className = AD_LABEL_CLASS;
  label.textContent = 'Ad';
  label.setAttribute('aria-label', 'Ad');
  actionsGroup.append(label);
}

function removeAdLabel(article: HTMLElement): void {
  article.querySelector(`.${AD_LABEL_CLASS}`)?.remove();
}

function ensureNotInterestedButton(
  article: HTMLElement,
  documentRef: Document,
): void {
  removeAdLabel(article);
  restoreNativeMenuButton(article);

  if (article.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`)) {
    return;
  }

  const actionsGroup = article.querySelector<HTMLElement>('[role="group"]');
  if (!actionsGroup) {
    return;
  }

  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = NOT_INTERESTED_BUTTON_CLASS;
  button.title = 'このポストに興味がない';
  button.setAttribute('aria-label', 'このポストに興味がない');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void clickNotInterestedMenuItem(article, documentRef);
  });

  actionsGroup.append(button);
}

function shouldUseNativeMenuButton(
  article: HTMLElement,
  documentRef: Document,
): boolean {
  return (
    isFollowingTimelineSelected(documentRef) ||
    article.getAttribute(GALLERY_NATIVE_MENU_REASON_ATTRIBUTE) === 'unavailable'
  );
}

function isFollowingTimelineSelected(documentRef: Document): boolean {
  return Array.from(
    documentRef.querySelectorAll<HTMLElement>(
      '[role="tab"][aria-selected="true"], [aria-selected="true"]',
    ),
  ).some((tab) => /フォロー中|Following/i.test(tab.textContent ?? ''));
}

function ensureNativeMenuButton(
  article: HTMLElement,
  reason: 'following' | 'unavailable',
): void {
  article.querySelector(`.${NOT_INTERESTED_BUTTON_CLASS}`)?.remove();
  removeAdLabel(article);

  const actionsGroup = article.querySelector<HTMLElement>('[role="group"]');
  const menuButton = findNativeMenuButton(article);
  if (!actionsGroup || !menuButton) {
    return;
  }

  article.setAttribute(GALLERY_NATIVE_MENU_REASON_ATTRIBUTE, reason);

  if (!nativeMenuButtonLocations.has(menuButton)) {
    nativeMenuButtonLocations.set(menuButton, {
      nextSibling: menuButton.nextSibling,
      parent: menuButton.parentNode ?? article,
    });
  }

  menuButton.classList.add(NATIVE_MENU_BUTTON_CLASS);
  menuButton.title ||= 'もっと見る';
  if (!menuButton.getAttribute('aria-label')) {
    menuButton.setAttribute('aria-label', 'もっと見る');
  }

  if (menuButton.parentNode !== actionsGroup) {
    actionsGroup.append(menuButton);
  }
}

function restoreNativeMenuButtons(documentRef: Document): void {
  for (const menuButton of documentRef.querySelectorAll<HTMLElement>(
    `.${NATIVE_MENU_BUTTON_CLASS}`,
  )) {
    restoreNativeMenuButtonFromButton(menuButton);
  }

  for (const article of findTimelineArticles(documentRef)) {
    article.removeAttribute(GALLERY_NATIVE_MENU_REASON_ATTRIBUTE);
  }
}

function restoreNativeMenuButton(article: HTMLElement): void {
  article.removeAttribute(GALLERY_NATIVE_MENU_REASON_ATTRIBUTE);

  for (const menuButton of article.querySelectorAll<HTMLElement>(
    `.${NATIVE_MENU_BUTTON_CLASS}`,
  )) {
    restoreNativeMenuButtonFromButton(menuButton);
  }
}

function restoreNativeMenuButtonFromButton(menuButton: HTMLElement): void {
  menuButton.classList.remove(NATIVE_MENU_BUTTON_CLASS);

  const location = nativeMenuButtonLocations.get(menuButton);
  if (!location || !location.parent.isConnected) {
    return;
  }

  const nextSibling =
    location.nextSibling && location.parent.contains(location.nextSibling)
      ? location.nextSibling
      : null;
  location.parent.insertBefore(menuButton, nextSibling);
}

function findNativeMenuButton(article: HTMLElement): HTMLElement | null {
  return article.querySelector<HTMLElement>(
    [
      `.${NATIVE_MENU_BUTTON_CLASS}`,
      '[data-testid="caret"]',
      'button[aria-label*="More"]',
      'button[aria-label*="もっと見る"]',
      '[role="button"][aria-label*="More"]',
      '[role="button"][aria-label*="もっと見る"]',
    ].join(','),
  );
}

async function clickNotInterestedMenuItem(
  article: HTMLElement,
  documentRef: Document,
): Promise<void> {
  if (hasAdDisclosure(article)) {
    ensureAdLabel(article, documentRef);
    return;
  }

  const menuButton = article.querySelector<HTMLElement>(
    '[data-testid="caret"], [aria-label*="More"], [aria-label*="もっと見る"]',
  );
  if (!menuButton) {
    return;
  }

  documentRef.documentElement.setAttribute(
    GALLERY_MENU_SUPPRESSED_ATTRIBUTE,
    'true',
  );

  try {
    menuButton.click();
    const menuItem = await waitForTargetMenuItem(documentRef);

    if (menuItem?.type === 'ad') {
      dismissOpenMenu(documentRef);
      ensureAdLabel(article, documentRef);
      return;
    }

    if (menuItem) {
      menuItem.element.click();
      return;
    }

    dismissOpenMenu(documentRef);
    ensureNativeMenuButton(article, 'unavailable');
  } finally {
    await delay(MENU_SUPPRESSION_CLEAR_DELAY_MS);
    documentRef.documentElement.removeAttribute(
      GALLERY_MENU_SUPPRESSED_ATTRIBUTE,
    );
  }
}

function dismissOpenMenu(documentRef: Document): void {
  const KeyboardEventConstructor = documentRef.defaultView?.KeyboardEvent;
  if (!KeyboardEventConstructor) {
    return;
  }

  documentRef.dispatchEvent(
    new KeyboardEventConstructor('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    }),
  );
  documentRef.defaultView?.dispatchEvent(
    new KeyboardEventConstructor('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    }),
  );
}

async function waitForTargetMenuItem(
  documentRef: Document,
): Promise<MenuItemMatch | null> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const adMenuItem = findMenuItem(documentRef, [
      'この広告に興味がない',
      'この広告が表示されている理由',
      'Not interested in this ad',
      'Why am I seeing this ad',
    ]);
    if (adMenuItem) {
      return {
        element: adMenuItem,
        type: 'ad',
      };
    }

    const notInterestedMenuItem = findMenuItem(documentRef, [
      'このポストに興味がない',
      'Not interested in this post',
    ]);
    if (notInterestedMenuItem) {
      return {
        element: notInterestedMenuItem,
        type: 'not-interested',
      };
    }

    await delay(50);
  }

  return null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function findMenuItem(
  documentRef: Document,
  labels: string[],
): HTMLElement | null {
  const menuItems = Array.from(
    documentRef.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemradio"], [data-testid="Dropdown"] div',
    ),
  );

  return (
    menuItems.find((menuItem) => {
      const text = menuItem.textContent ?? '';
      return labels.some((label) => text.includes(label));
    }) ?? null
  );
}

function ensureGalleryStyle(documentRef: Document): void {
  if (documentRef.getElementById(GALLERY_STYLE_ID)) {
    return;
  }

  const style = documentRef.createElement('style');
  style.id = GALLERY_STYLE_ID;
  style.textContent = `
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_MENU_SUPPRESSED_ATTRIBUTE}="true"] [role="menu"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_MENU_SUPPRESSED_ATTRIBUTE}="true"] [role="menuitem"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_MENU_SUPPRESSED_ATTRIBUTE}="true"] [role="menuitemradio"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_MENU_SUPPRESSED_ATTRIBUTE}="true"] [data-testid="Dropdown"] {
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] {
  --timeline-gallery-primary-width: 640px;
  --timeline-gallery-content-width: 600px;
  --timeline-gallery-portrait-height: min(72vh, 920px);
  --timeline-gallery-post-padding: 12px 12px;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_MEDIA_SIZE_ATTRIBUTE}="s"] {
  --timeline-gallery-primary-width: 520px;
  --timeline-gallery-content-width: 460px;
  --timeline-gallery-portrait-height: min(62vh, 720px);
  --timeline-gallery-post-padding: 10px 10px;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_MEDIA_SIZE_ATTRIBUTE}="l"] {
  --timeline-gallery-primary-width: 1040px;
  --timeline-gallery-content-width: 920px;
  --timeline-gallery-portrait-height: min(86vh, 1200px);
  --timeline-gallery-post-padding: 12px 16px;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_LEFT_SIDEBAR_ATTRIBUTE}="false"] header[role="banner"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE}="false"] [data-testid="sidebarColumn"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_RIGHT_SIDEBAR_ATTRIBUTE}="false"] aside[aria-label],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="GrokDrawer"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="chat-drawer-root"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] main[role="main"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] {
  width: min(100vw, var(--timeline-gallery-primary-width)) !important;
  max-width: min(100vw, var(--timeline-gallery-primary-width)) !important;
  margin-right: auto !important;
  margin-left: auto !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] main[role="main"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] > div {
  width: 100% !important;
  max-width: none !important;
  margin-right: auto !important;
  margin-left: auto !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SIMPLIFY_POSTS_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}^="hidden"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SIMPLIFY_POSTS_ATTRIBUTE}="true"] [${GALLERY_CELL_ATTRIBUTE}^="hidden"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SIMPLIFY_POSTS_ATTRIBUTE}="true"] [data-testid="cellInnerDiv"]:not([${GALLERY_CELL_ATTRIBUTE}="single-image"]) {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] div:has(> section[role="region"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] div:has(> [data-testid="cellInnerDiv"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] section[role="region"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] section[role="region"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [data-testid="primaryColumn"] section[role="region"] > div > div {
  width: 100% !important;
  max-width: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_CELL_ATTRIBUTE}="single-image"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_CELL_ATTRIBUTE}="single-image"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_CELL_ATTRIBUTE}="single-image"] article,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_CELL_ATTRIBUTE}="single-image"] article > div {
  width: 100% !important;
  max-width: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SIMPLIFY_POSTS_ATTRIBUTE}="true"] [${GALLERY_COMPOSER_ATTRIBUTE}="true"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] {
  max-width: none !important;
  padding: var(--timeline-gallery-post-padding) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_SIDE_RAIL_ATTRIBUTE}="true"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_HIDDEN_CHROME_ATTRIBUTE}="true"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [${GALLERY_SIDE_RAIL_ATTRIBUTE}="true"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [${GALLERY_HIDDEN_CHROME_ATTRIBUTE}="true"]:has([data-testid="User-Name"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_POST_TIME_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [${GALLERY_HIDDEN_CHROME_ATTRIBUTE}="true"]:has(time) {
  display: block !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [${GALLERY_HIDDEN_CHROME_ATTRIBUTE}="true"][${GALLERY_REPOST_CONTEXT_ATTRIBUTE}="true"] {
  display: flex !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_CONTENT_COLUMN_ATTRIBUTE}="true"] {
  width: min(100%, var(--timeline-gallery-content-width)) !important;
  max-width: min(100%, var(--timeline-gallery-content-width)) !important;
  flex: 0 1 var(--timeline-gallery-content-width) !important;
  margin-right: auto !important;
  margin-left: auto !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_ACTIONS_BLOCK_ATTRIBUTE}="true"] {
  width: 100% !important;
  max-width: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  overflow: visible !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [data-testid="socialContext"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [data-testid="tweetText"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [data-testid="caret"]:not(.${NATIVE_MENU_BUTTON_CLASS}),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] button[aria-label*="Grok"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [aria-label*="Grok"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPOST_CONTEXT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [${GALLERY_REPOST_CONTEXT_ATTRIBUTE}="true"] [data-testid="socialContext"] {
  display: block !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE}="false"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [data-testid="User-Name"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_ACCOUNT_INFO_ATTRIBUTE}="false"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [data-testid^="UserAvatar-Container"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_POST_TIME_ATTRIBUTE}="false"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] time {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_FRAME_ATTRIBUTE}="true"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_FRAME_ATTRIBUTE}="true"] > div {
  max-width: 100% !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [data-testid="tweetPhoto"] img {
  width: 100% !important;
  max-height: none !important;
  object-fit: contain !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] a[href*="/photo/"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] [data-testid="tweetPhoto"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] [data-testid="tweetPhoto"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] [data-testid="gifPlayer"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] [data-testid="videoPlayer"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] [data-testid="videoComponent"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] video {
  width: 100% !important;
  max-width: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"] video {
  height: auto !important;
  object-fit: contain !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="landscape"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="square"] {
  aspect-ratio: var(--timeline-gallery-media-aspect-ratio) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="landscape"] [${GALLERY_MEDIA_FRAME_ATTRIBUTE}="true"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="square"] [${GALLERY_MEDIA_FRAME_ATTRIBUTE}="true"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="landscape"] [data-testid="tweetPhoto"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="square"] [data-testid="tweetPhoto"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="landscape"] [data-testid="tweetPhoto"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="square"] [data-testid="tweetPhoto"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="landscape"] [data-testid="tweetPhoto"] img,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="square"] [data-testid="tweetPhoto"] img {
  width: 100% !important;
  height: 100% !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="portrait"] {
  height: var(--timeline-gallery-portrait-height) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="portrait"] [${GALLERY_MEDIA_FRAME_ATTRIBUTE}="true"] {
  width: 100% !important;
  height: 100% !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="portrait"] [data-testid="tweetPhoto"] {
  left: 50% !important;
  right: auto !important;
  width: auto !important;
  height: 100% !important;
  aspect-ratio: var(--timeline-gallery-media-aspect-ratio) !important;
  transform: translateX(-50%) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="portrait"] [data-testid="tweetPhoto"] > div {
  width: 100% !important;
  height: 100% !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] [${GALLERY_MEDIA_BLOCK_ATTRIBUTE}="true"][${GALLERY_MEDIA_ORIENTATION_ATTRIBUTE}="portrait"] [data-testid="tweetPhoto"] img {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] {
  display: grid !important;
  grid-auto-flow: column !important;
  grid-auto-columns: 40px !important;
  justify-content: flex-end !important;
  align-items: center !important;
  column-gap: 20px !important;
  max-width: none !important;
  margin-top: 8px !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > a,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > button,
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > .${AD_LABEL_CLASS} {
  display: grid !important;
  width: 40px !important;
  min-width: 40px !important;
  max-width: 40px !important;
  height: 40px !important;
  place-items: center !important;
  margin: 0 !important;
  padding: 0 !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="reply"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has(a[href*="/analytics"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="View"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="表示"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has(button:not([data-testid="like"]):not([data-testid="unlike"]):not([data-testid="retweet"]):not([data-testid="unretweet"]):not([data-testid="bookmark"]):not([data-testid="removeBookmark"]):not(.${NATIVE_MENU_BUTTON_CLASS})) {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="like"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="unlike"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="retweet"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="unretweet"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="bookmark"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="removeBookmark"] {
  margin: 0 !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="reply"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] a[href*="/analytics"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [aria-label*="View"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [aria-label*="表示"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="app-text-transition-container"] {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] button:not([data-testid="like"]):not([data-testid="unlike"]):not([data-testid="retweet"]):not([data-testid="unretweet"]):not([data-testid="bookmark"]):not([data-testid="removeBookmark"]):not(.${NOT_INTERESTED_BUTTON_CLASS}):not(.${NATIVE_MENU_BUTTON_CLASS}) {
  display: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPLY_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="reply"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has(a[href*="/analytics"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="View"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="表示"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="sendShare"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="Share"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="共有"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_LIKE_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="like"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_LIKE_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="unlike"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPOST_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="retweet"]),
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPOST_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="unretweet"]) {
  display: grid !important;
  width: auto !important;
  min-width: 40px !important;
  max-width: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPLY_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="reply"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] a[href*="/analytics"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [aria-label*="View"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [aria-label*="表示"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [data-testid="sendShare"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [aria-label*="Share"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_SHARE_BUTTON_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] [aria-label*="共有"] {
  display: inline-grid !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPLY_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="reply"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_LIKE_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="like"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_LIKE_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="unlike"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPOST_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="retweet"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_REPOST_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([data-testid="unretweet"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has(a[href*="/analytics"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="View"]) [data-testid="app-text-transition-container"],
html[${GALLERY_ROOT_ATTRIBUTE}="true"][${GALLERY_SHOW_VIEW_COUNT_ATTRIBUTE}="true"] article[${GALLERY_POST_ATTRIBUTE}="single-image"] [role="group"] > div:has([aria-label*="表示"]) [data-testid="app-text-transition-container"] {
  display: inline !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${AD_LABEL_CLASS} {
  color: rgb(83, 100, 113) !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  line-height: 1 !important;
  pointer-events: none !important;
  user-select: none !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NOT_INTERESTED_BUTTON_CLASS} {
  position: relative !important;
  display: inline-grid !important;
  width: 34px !important;
  height: 34px !important;
  place-items: center !important;
  border: 0 !important;
  border-radius: 999px !important;
  background: transparent !important;
  color: rgb(83, 100, 113) !important;
  cursor: pointer !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NOT_INTERESTED_BUTTON_CLASS}:hover {
  background: rgba(244, 33, 46, 0.1) !important;
  color: rgb(244, 33, 46) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NOT_INTERESTED_BUTTON_CLASS}::before {
  content: "" !important;
  width: 16px !important;
  height: 16px !important;
  border: 2px solid currentColor !important;
  border-radius: 999px !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NOT_INTERESTED_BUTTON_CLASS}::after {
  content: "" !important;
  position: absolute !important;
  width: 13px !important;
  height: 2px !important;
  background: currentColor !important;
  transform: rotate(-45deg) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NATIVE_MENU_BUTTON_CLASS} {
  display: inline-grid !important;
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  place-items: center !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 999px !important;
  background: transparent !important;
  color: rgb(83, 100, 113) !important;
  cursor: pointer !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NATIVE_MENU_BUTTON_CLASS}:hover {
  background: rgba(29, 155, 240, 0.1) !important;
  color: rgb(29, 155, 240) !important;
}

html[${GALLERY_ROOT_ATTRIBUTE}="true"] .${NATIVE_MENU_BUTTON_CLASS} svg {
  width: 20px !important;
  height: 20px !important;
}
`;

  documentRef.head.append(style);
}
