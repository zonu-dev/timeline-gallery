import { describe, expect, it } from 'vitest';
import { isXPostDetailPath } from '../../src/utils/x-page';

describe('x-page', () => {
  it('detects X post detail paths', () => {
    expect(isXPostDetailPath('/example/status/1234567890')).toBe(true);
    expect(isXPostDetailPath('/example/status/1234567890/photo/1')).toBe(true);
    expect(isXPostDetailPath('/i/web/status/1234567890')).toBe(true);
  });

  it('does not treat timeline paths as post detail pages', () => {
    expect(isXPostDetailPath('/home')).toBe(false);
    expect(isXPostDetailPath('/explore')).toBe(false);
    expect(isXPostDetailPath('/example')).toBe(false);
    expect(isXPostDetailPath('/example/status/not-a-number')).toBe(false);
  });
});
