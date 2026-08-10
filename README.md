# Live Regions Catcher

A Chrome extension that catches ARIA live region updates and `ariaNotify()` calls on a web page, and visualizes them chronologically in the browser's side panel.

## Overview

Live Regions Catcher detects notifications that a web page attempts to convey to browsers and assistive technologies, and displays them as visual messages — like a one-way chat window from the page to you.

It does not reproduce or record what a screen reader actually speaks. It shows the page's notification intent as observable from the DOM and Web APIs, keeping the original content untouched.

The people who use the web are not simply divided into those who see and those who do not: there are many people with visual impairments who are not blind and do not use a screen reader. In other words, information that the screen fails to convey cannot be substituted by a live region alone. Visualizing live regions makes it possible to check whether that information is properly conveyed visually.

## Features

- Catches updates of explicit live regions (`aria-live="polite"` / `"assertive"`) and implicit ones (`role="status"` / `"log"` / `"alert"`), including regions added dynamically
- Computes effective values of `aria-live`, `aria-atomic`, and `aria-relevant` through the composed tree, and respects `aria-busy` (holding catches until it clears, or recording them if you prefer)
- Catches additions, removals, and text changes individually according to `aria-relevant`, capturing removed content before it becomes unreachable
- Monitors open shadow DOM (including roots attached after connection) and iframes
- Observes `ariaNotify()` calls where the API is available, with priority and call-target information
- Configurable handling of notifications outside `aria-modal` dialogs: catch, ignore, or annotate
- Notes for patterns worth inspecting: empty notification candidates, regions inserted together with their content, invalid `aria-relevant` tokens, assertive bursts, implicit roles muted with `aria-live="off"`, and more
- Chat-log style timeline with expandable details (explicit vs effective values, DOM path, HTML fragments, mutation breakdown)
- Unread badge on the toolbar icon; red when unread catches include assertive ones
- Monitoring on/off switch in the toolbar popup — while off, the toolbar icon turns gray, nothing new is caught, and existing logs are kept
- Optional notification sound for each catch, like a chat app (silent by default; four patterns with preview and a three-step volume setting on the Options page)
- Export the log as Markdown or JSON, optionally adding extra details — files are named after the page's hostname and saved locally only
- UI in English and Japanese, switchable at runtime; caught content is always kept verbatim

## Installation

### Chrome Web Store

(Coming soon)

### Developer Mode (Manual Install)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the repository folder

## Usage

1. Click the Live Regions Catcher icon in the toolbar to open the popup, where you can toggle monitoring on and off (while off, the icon turns gray and nothing new is caught) and press **Open side panel**
2. Browse as usual — live region updates on the current tab are caught and listed chronologically
3. Expand **Details** on a catch item to inspect roles, effective ARIA values, DOM paths, and more
4. Open **Log management** at the top of the panel to export the log (Markdown / JSON), clear it, or jump to the settings and the guide
5. Fine-tune behavior on the Options page: catch targets, mutation grouping, `aria-busy` and modal handling, display preferences, data retention, notification sound, and UI language

