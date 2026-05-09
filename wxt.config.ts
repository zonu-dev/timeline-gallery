import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Timeline Gallery',
    description:
      'Xのタイムラインを、余計な表示を抑えた画像ギャラリーに切り替えます。',
    permissions: ['storage'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Timeline Gallery',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
  },
  webExt: {
    disabled: process.env.WXT_DISABLE_BROWSER === '1',
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
    startUrls: ['https://x.com/home'],
  },
});
