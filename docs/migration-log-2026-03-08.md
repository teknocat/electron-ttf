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
- [x] Node/Electron 互換性マトリクスを調査 (Node 12/14/16/18)。
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

### Node 18.20.4

実行:
- `bash internals/scripts/migration-node-probe.sh 18.20.4`

結果:
- FAIL
- ログ: `.artifacts/migration/node-18.20.4.log`

失敗内容(抜粋):
- `Error: error:0308010C:digital envelope routines::unsupported`
- `code: 'ERR_OSSL_EVP_UNSUPPORTED'`

所見:
- webpack 4 系と OpenSSL 3 (Node 18) の既知非互換に該当。
- 暫定対応は `NODE_OPTIONS=--openssl-legacy-provider`、本対応は webpack/babel の更新。

フェーズ3目標:
- [ ] Electron メジャーバージョンを段階的に更新し、各段階でスモークテスト実施。
- [ ] webpack/babel ツールチェーンをサポート対象へ更新。
- [ ] Linux/Windows 向けパッケージング確認を追加。

## Electron マトリクス検証メモ (2026-03-08 追記)

実行スクリプト:
- `bash internals/scripts/migration-electron-probe.sh <node>:<electron>`

### 12.22.12 + 9.4.4

結果:
- PASS
- ログ: `.artifacts/migration/node-12.22.12-electron-9.4.4.log`

補足:
- `migration-electron-probe.sh` のクォート不備を修正し、`set -u` での誤展開を解消。
- 残留プロセス (`xvfb-run` / `webpack-dev-server` / `electron`) の強制終了を強化し、ハング待ちを抑制。

### 16.20.2 + 15.5.7

結果:
- FAIL
- ログ: `.artifacts/migration/node-16.20.2-electron-15.5.7.log`

失敗内容(主要):
- renderer の SCSS ビルドで `sass-loader` と `node-sass` の互換制約に到達。
- `node-sass` を Node 16 互換版に上げると、今度は既存 `sass-loader` 側が `^4.0.0` を要求して失敗。

所見:
- Node 16/Electron 15 へ進むには、`node-sass` だけの差し替えでは不十分。
- 次の本対応は `sass-loader + sass` への移行 (webpack 設定と依存の同時更新) が必要。

## 検証再開メモ (2026-03-08 再起動後)

再開時の対応:
- `migration-electron-probe.sh` を再確認し、Node 16/18 分岐で `sass/sass-loader` を入れた後に
  `electron` が `package.json` の範囲 (`^2.0.11`) に巻き戻る問題を修正。
- 対応として、依存調整の最後に `npm install --no-save --ignore-scripts electron@${ELECTRON_VERSION}` を再適用するよう更新。

再実行結果:
- `12.22.12 + 9.4.4`: PASS (再確認)
- `16.20.2 + 15.5.7`: FAIL (再現)

`16.20.2 + 15.5.7` の失敗要因(再確認):
- renderer の SCSS ビルドで `node-sass@4.14.1` バイナリ非対応 (`Unsupported runtime (93)`)。
- Electron 15 での実動検証に進む前に、SCSS 周りを `sass` 系へ移行する必要がある。

## 運用方針 (2026-03-08)

- `sass` 対応は維持し、実行基盤を先に Node 12+ へ引き上げる。
- Node 10 レーンは後方互換の参考として凍結し、`sass` を動かすための追加対応は行わない。
- Docker GUI 開発スクリプト (`docker-dev-wslg.sh`) は Node `12.22.12` を既定値とする。
