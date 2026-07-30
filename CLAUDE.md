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

## UI 文言（仕様書 §22）

- 使用する：キャッチ／通知／通知内容／通知候補／通知元／実効値 など
- 使用しない：「スクリーンリーダーが喋った」「実際の発話」「読み上げ内容」などの断定表現

## アクセシビリティ（A11Y.md への上乗せ、仕様書 §17）

- キャッチ項目の追加でユーザーのフォーカスを移動しない
- 新しいキャッチ項目を本拡張自身のライブリージョンで自動通知しないことを初期設定とする
- 強制カラーモード（forced-colors）対応、prefers-reduced-motion の尊重
- 差分・通知種別を色だけで示さない（テキストラベル・アイコン・境界線等を併用）
- キャッチ内容には判定できた場合に適切な `lang`・文字方向（`dir`）を反映する
