# Live Regions Catcher

A Chrome extension that catches ARIA live region updates and `ariaNotify()` calls on a web page, and visualizes them chronologically in the browser's side panel.

> **Status: In development** — not yet released.

## Overview

Live Regions Catcher detects notifications that a web page attempts to convey to browsers and assistive technologies, and displays them as visual messages — like a one-way chat window from the page to you.

It does **not** reproduce or record what a screen reader actually speaks. It shows the page's notification intent as observable from the DOM and Web APIs, keeping the original content untouched.

## Features (planned for 1.0.0)

- Catches updates of explicit live regions (`aria-live="polite"` / `"assertive"`) and implicit ones (`role="status"` / `"log"` / `"alert"`)
- Computes effective values of `aria-live`, `aria-atomic`, `aria-relevant`, and respects `aria-busy`
- Diff-style display of what was added, changed, or removed — never relying on color alone
- Monitors dynamically added regions, open Shadow DOM, and iframes
- Observes `ariaNotify()` calls where the API is available
- Configurable handling of notifications outside `aria-modal` dialogs
- Chat-log style timeline in the side panel, with unread badge on the toolbar icon
- Export logs as Markdown or JSON — all data stays local
- UI in English and Japanese

## Installation

### Chrome Web Store

(Coming soon)

### Developer Mode (Manual Install)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the repository folder

## Usage

1. Click the Live Regions Catcher icon in the toolbar to open the side panel
2. Browse as usual — live region updates on the page are caught and listed chronologically
3. Expand a catch item to inspect details (roles, effective ARIA values, DOM path, and more)
4. Configure behavior from the Options page

## Changelog

(No releases yet)

---

# Live Regions Catcher（ライブリージョン・キャッチャー）

Webページ上のARIAライブリージョンの更新と `ariaNotify()` の呼び出しをキャッチし、ブラウザのサイドパネルに時系列で可視化するChrome拡張です。

> **ステータス：開発中** — 未リリースです。

## 概要

ライブリージョン・キャッチャーは、Webページがブラウザや支援技術へ伝えようとした通知を検知し、視覚的なメッセージとして表示します。ページからあなたへ送られる、一方通行のチャットウィンドウのようなイメージです。

スクリーンリーダーが実際に発話した内容を再現・記録するものでは**ありません**。DOMおよびWeb APIから観測できるページ側の通知意図を、原文のまま表示します。

## 機能（1.0.0 予定）

- 明示的なライブリージョン（`aria-live="polite"` / `"assertive"`）と暗黙のライブリージョン（`role="status"` / `"log"` / `"alert"`）の更新をキャッチ
- `aria-live`・`aria-atomic`・`aria-relevant` の実効値を計算し、`aria-busy` を尊重
- 追加・変更・削除を差分スタイルで表示（色だけに依存しない）
- 動的に追加されたリージョン、Open Shadow DOM、iframe も監視
- `ariaNotify()` の呼び出しを観測（APIが利用可能な環境）
- `aria-modal` ダイアログ外の通知の扱いを設定可能
- チャットログ風のタイムライン表示と、ツールバーアイコンの未確認バッジ
- MarkdownまたはJSONでのログエクスポート — データはすべてローカル処理
- UIは英語・日本語に対応

## インストール

### Chrome ウェブストア

準備中

### デベロッパーモード（手動インストール）

1. このリポジトリをダウンロードまたはクローン
2. Chromeで `chrome://extensions` を開く
3. 右上の **デベロッパーモード** を有効にする
4. **パッケージ化されていない拡張機能を読み込む** をクリックし、リポジトリのフォルダを選択

## 使い方

1. ツールバーのライブリージョン・キャッチャーのアイコンをクリックしてサイドパネルを開く
2. 通常どおりブラウジングすると、ページ上のライブリージョン更新がキャッチされ時系列で表示されます
3. キャッチ項目を展開すると、詳細（ロール・ARIA実効値・DOMパスなど）を確認できます
4. 動作はOptionsページから設定できます

## 更新履歴

（未リリース）
