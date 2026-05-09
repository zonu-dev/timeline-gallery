export type LastContentPage = {
  title: string;
  url: string;
  seenAt: number;
};

export type GalleryModeSettings = {
  enabled: boolean;
  includeVideos: boolean;
  includeGifs: boolean;
  includeMultiImagePosts: boolean;
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
  includeMultiImagePosts: false,
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

  const candidate = value as Partial<GalleryModeSettings>;

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
    includeMultiImagePosts:
      typeof candidate.includeMultiImagePosts === 'boolean'
        ? candidate.includeMultiImagePosts
        : DEFAULT_GALLERY_MODE_SETTINGS.includeMultiImagePosts,
  };
}
