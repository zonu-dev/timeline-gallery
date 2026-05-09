import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve(
  process.cwd(),
  process.argv[2] ?? '.output/chrome-mv3/manifest.json',
);

if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];

if (manifest.manifest_version !== 3) {
  errors.push('manifest_version must be 3.');
}

if (manifest.background && !manifest.background.service_worker) {
  errors.push('Manifest V3 background must use service_worker.');
}

const hostPermissions = manifest.host_permissions ?? [];
if (hostPermissions.includes('<all_urls>')) {
  errors.push('Do not use <all_urls> without an explicit project decision.');
}

const developmentMatches = new Set([
  'http://localhost/*',
  'http://127.0.0.1/*',
  'https://example.com/*',
]);

for (const script of manifest.content_scripts ?? []) {
  if (script.matches?.includes('<all_urls>')) {
    errors.push('Content scripts must not use <all_urls> by default.');
  }

  for (const match of script.matches ?? []) {
    if (developmentMatches.has(match)) {
      errors.push(
        `Production content scripts must not include development match ${match}.`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Manifest OK: ${manifestPath}`);
