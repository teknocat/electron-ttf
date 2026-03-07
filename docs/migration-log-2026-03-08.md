# マイグレーションログ (2026-03-08)

## 旧実行環境の動作確認 (WSL + Docker + WSLg)

状態: PASS (Windows 11 ホスト上でウィンドウ表示を確認)

環境:
- ホスト: Windows 11 + WSL2
- コンテナ: ubuntu:20.04 (linux/amd64)
- Node: 10.24.1 (コンテナ内 nvm で導入)
- Python: 2.x

確認コマンド:
- `bash internals/scripts/docker-dev-wslg.sh`

発生した問題と対応:
- Renderer で `Cannot find module 'posix-ext'` が発生:
  - Renderer 側モジュールで `require('posix-ext')` をガードし、未導入時はフォールバックするよう変更。
- ヘッドレス/コンテナ環境で Electron DevTools 拡張の導入に失敗:
  - `app/main.dev.js` に `SKIP_DEVTOOLS_EXTENSIONS=1` でスキップできるスイッチを追加。

補足:
- 開発モードでの Electron セキュリティ警告 (HTTP localhost/CSP) は想定内。
- Renderer で例外が起きると白画面になるため、まずターミナルログを確認すること。

## マイグレーション進行状況 (次工程)

フェーズ1完了:
- [x] 旧環境ベースラインを Docker で再現。
- [x] WSLg 経由でホスト側 GUI 表示を確認。

フェーズ2進行中:
- [x] スモークテスト用コマンドを自動化 (`internals/scripts/docker-dev-wslg.sh`)。
- [ ] Node/Electron 互換性マトリクスを調査 (Node 12/14/16/18)。
- [ ] `node-sass` 依存を `sass` 系に置き換え。
- [ ] ネイティブ依存 (`posix-ext` など) の削減。

## 互換性プローブ結果 (2026-03-08)

実行スクリプト:
- `bash internals/scripts/migration-node-probe.sh 12.22.12`

結果:
- Node `12.22.12` で install (`--ignore-scripts`) + `npm run build-main` が PASS。
- ログ: `.artifacts/migration/node-12.22.12.log`

所見:
- 現行ツールチェーンでも、Node 12 では Main process のバンドル生成が可能。
- 次は Node 14 のプローブを実施し、その後 renderer/dev 起動確認へ進む。

### Node 14.21.3

実行:
- `bash internals/scripts/migration-node-probe.sh 14.21.3`

結果:
- PASS (`npm install --ignore-scripts` + `npm run build-main`)
- ログ: `.artifacts/migration/node-14.21.3.log`

所見:
- Node 14 でも Main process のビルドは成功。
- 次は Node 16 の失敗点を切り分ける。

### Node 16.20.2

実行:
- `bash internals/scripts/migration-node-probe.sh 16.20.2`

結果:
- FAIL
- ログ: `.artifacts/migration/node-16.20.2.log`

失敗内容(抜粋):
- `/usr/bin/env: 'node': Permission denied`

所見:
- Node 本体の実行権限/パス解決まわりで失敗している可能性が高い。
- まずコンテナ内で `which node` と `ls -l $(which node)` を確認して切り分ける。

フェーズ3目標:
- [ ] Electron メジャーバージョンを段階的に更新し、各段階でスモークテスト実施。
- [ ] webpack/babel ツールチェーンをサポート対象へ更新。
- [ ] Linux/Windows 向けパッケージング確認を追加。
