export function isXPostDetailPath(pathname: string): boolean {
  return (
    /^\/[^/]+\/status\/\d+(?:\/|$)/.test(pathname) ||
    /^\/i\/web\/status\/\d+(?:\/|$)/.test(pathname)
  );
}
