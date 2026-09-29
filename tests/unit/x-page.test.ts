import { describe, expect, it } from 'vitest';
import {
  getXPageKind,
  isXPhotoPath,
  isXPostDetailPath,
} from '../../src/utils/x-page';

describe('x-page', () => {
  it('detects X post detail paths', () => {
    expect(isXPostDetailPath('/example/status/1234567890')).toBe(true);
    expect(isXPostDetailPath('/i/web/status/1234567890')).toBe(true);
  });

  it('detects X photo modal paths separately from post detail pages', () => {
    expect(isXPhotoPath('/example/status/1234567890/photo/1')).toBe(true);
    expect(isXPhotoPath('/i/web/status/1234567890/photo/1')).toBe(true);
    expect(isXPostDetailPath('/example/status/1234567890/photo/1')).toBe(false);
  });

  it('classifies X route kinds', () => {
    expect(getXPageKind('/home')).toBe('timeline');
    expect(getXPageKind('/explore')).toBe('timeline');
    expect(getXPageKind('/search')).toBe('timeline');
    expect(getXPageKind('/example')).toBe('timeline');
    expect(getXPageKind('/example/media')).toBe('timeline');
    expect(getXPageKind('/i/bookmarks')).toBe('timeline');
    expect(getXPageKind('/i/lists/1234567890')).toBe('timeline');
    expect(getXPageKind('/example/status/1234567890')).toBe('post-detail');
    expect(getXPageKind('/example/status/1234567890/photo/1')).toBe('photo');
  });

  it('does not classify account list pages as timeline feeds', () => {
    expect(getXPageKind('/Yenkurl/followers')).toBe('other');
    expect(getXPageKind('/Yenkurl/following')).toBe('other');
    expect(getXPageKind('/Yenkurl/verified_followers')).toBe('other');
    expect(getXPageKind('/Yenkurl/followers_you_follow')).toBe('other');
  });

  it('does not treat timeline paths as post detail pages', () => {
    expect(isXPostDetailPath('/home')).toBe(false);
    expect(isXPostDetailPath('/explore')).toBe(false);
    expect(isXPostDetailPath('/example')).toBe(false);
    expect(isXPostDetailPath('/example/status/not-a-number')).toBe(false);
  });
});
