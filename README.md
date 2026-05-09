# Timeline Gallery

Timeline Gallery は、X (旧 Twitter) のタイムラインを画像中心のギャラリー表示に切り替える Chrome 拡張機能です。

ギャラリーモードをオンにすると、左右のサイドメニューを隠してタイムライン幅を広げ、画像が1枚だけ添付されたポストを見やすく表示します。動画、GIF、複数画像、引用元カード、リプライ文脈のポストは初期設定では表示対象外です。

このプロジェクトは X Corp. とは関係のない独立したプロジェクトです。

## 主な機能

- 拡張機能のポップアップからギャラリーモードをオン / オフ
- デフォルトではギャラリーモードはオフ
- X / Twitter のタイムライン上で動作
- 左右のサイドメニューを非表示にし、タイムライン部分を拡張
- 画像が1枚だけ添付されたポストを中心に表示
- 画像なし、動画、GIF、複数画像、引用元カード、リプライ文脈のポストを初期設定で非表示
- 投稿者情報、投稿時間、反応数、表示回数などの周辺情報を抑えて画像を見やすく表示
- リポスト、いいね、ブックマークなどの主要アクションは維持
- 広告は対象条件を満たす場合に表示し、通常のポストと区別
- ポスト詳細画面では、幅広レイアウトと非表示サイドバーを維持しつつ通常の投稿情報を表示

## プライバシー

Timeline Gallery はブラウザ内で動作し、外部サーバーへユーザーデータを送信しません。

- X のタイムライン内容を外部サーバーへ送信しません
- 利用状況、アクセス履歴、アカウント情報、投稿内容を収集しません
- 設定保存には `chrome.storage.local` を使用します
- X のログイン処理を自動化しません
- 認証情報、Cookie、アクセストークンを読み取りません

開発用の Chrome プロファイル、スクリーンショット、ビルド成果物はコミットしないでください。

## 必要なもの

- Google Chrome
- Node.js 24 以上
- Corepack

pnpm を Corepack 経由で有効化する場合:

```sh
corepack prepare pnpm@10.33.3 --activate
```

`pnpm` を直接実行できない環境では、各コマンドを `corepack pnpm ...` として実行してください。

## セットアップ

```sh
corepack pnpm install
```

## 開発

### 通常の WXT 開発

```sh
corepack pnpm dev
```

WXT が開発用拡張機能を読み込んだ Chrome を起動します。ポップアップや一般的な拡張機能の開発に使います。

X は WXT / web-ext が起動したブラウザでのログインを拒否することがあります。ログイン済みの X で検証する場合は、次の手順を使ってください。

### X での手動検証

WXT をブラウザ起動なしで実行します。

```sh
corepack pnpm dev:x
```

その後、通常の Chrome で開発用拡張機能を読み込みます。

1. `chrome://extensions` を開く
2. デベロッパーモードを有効にする
3. `パッケージ化されていない拡張機能を読み込む` を押す
4. `.output/chrome-mv3-dev` を選択する
5. `https://x.com/home` を開く

詳しくは [docs/x-development.md](docs/x-development.md) を参照してください。

### 本番相当のローカルビルド

```sh
corepack pnpm build
```

生成された `.output/chrome-mv3` を `chrome://extensions` から読み込むと、パッケージ版に近い状態で確認できます。

## AI / ヘッドレス検証

通常の Chrome ウィンドウを奪わずに X を確認したい場合は、専用の Chrome プロファイルを使います。

初回ログイン:

```sh
corepack pnpm auth:x:headless:reset
```

開いた専用 Chrome ウィンドウで X にログインし、ウィンドウを閉じます。

以後の検証:

```sh
corepack pnpm inspect:x:headless
corepack pnpm inspect:x:headless:gallery
```

検証用プロファイルとスクリーンショットは `.wxt/` 以下に保存され、git では無視されます。

## Chrome ウェブストア申請

ストア掲載用のモック画像を生成します。

```sh
corepack pnpm run store:assets
```

提出前チェックを実行し、アップロード用 ZIP を作成します。

```sh
corepack pnpm run store:package
```

ZIP は `.output/` 以下に作成されます。掲載文、プライバシー入力項目、権限説明、提出前チェックリストは [docs/chrome-web-store.md](docs/chrome-web-store.md) にまとめています。

## 検証コマンド

基本の確認:

```sh
corepack pnpm run check
corepack pnpm run format:check
```

個別コマンド:

```sh
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run test
corepack pnpm run test:e2e
corepack pnpm run validate:manifest
```

`test:e2e` は拡張機能をビルドして Chrome に読み込み、ポップアップ表示とローカル fixture ページへの content script 注入を確認します。

## ディレクトリ構成

```text
src/
  entrypoints/
    background.ts      Manifest V3 service worker
    content.ts         X ページ連携とギャラリー制御
    popup/             React popup
  utils/
    messaging.ts       runtime message 型と helper
    storage.ts         chrome.storage.local の状態 schema
    x-gallery.ts       X タイムライン分類とレイアウト制御
    x-page.ts          X ルート判定 helper
tests/
  unit/                DOM / 状態管理の単体テスト
  e2e/                 Puppeteer による拡張機能 smoke test
scripts/               ローカルブラウザ操作と検証 helper
docs/                  開発・申請メモ
store-assets/          Chrome ウェブストア掲載用のモック画像
```

## コミットしないもの

公開リポジトリのため、以下はコミットしないでください。

- `.wxt/`
- `.output/`
- `tmp/`
- `.env` / `.env.*` / `.envrc`
- Chrome プロファイル、Cookie、セッションデータ
- 認証情報、トークン、秘密鍵
- 実アカウント情報や実投稿が写ったスクリーンショット

`store-assets/` の PNG は、`corepack pnpm run store:assets` で生成したモック画像のみを置く想定です。

## 既知の制限

- X の DOM 構造は頻繁に変わるため、セレクタや分類ロジックは継続的な更新が必要です
- 「このポストに興味がない」系の動作は、X 側のメニュー項目が DOM に存在する場合に依存します
- 広告判定は X の表示ラベルや既知のマーカーに基づくため、X 側の変更で更新が必要になる可能性があります
- ギャラリーモードは主にホームタイムラインとタイムライン類似ビューを対象にしています

## コントリビュート

変更は小さく保ち、可能な限りローカルで検証してから Pull Request を作成してください。

X タイムラインの表示に影響する変更では、`tests/unit/x-gallery.test.ts` の追加・更新を優先し、次を実行してください。

```sh
corepack pnpm run check
corepack pnpm inspect:x:headless:gallery
```
