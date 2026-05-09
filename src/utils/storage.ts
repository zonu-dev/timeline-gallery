export type LastContentPage = {
  title: string;
  url: string;
  seenAt: number;
};

export type GalleryMediaSize = 's' | 'm' | 'l';
export type GalleryImageCount = 1 | 2 | 3 | 4;

export type GalleryModeSettings = {
  enabled: boolean;
  includeVideos: boolean;
  includeGifs: boolean;
  imageCount: GalleryImageCount;
  mediaSize: GalleryMediaSize;
  showAccountInfo: boolean;
  showPostTime: boolean;
  showRepostContext: boolean;
  showLikeCount: boolean;
  showRepostCount: boolean;
  showReply: boolean;
  showViewCount: boolean;
  showShareButton: boolean;
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
};

export type ExtensionState = {
  installedAt: number | null;
  contentReadyCount: number;
  lastContentPage: LastContentPage | null;
  galleryMode: GalleryModeSettings;
};

export const EXTENSION_STATE_KEY = 'timeline-gallery:state';

export const DEFAULT_GALLERY_MODE_SETTINGS: GalleryModeSettings = {
  enabled: false,
  includeVideos: false,
  includeGifs: false,
  imageCount: 1,
  mediaSize: 'm',
  showAccountInfo: false,
  showPostTime: false,
  showRepostContext: false,
  showLikeCount: false,
  showRepostCount: false,
  showReply: false,
  showViewCount: false,
  showShareButton: false,
  showLeftSidebar: false,
  showRightSidebar: false,
};

export const DEFAULT_EXTENSION_STATE: ExtensionState = {
  installedAt: null,
  contentReadyCount: 0,
  lastContentPage: null,
  galleryMode: DEFAULT_GALLERY_MODE_SETTINGS,
};

export function normalizeExtensionState(value: unknown): ExtensionState {
  if (!value || typeof value !== 'object') {
    return DEFAULT_EXTENSION_STATE;
  }

  const candidate = value as Partial<ExtensionState>;

  return {
    installedAt:
      typeof candidate.installedAt === 'number' ? candidate.installedAt : null,
    contentReadyCount:
      typeof candidate.contentReadyCount === 'number'
        ? candidate.contentReadyCount
        : 0,
    lastContentPage: normalizeLastContentPage(candidate.lastContentPage),
    galleryMode: normalizeGalleryModeSettings(candidate.galleryMode),
  };
}

export async function readExtensionState(): Promise<ExtensionState> {
  const values = await chrome.storage.local.get(EXTENSION_STATE_KEY);
  return normalizeExtensionState(values[EXTENSION_STATE_KEY]);
}

export async function writeExtensionState(
  state: ExtensionState,
): Promise<ExtensionState> {
  await chrome.storage.local.set({ [EXTENSION_STATE_KEY]: state });
  return state;
}

export async function updateExtensionState(
  updater: (current: ExtensionState) => ExtensionState,
): Promise<ExtensionState> {
  const current = await readExtensionState();
  return writeExtensionState(updater(current));
}

function normalizeLastContentPage(value: unknown): LastContentPage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<LastContentPage>;
  if (
    typeof candidate.title !== 'string' ||
    typeof candidate.url !== 'string' ||
    typeof candidate.seenAt !== 'number'
  ) {
    return null;
  }

  return {
    title: candidate.title,
    url: candidate.url,
    seenAt: candidate.seenAt,
  };
}

function normalizeGalleryModeSettings(value: unknown): GalleryModeSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_GALLERY_MODE_SETTINGS;
  }

  const candidate = value as Partial<
    GalleryModeSettings & { includeMultiImagePosts: boolean }
  >;

  return {
    enabled:
      typeof candidate.enabled === 'boolean'
        ? candidate.enabled
        : DEFAULT_GALLERY_MODE_SETTINGS.enabled,
    includeVideos:
      typeof candidate.includeVideos === 'boolean'
        ? candidate.includeVideos
        : DEFAULT_GALLERY_MODE_SETTINGS.includeVideos,
    includeGifs:
      typeof candidate.includeGifs === 'boolean'
        ? candidate.includeGifs
        : DEFAULT_GALLERY_MODE_SETTINGS.includeGifs,
    imageCount:
      typeof candidate.imageCount === 'number'
        ? normalizeImageCount(candidate.imageCount)
        : candidate.includeMultiImagePosts === true
          ? 4
          : DEFAULT_GALLERY_MODE_SETTINGS.imageCount,
    mediaSize:
      typeof candidate.mediaSize === 'string'
        ? normalizeMediaSize(candidate.mediaSize)
        : DEFAULT_GALLERY_MODE_SETTINGS.mediaSize,
    showAccountInfo:
      typeof candidate.showAccountInfo === 'boolean'
        ? candidate.showAccountInfo
        : DEFAULT_GALLERY_MODE_SETTINGS.showAccountInfo,
    showPostTime:
      typeof candidate.showPostTime === 'boolean'
        ? candidate.showPostTime
        : DEFAULT_GALLERY_MODE_SETTINGS.showPostTime,
    showRepostContext:
      typeof candidate.showRepostContext === 'boolean'
        ? candidate.showRepostContext
        : DEFAULT_GALLERY_MODE_SETTINGS.showRepostContext,
    showLikeCount:
      typeof candidate.showLikeCount === 'boolean'
        ? candidate.showLikeCount
        : DEFAULT_GALLERY_MODE_SETTINGS.showLikeCount,
    showRepostCount:
      typeof candidate.showRepostCount === 'boolean'
        ? candidate.showRepostCount
        : DEFAULT_GALLERY_MODE_SETTINGS.showRepostCount,
    showReply:
      typeof candidate.showReply === 'boolean'
        ? candidate.showReply
        : DEFAULT_GALLERY_MODE_SETTINGS.showReply,
    showViewCount:
      typeof candidate.showViewCount === 'boolean'
        ? candidate.showViewCount
        : DEFAULT_GALLERY_MODE_SETTINGS.showViewCount,
    showShareButton:
      typeof candidate.showShareButton === 'boolean'
        ? candidate.showShareButton
        : DEFAULT_GALLERY_MODE_SETTINGS.showShareButton,
    showLeftSidebar:
      typeof candidate.showLeftSidebar === 'boolean'
        ? candidate.showLeftSidebar
        : DEFAULT_GALLERY_MODE_SETTINGS.showLeftSidebar,
    showRightSidebar:
      typeof candidate.showRightSidebar === 'boolean'
        ? candidate.showRightSidebar
        : DEFAULT_GALLERY_MODE_SETTINGS.showRightSidebar,
  };
}

function normalizeImageCount(value: number): GalleryImageCount {
  if (value === 2 || value === 3 || value === 4) {
    return value;
  }

  return 1;
}

function normalizeMediaSize(value: string): GalleryMediaSize {
  if (value === 's' || value === 'm' || value === 'l') {
    return value;
  }

  return DEFAULT_GALLERY_MODE_SETTINGS.mediaSize;
}
