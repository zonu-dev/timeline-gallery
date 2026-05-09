import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const profileDir = resolve(root, '.wxt/ai-chrome-profile');
const extensionDir = resolve(
  root,
  process.env.AI_CHROME_EXTENSION_DIR ?? '.output/chrome-mv3',
);
const remoteDebuggingPort = process.env.AI_CHROME_DEBUG_PORT ?? '9223';
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(chromePath)) {
  console.error(
    `Chrome not found: ${chromePath}\nSet CHROME_EXECUTABLE_PATH to the Chrome executable path.`,
  );
  process.exit(1);
}

if (!existsSync(extensionDir)) {
  console.error(
    `Extension output not found: ${extensionDir}\nRun "corepack pnpm build" first.`,
  );
  process.exit(1);
}

mkdirSync(profileDir, { recursive: true });

const args = [
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionDir}`,
  `--load-extension=${extensionDir}`,
  `--remote-debugging-port=${remoteDebuggingPort}`,
  '--no-first-run',
  '--no-default-browser-check',
  'https://x.com/home',
];

const child = spawn(chromePath, args, {
  detached: true,
  stdio: 'ignore',
});

child.unref();

console.log(`Opened AI Chrome profile: ${profileDir}`);
console.log(`Loaded extension: ${extensionDir}`);
console.log(`Remote debugging: http://127.0.0.1:${remoteDebuggingPort}`);