A demo page covering the typical scenarios is included at [docs/index.html](https://securecat.github.io/live-regions-catcher/), and the [guide page](https://securecat.github.io/live-regions-catcher/guide.html) explains catch patterns and notes in detail.

## Privacy

- All processing happens locally; catch data is never sent anywhere
- Catch data is kept per tab in session storage and is discarded when the tab closes (or earlier, per your retention setting)
- Password input values are never collected
- Exported files may contain personal or sensitive information from the page — handle them with care

## Sound credits

The Odnoklassniki, ICQ, and Pager style notification sounds are from [Sound Dino](https://sounddino.com/), and the Boing sound is from [Pixabay](https://pixabay.com/). All of them are free to use, including commercially, with no attribution required.

## Changelog

### [1.8.0] - 2026-08-09

#### Added

- A "New from here" band marks where unseen catches begin, so new entries are identifiable without relying on motion. It stays in place and moves only when a later burst arrives; catches landing within a second of each other stay under one band
- Options setting for the fade-in of new catches (Display section): fade in / do not fade in. Until it is chosen, it follows the OS reduced-motion preference; choosing either option overrides that preference in both directions

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

---

# ライブリージョン・キャッチャー

Webページ上のARIAライブリージョンの更新と `ariaNotify()` の呼び出しをキャッチし、ブラウザのサイドパネルに時系列で可視化するChrome拡張です。

## 概要

ライブリージョン・キャッチャーは、Webページがブラウザや支援技術へ伝えようとした通知を検知し、視覚的なメッセージとして表示します。ページからあなたへ送られる、一方通行のチャットウィンドウのようなイメージです。

スクリーンリーダーが実際に発話した内容を再現・記録するものではありません。DOMおよびWeb APIから観測できるページ側の通知意図を、原文のまま表示します。

Webの利用者は晴眼者か全盲かのみに分かれているわけではなく、スクリーンリーダーを使わない全盲以外の視覚障害者もたくさんいます。つまり、画面上で十分に伝わらない情報は、ライブリージョンだけでは代替できないということです。ライブリージョンの可視化により、情報が視覚的に適切に伝えられているかを検証することが可能となります。

## 機能

- 明示的なライブリージョン（`aria-live="polite"` / `"assertive"`）と暗黙のライブリージョン（`role="status"` / `"log"` / `"alert"`）の更新をキャッチ（動的に追加されたリージョンも対象）
- `aria-live`・`aria-atomic`・`aria-relevant` の実効値を複合ツリーをたどって計算し、`aria-busy` を尊重（解除まで保留。記録する設定も可）
- `aria-relevant` に応じて追加・削除・テキスト変更をそれぞれキャッチ（削除された内容は参照不能になる前に取得して保持）
- Open Shadow DOM（接続後にattachShadowされたものを含む）とiframeも監視
- `ariaNotify()` の呼び出しを観測（APIが利用可能な環境）。優先度・呼び出し対象も記録
- `aria-modal` ダイアログ外の通知の扱いを設定可能：キャッチ／除外／注記付きキャッチ
- 検証の手がかりになる注意情報：空の通知候補、内容ごと挿入されたリージョン、不正な `aria-relevant` トークン、assertiveの多発、`aria-live="off"` で無効化された暗黙ロールなど
- チャットログ風のタイムラインと展開式の詳細表示（明示値/実効値の対比・DOMパス・HTML断片・Mutationの内訳）
- ツールバーアイコンに未確認件数バッジ。未確認にassertiveが含まれる場合は赤色
- ポップアップに監視の有効・無効スイッチ。無効中はツールバーアイコンがグレーになり、新しいキャッチは行われません（既存のログは保持）
- チャットアプリのような、キャッチごとの通知音（初期値は無音。Optionsページで4種類から試聴して選択でき、ボリュームも3段階から選択可能）
- ログをMarkdownまたはJSONでエクスポート。詳細情報の追加も選択でき、ファイルはページのホスト名を冠した名前でローカルにのみ保存
- UIは英語・日本語に対応し、実行中に切替可能。キャッチした内容は常に原文のまま保持

## インストール

### Chrome ウェブストア

準備中

### デベロッパーモード（手動インストール）

1. このリポジトリをダウンロードまたはクローン
2. Chromeで `chrome://extensions` を開く
3. 右上の **デベロッパーモード** を有効にする
4. **パッケージ化されていない拡張機能を読み込む** をクリックし、リポジトリのフォルダを選択

## 使い方

1. ツールバーのライブリージョン・キャッチャーのアイコンをクリックするとポップアップが開きます。監視の有効・無効の切替（無効中はアイコンがグレーになり、新しいキャッチは行われません）と、**サイドパネルを開く**ボタンがあります
2. 通常どおりブラウジングすると、現在のタブのライブリージョン更新がキャッチされ時系列で表示されます
3. キャッチ項目の**詳細**を展開すると、ロール・ARIA実効値・DOMパスなどを確認できます
4. パネル先頭の**ログ管理**から、ログのエクスポート（Markdown / JSON）・消去、設定やガイドへの移動ができます
5. Optionsページで動作を調整できます：キャッチ対象・Mutationの集約・`aria-busy` とモーダルの扱い・表示設定・データ保持・通知音・UI言語

典型的なシナリオを集めたデモページを [docs/index.html](https://securecat.github.io/live-regions-catcher/) に同梱しているほか、[ガイドページ](https://securecat.github.io/live-regions-catcher/guide.html) でキャッチのパターンや注意情報を詳しく解説しています。

## プライバシー

- すべての処理はローカルで行われ、キャッチデータが外部へ送信されることはありません
- キャッチデータはタブ単位でセッションストレージに保持され、タブを閉じると破棄されます（保持設定によりさらに短くできます）
- パスワード入力値は収集しません
- エクスポートしたファイルにはページ由来の個人情報・機密情報が含まれる可能性があります。取り扱いにご注意ください

## 音源クレジット

オドノクラスニキ風・ICQ風・ポケベル風の通知音は [Sound Dino](https://sounddino.com/) から、ボヨヨン擬音は [Pixabay](https://pixabay.com/) から取得しました。いずれも無料・商用可・クレジット表記不要のライセンスです。

## 更新履歴

### [1.8.0] - 2026-08-09

#### 追加

- 未確認のキャッチの先頭に「ここから新着」の帯を表示。動きに依存せず新着を判別できます。帯はその場に留まり、間隔が空いて次のキャッチが届いたときに移動します（1秒以内に連続して届いたキャッチは1つの帯にまとまります）
- 新しいキャッチのフェードイン表示をOptionsページ（表示セクション）で選択可能に：する／しない。未選択のうちはOSのprefers-reduced-motion設定に従い、いずれかを選ぶとその選択が優先されます

全履歴は [CHANGELOG.md](./CHANGELOG.md) を参照してください。
