# マージ準備メモ (2026-03-08)

## 目的

このドキュメントでは、以下を整理する。

- Electron モダナイズにおける残課題
- コードベースに残している移行期ワークアラウンド
- `migration/modernize` をマージする前に確認すべき事項

## 次に対応すべき事項 (優先度順)

1. BrowserWindow のセキュリティ設定がレガシーのまま
   - `app/main.dev.js` で `nodeIntegration: true`、`contextIsolation: false`、`enableRemoteModule: true` を使用している。
   - 今後の Electron メジャー更新に対して最も大きいリスク。

2. Renderer が `electron.remote` 依存を残している
   - `app/containers/Home/index.js`、`app/utils/system.js`、`app/reducers/initialState.js` で確認。
   - 将来的には preload + IPC API へ置換する。

3. 非推奨の shell API が残っている
   - `app/actions/content.js` で `shell.openItem` を使用している。
   - `shell.openPath` へ置換し、エラーハンドリングを明示する。

4. DevTools 拡張導入処理が古く壊れやすい
   - `electron-devtools-installer` の利用はベストエフォート扱いとし、必須依存にしない方針が望ましい。

## 意図的に残している暫定処理

現行スタック互換のため、以下は意図的に維持している。

1. Node 24 + webpack 4 互換
   - `start-renderer-dev` で `NODE_OPTIONS=--openssl-legacy-provider` を設定。

2. Node 24 の http_parser 互換
   - Renderer 起動時に `internals/scripts/node24-http-parser-shim.js` を preload している。

3. ホスト環境での install 安定化
   - `postinstall` で `electron-builder install-app-deps` 失敗を許容し、処理を継続する。
   - 任意ネイティブ依存の再ビルド失敗で、開発・移行検証全体が停止しないようにするため。

4. Native dependency チェックの npm10/11 対応
   - `internals/scripts/CheckNativeDep.js` で、root の native 依存が 0 件なら `npm ls` チェックをスキップする。

## マージ前に削除した移行専用ロジック

移行プローブ専用のランタイム計測コードは、通常アプリ実行パスから除去済み。

- `app/containers/Home/index.js`: `MIGRATION_PROBE` 向け画面準備完了レポートを削除
- `app/main.dev.js`: `probe-initial-screen-ok` IPC ログ出力ハンドラを削除

`internals/scripts/` 配下のプローブスクリプトは、履歴・検証用途としては残しているが、通常ランタイムには接続していない。

## マージ前チェックリスト

以下を実行して確認する。

1. `npm install` (Node 24)
2. `npm run dev` (Node 24)
3. `npm run build-main`
4. `npm run build-renderer`
5. `npm test` (全件が重い場合は、合意した縮小スコープで実施)
6. 手動スモーク: ディレクトリ移動、ファイルオープン、コピー/移動/削除、終了処理

## マージ後に直ちに進める推奨作業

1. `preload` ブリッジを導入し、`remote` 依存の段階的撤去を開始する。
2. セキュリティ設定を段階的に改善する。
   - まず `contextIsolation: true`
   - 次に `nodeIntegration: false`
3. `shell.openItem` を `shell.openPath` へ置換する。
4. 依存更新後に `--openssl-legacy-provider` と `node24-http-parser-shim` の撤去可否を再評価する。
