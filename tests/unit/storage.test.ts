import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXTENSION_STATE,
  normalizeExtensionState,
} from '../../src/utils/storage';

describe('normalizeExtensionState', () => {
  it('returns defaults for invalid input', () => {
    expect(normalizeExtensionState(null)).toEqual(DEFAULT_EXTENSION_STATE);
    expect(normalizeExtensionState('bad input')).toEqual(
      DEFAULT_EXTENSION_STATE,
    );
  });

  it('preserves valid persisted state', () => {
    expect(
      normalizeExtensionState({
        installedAt: 1700000000000,
        contentReadyCount: 3,
        lastContentPage: {
          title: 'Fixture',
          url: 'http://127.0.0.1:3000/',
          seenAt: 1700000001000,
        },
        galleryMode: {
          enabled: true,
          includeVideos: false,
          includeGifs: false,
          includeMultiImagePosts: false,
        },
      }),
    ).toEqual({
      installedAt: 1700000000000,
      contentReadyCount: 3,
      lastContentPage: {
        title: 'Fixture',
        url: 'http://127.0.0.1:3000/',
        seenAt: 1700000001000,
      },
      galleryMode: {
        enabled: true,
        includeVideos: false,
        includeGifs: false,
        includeMultiImagePosts: false,
      },
    });
  });
});
