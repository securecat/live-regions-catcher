# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.5.0] - 2026-08-03

### Added

- Toolbar popup with a monitoring on/off switch, an "Open side panel" button, and a link to the Options page; while monitoring is off, the badge shows a gray OFF, nothing new is caught (no sound, no unread counting), observation is disconnected in pages, and existing logs are kept

### Changed

- Clicking the toolbar icon now opens the popup; the side panel opens from the button inside it (this raises the minimum Chrome version to 116)
- The side panel's top disclosure is renamed from "Options" to "Log management" to avoid confusion with the Options page

## [1.4.0] - 2026-08-03

### Added

- New "Boing" notification sound (from Pixabay; free license, commercial use OK, no attribution required)
- Notification sound volume setting: standard / quieter (-8 dB) / even quieter (-16 dB); preview buttons play at the selected volume

### Changed

- The sound section is now titled "Notification sound pattern"

## [1.3.0] - 2026-08-02

### Added

- Guide page on the project site explaining what gets caught, region insertion patterns, the notes reference, modal handling, and limitations (English and Japanese)

### Changed

- The top of the side panel is now an "Options" disclosure grouping export, catch log clearing, and links to the Options page and the guide; it no longer sticks while scrolling
- Clearing the log no longer shows a confirmation dialog; the button uses the destructive style instead

## [1.2.0] - 2026-08-01

### Added

- Optional notification sound for each catch: a four-way choice on the Options page (silent by default; three sound styles with preview buttons); a new sound stops the one still playing, so rapid catches never overlap

## [1.1.0] - 2026-08-01

### Changed

- The basic export set (DOM paths, frame info, notes, per-catch page URLs) is now always exported; only the four detail items (previous/current content, explicit ARIA values, mutation breakdown, HTML fragments) remain selectable
- Removed the export-time page URL from the export header — a log can span multiple pages, and each catch already carries its own source URL (JSON schemaVersion is now 1.1)

## [1.0.3] - 2026-08-01

### Fixed

- The export header URL was always empty (missing host permissions for reading the active tab's URL)
- Re-inserting the same node within one grouping window (a common re-render pattern) produced duplicate identical changes and HTML fragments in a catch; the change is now updated in place while the mutation count still reflects both

### Changed

- Markdown export now records the source URL for every catch when frame info is included (iframe catches are marked); JSON already carried it per catch
- Removed the page title from exports; the export option is now "Include page URL"

## [1.0.2] - 2026-07-31

### Changed

- Hid the side panel's in-page heading visually, since Chrome already shows the extension name as the panel title (it remains for screen-reader heading navigation)

## [1.0.1] - 2026-07-31

### Changed

- Adjusted the extension icon colors

## [1.0.0] - 2026-07-31

### Added

- Initial release
- Catching of explicit (`aria-live`) and implicit (`role="status"` / `"log"` / `"alert"`) live region updates, including dynamically added regions
- Effective value computation for `aria-live` / `aria-atomic` / `aria-relevant` through the composed tree, with `aria-busy` holding
- Diff-style display of added / changed / removed content, never relying on color alone
- Monitoring of open shadow DOM (including late `attachShadow`) and iframes
- `ariaNotify()` observation where the API is available
- Configurable handling of notifications outside `aria-modal` dialogs (catch / ignore / annotate)
- Notes for inspection-worthy patterns: empty notification candidates, regions inserted with content, invalid tokens, assertive bursts, muted implicit roles, and more
- Side panel timeline with expandable details, unread badge (red for assertive), and log clearing
- Markdown / JSON export with per-item selection; files are saved locally only
- English and Japanese UI switchable at runtime; all processing stays local and password values are never collected

---

# 更新履歴

このファイルは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) の形式に基づき、プロジェクトは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [1.5.0] - 2026-08-03

### 追加

- ツールバーのポップアップを新設：監視の有効・無効スイッチ／「サイドパネルを開く」ボタン／オプションページへのリンク。無効中はバッジに灰色の OFF を表示し、新しいキャッチを停止（音・未確認カウントも停止、ページ内の監視も切断）。既存のログは保持

### 変更

