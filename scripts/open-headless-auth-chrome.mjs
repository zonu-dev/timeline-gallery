import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const profileDir = resolve(root, '.wxt/headless-auth-profile');
const shouldReset = process.argv.includes('--reset');
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(chromePath)) {
  console.error(
    `Chrome not found: ${chromePath}\nSet CHROME_EXECUTABLE_PATH to the Chrome executable path.`,
  );
  process.exit(1);
}

if (shouldReset) {
  rmSync(profileDir, { recursive: true, force: true });
}

mkdirSync(profileDir, { recursive: true });

const args = [
  `--user-data-dir=${profileDir}`,
  '--password-store=basic',
  '--use-mock-keychain',
  '--no-first-run',
  '--no-default-browser-check',
  'https://x.com/home',
];

const child = spawn(chromePath, args, {
  detached: true,
  stdio: 'ignore',
});

child.unref();

console.log(`Opened headless-compatible auth profile: ${profileDir}`);
console.log('Log in to X in that window once, then close the window.');
