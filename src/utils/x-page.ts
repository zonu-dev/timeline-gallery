export type XPageKind = 'timeline' | 'post-detail' | 'photo' | 'other';

export function getXPageKind(pathname: string): XPageKind {
  if (isXPhotoPath(pathname)) {
    return 'photo';
  }

  if (isXPostDetailPath(pathname)) {
    return 'post-detail';
  }

  if (isXTimelinePath(pathname)) {
    return 'timeline';
  }

  return 'other';
}

export function isXPostDetailPath(pathname: string): boolean {
  return (
    /^\/[^/]+\/status\/\d+\/?$/.test(pathname) ||
    /^\/i\/web\/status\/\d+\/?$/.test(pathname)
  );
}

export function isXPhotoPath(pathname: string): boolean {
  return (
    /^\/[^/]+\/status\/\d+\/photo\/\d+\/?$/.test(pathname) ||
    /^\/i\/web\/status\/\d+\/photo\/\d+\/?$/.test(pathname)
  );
}

export function isXTimelinePath(pathname: string): boolean {
  return (
    /^\/home\/?$/.test(pathname) ||
    /^\/explore\/?$/.test(pathname) ||
    /^\/search\/?$/.test(pathname) ||
    /^\/i\/bookmarks\/?$/.test(pathname) ||
    /^\/i\/lists\/\d+\/?$/.test(pathname) ||
    /^\/[^/]+\/?$/.test(pathname) ||
    /^\/[^/]+\/(?:media|with_replies)\/?$/.test(pathname)
  );
}
