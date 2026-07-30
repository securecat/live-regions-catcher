# Live Regions Catcher — プロジェクト固有ルール

グローバル CLAUDE.md（および REPOSITORY.md / A11Y.md / CHROME_EXTENSION.md）を前提とした、このプロジェクト固有の事項のみを記載する。

## 名称

- 英語名（正式）：**Live Regions Catcher**
- 日本語表記：**ライブリージョン・キャッチャー**（中黒あり）
- リポジトリ名：`live-regions-catcher`

## 公開状態

- **Public リポジトリ** → コミットメッセージは英語（Conventional Commits）、README.md / CHANGELOG.md は英語セクション → `---` → 日本語セクション

## 仕様書

- `work/live-regions-catcher_specification-draft.docx`（`work/` は gitignore 対象。ローカルにのみ存在する）
- 実装判断に迷ったら必ず仕様書に立ち返ること

## バージョン

- バージョン記載箇所：`manifest.json` の `version`
- 初回リリースは `1.0.0` を予定。CHANGELOG.md は初回リリース時に作成する

## 対象・言語

- グローバル向け（UI は英語・日本語の2言語対応、`default_locale` は `en`）
- キャッチした通知内容は翻訳・変換せず原文のまま保持する（仕様書 §15）

## 技術方針

- Manifest V3、ビルドツールなしの Vanilla JS（ES modules）＋バニラCSS
- UI はポップアップではなく **サイドパネル**（`chrome.sidePanel`、アイコンクリックで開く）
- ディレクトリ構成（標準構成への追加分）：
  - `src/sidepanel/` … サイドパネル
  - `src/options/` … Optionsページ
  - `src/content/` … コンテンツスクリプト（ISOLATED world の監視エンジン＋ariaNotify() 観測用の MAIN world 注入スクリプト）
  - `src/background/` … Service Worker
  - `src/lib/` … 共有ロジック（実効値計算・通知内容計算・i18n 層など）
  - `_locales/en/`・`_locales/ja/` … Chrome 標準ロケール
- キャッチデータは外部送信せず、`chrome.storage.session` 等でローカル処理のみ（仕様書 §18）。同期ストレージへ保存しない

## コンテンツスクリプトの構成

- ESモジュール不可のため**classicスクリプト**とし、`manifest.json` の記載順（shared → effective-values → accessible-content → dom-path → catch-engine → observer）にロードして `globalThis.LRC` 名前空間を共有する
- 監視開始は **DOMContentLoaded 後**（パーサー挿入の初期内容は「更新」ではないため）。`run_at: document_start` は ariaNotify() 観測（後続フェーズ）のために維持している
- `docs/index.html` は手動検証用デモページ（リリース後に https://securecat.github.io/live-regions-catcher/ として GitHub Pages で公開予定）。`file://` で使う場合は chrome://extensions で「ファイルの URL へのアクセスを許可する」を有効にすること

## i18n の構成（仕様書 §15）

- `_locales/` は**Chromeが直接表示する文言のみ**（拡張名・説明・アイコンツールチップ）
- 拡張内UIの文言は**アプリ層の言語リソース**（`src/lib/messages.js` の en/ja カタログ＋ `src/lib/i18n.js` の `t()`）で扱う。実行時の言語切替（Optionsの auto/en/ja 設定）に対応するため、拡張内UIで `chrome.i18n.getMessage` を使わないこと
- en と ja は必ず同じキーを定義する。未定義キーは en へフォールバック

## Yuさんと合意済みの方針

- 拡張アイコンの状態表現（仕様書 §13.1）は**アイコン画像の切り替えではなくバッジのみ**で行う（件数＋色：通常=青、assertive含む=赤）
- コンテンツスクリプトのコンソール出力（debugフラグ）は、Optionsページの設定項目として**ユーザーがオンにできるようにする**（段階5で実装。コンソールで確認したいニーズがあるため）

## 設定（仕様書 §16）

- 保存先は `chrome.storage.local` のキー `settings`（既定値・スキーマは `src/lib/settings.js`。コンテンツスクリプト側は `src/content/shared.js` の `LRC.DEFAULT_SETTINGS` と**同期を保つこと**）
- Optionsページは変更を即時自動保存し、各サーフェス（パネル・コンテンツスクリプト・SW）は `storage.onChanged` で追従する
- **未実装の§16項目**（該当フェーズで追加）：ariaNotify()のキャッチ対象・モーダル設定（→段階6）、未確認の既読タイミング4種・保持期間「ブラウザを閉じるまで／手動まで」（→項目単位の既読UIやログブラウザが必要になったタイミング）
- Optionsページ最下部には `<hr>` ＋ GitHub Issues への報告案内リンクを必ず置く（Yuさん指定。en/jaでローカライズ）

## パイプライン（content → Service Worker → サイドパネル）

- メッセージ：`lrc:catch`（content → SW）、`lrc:mark-read`（パネル → SW）
- 保存：`chrome.storage.session` にタブ単位で `catches:<tabId>` / `unread:<tabId>`。上限は1タブ1000件（超過分は古い順に破棄）。タブを閉じると削除（仕様書 §16.8 の初期値）
- サイドパネルは storage.session を直接読み、`onChanged` で追従する。バッジ更新はSWのみが行う
- バッジ：未確認件数（99超は `99+`）。背景色は通常 `#1a56a8`／assertive含む `#b3261e`（文字は白）

## UI 文言（仕様書 §22）

- 使用する：キャッチ／通知／通知内容／通知候補／通知元／実効値 など
- 使用しない：「スクリーンリーダーが喋った」「実際の発話」「読み上げ内容」などの断定表現

## アクセシビリティ（A11Y.md への上乗せ、仕様書 §17）

- キャッチ項目の追加でユーザーのフォーカスを移動しない
- 新しいキャッチ項目を本拡張自身のライブリージョンで自動通知しないことを初期設定とする
- 強制カラーモード（forced-colors）対応、prefers-reduced-motion の尊重
- 差分・通知種別を色だけで示さない（テキストラベル・アイコン・境界線等を併用）
- キャッチ内容には判定できた場合に適切な `lang`・文字方向（`dir`）を反映する