- ツールバーアイコンのクリックはポップアップを開くように変更（サイドパネルはポップアップ内のボタンから。これに伴い最低Chromeバージョンを116に引き上げ）
- サイドパネル先頭の開閉領域名を「オプション」から「ログ管理」に変更（オプションページとの紛らわしさを解消）

## [1.4.0] - 2026-08-03

### 追加

- 通知音「ボヨヨン擬音」を追加（Pixabay取得。無料ライセンス・商用可・クレジット不要）
- 通知音ボリューム設定を新設：標準／小さく（-8dB）／もっと小さく（-16dB）。試聴ボタンも選択中のボリュームで再生

### 変更

- 通知音セクションの名称を「通知音パターン」に変更

## [1.3.0] - 2026-08-02

### 追加

- キャッチ対象・リージョンの挿入パターン・注意情報リファレンス・モーダルの扱い・制約を解説するガイドページをプロジェクトサイトに追加（英語・日本語）

### 変更

- サイドパネルの先頭を「オプション」開閉領域に変更し、エクスポート・キャッチログの消去・オプションページとガイドへのリンクを集約。スクロール追従（固定表示）は廃止
- ログ消去の確認ダイアログを廃止し、ボタンを破壊的アクションスタイルに変更

## [1.2.0] - 2026-08-01

### 追加

- キャッチごとの通知音：Optionsページの4択ラジオ（初期値は無音。3種類の音は試聴ボタン付き）。新しい音が鳴るときは再生中の音を停止してから鳴らすため、連続キャッチでも音が重ならない

## [1.1.0] - 2026-08-01

### 変更

- エクスポートの基本セット（DOMパス・フレーム情報・注意情報・各キャッチのページURL）は常時出力とし、選択できるのは詳細4項目（変更前後の内容・ARIAの明示値・Mutationの内訳・HTML断片）のみに変更
- エクスポート先頭のURLを削除 — ログは複数ページをまたぐことがあり、各キャッチが発生元URLを持っているため（JSONのschemaVersionは1.1に更新）

## [1.0.3] - 2026-08-01

### 修正

- エクスポートのヘッダーのURLが常に空になっていた問題を修正（アクティブタブのURL取得に必要なホスト権限の不足）
- 同一ノードが1つの集約時間内に再挿入された場合（再レンダリングで頻出するパターン）に、同一の変更とHTML断片が重複して記録されていた問題を修正（変更は最新内容で更新し、Mutation数には両方を計上）

### 変更

- Markdownエクスポートで、「フレーム情報を含める」時に各キャッチへ発生元URLを出力するように（iframe発生には印を付加。JSONは従来から個別に記録済み）
- エクスポートからページタイトルを削除し、オプション名を「ページURLを含める」に変更

## [1.0.2] - 2026-07-31

### 変更

- サイドパネルのタイトルとしてChromeが拡張名を表示するため、パネル内の同内容の見出しを視覚的に非表示化（スクリーンリーダーの見出しナビゲーション用として維持）

## [1.0.1] - 2026-07-31

### 変更

- 拡張機能アイコンの配色を調整

## [1.0.0] - 2026-07-31

### 追加

- 初回リリース
- 明示的（`aria-live`）・暗黙的（`role="status"` / `"log"` / `"alert"`）なライブリージョン更新のキャッチ（動的に追加されたリージョンを含む）
- 複合ツリーをたどった `aria-live` / `aria-atomic` / `aria-relevant` の実効値計算と `aria-busy` による保留
- 追加・変更・削除の差分スタイル表示（色だけに依存しない）
- Open Shadow DOM（後付けの `attachShadow` を含む）とiframeの監視
- `ariaNotify()` の観測（APIが利用可能な環境）
- `aria-modal` ダイアログ外の通知の扱いを設定可能（キャッチ／除外／注記）
- 検証の手がかりになる注意情報：空の通知候補・内容ごと挿入されたリージョン・不正なトークン・assertiveの多発・無効化された暗黙ロールなど
- サイドパネルのタイムライン表示・展開式の詳細・未確認バッジ（assertive含む場合は赤）・ログ消去
- 項目を選択できるMarkdown / JSONエクスポート（ファイルはローカルにのみ保存）
- 実行中に切替可能な英語・日本語UI。すべての処理はローカルで行い、パスワード入力値は収集しない
