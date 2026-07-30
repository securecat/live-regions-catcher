# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
