# Live Regions Catcher — プロジェクト固有ルール

グローバル CLAUDE.md（および REPOSITORY.md / A11Y.md / CHROME_EXTENSION.md）を前提とした、このプロジェクト固有の事項のみを記載する。

## 基本情報

- 名称：**Live Regions Catcher**／日本語表記：**ライブリージョン・キャッチャー**（中黒あり）
  - Chromeが表示する拡張名（サイドパネルのタイトル・chrome://extensions・ストア掲載名）はロケール準拠（en=英語名／ja=日本語名）。サイドパネルのタイトルはブラウザUIのため、拡張からフォント・表示有無・文字列の動的変更はできない（検討のうえロケール準拠を維持するというYuさんの決定）
- **Public リポジトリ** → コミットメッセージは英語（Conventional Commits）、README.md / CHANGELOG.md は英語セクション → `---` → 日本語セクション
- 仕様書：`work/live-regions-catcher_specification-draft.docx`（`work/` はgitignore対象・ローカルのみ）。実装判断に迷ったら必ず仕様書に立ち返ること
- バージョン記載箇所：`manifest.json` の `version`。変更のたびにsemverで更新し、リリース時はCHANGELOG.md（全履歴）とREADME.md（最新のみ）の両方へ記載
- グローバル向け（UIは英語・日本語、`default_locale: en`）。キャッチした通知内容は翻訳・変換せず原文のまま保持する（仕様書§15）

## アーキテクチャ

- Manifest V3・ビルドツールなしのVanilla JS（ES modules）＋バニラCSS。アイコンクリックで**popup**（監視の有効/無効スイッチ・「サイドパネルを開く」ボタン・オプションページへのリンクの最小構成）が開き、ログ表示は**サイドパネル**（popup内ボタンから `chrome.sidePanel.open()`。このため `minimum_chrome_version` は116）
- ディレクトリ：`src/sidepanel/`・`src/popup/`・`src/options/`・`src/content/`・`src/background/`・`src/lib/`・`src/styles/`・`_locales/`・`docs/`（デモページ）・`promotion/`（ストア素材）
- **コンテンツスクリプト**はclassicスクリプト。`manifest.json` の記載順（shared → effective-values → accessible-content → dom-path → modal → catch-engine → observer）にロードし `globalThis.LRC` 名前空間を共有。DOM監視の開始は**DOMContentLoaded後**（パーサー挿入の初期内容は「更新」ではない）
- **MAIN worldフック**（`src/content/page-hooks.js`）：`ariaNotify()` と `attachShadow()`（openのみ）をラップし、DOMイベント（`lrc-arianotify` / `lrc-attachshadow`）でISOLATED側へ通知。detailは**JSON文字列**（オブジェクトはworld境界を越えない）。ラッパーは元メソッドを必ず呼び、this・引数・戻り値・例外を変更しない（§4.4）
- **パイプライン**：content → SW（`lrc:catch`）→ `chrome.storage.session` の `catches:<tabId>` / `unread:<tabId>`（1タブ上限1000件）→ サイドパネルは storage を直接読み `onChanged` で追従。既読はパネル → SW の `lrc:mark-read`。バッジ更新はSWのみ（通常 `#1a56a8`／assertive含む `#b3261e`）
- **設定**：`chrome.storage.local` のキー `settings`。既定値・スキーマは `src/lib/settings.js` が単一ソースで、`src/content/shared.js` の `LRC.DEFAULT_SETTINGS` と**同期を保つこと**（コンテンツスクリプトはESモジュールをimportできないため）。全サーフェスが `storage.onChanged` で即追従する
- **i18n**：`_locales/` はChrome直轄の文言のみ（拡張名・説明・ツールチップ）。拡張内UIは `src/lib/messages.js`（en/jaカタログ・同一キー・enフォールバック）＋ `src/lib/i18n.js` の `t()`。**拡張内UIで `chrome.i18n.getMessage` を使わないこと**（実行時言語切替のため）
- **エクスポート**：`src/lib/export.js`。Markdownの見出し・ラベルはUI言語／内容は原文、JSONはキー・列挙値とも英語固定（schemaVersion `1.0`）。ファイル名は `{hostname}-live-region-log-{YYYYMMDD-HHMMSS}.{md|json}`。Blob + `<a download>`（downloads権限不要）。エクスポート後のログ自動消去はしない
- モーダル判定（§11.3）はヒューリスティック（表示中の `aria-modal="true"` な dialog/alertdialog のうちスキャン順で最後）。「本拡張が判定したモーダル」として扱う
- **通知音**：Optionsの「通知音パターン」5択ラジオ（無音＝初期値／4種の音）＋「通知音ボリューム」3択（標準＝1.0／小さく＝-8dB(0.4)／もっと小さく＝-16dB(0.16)、`SOUND_VOLUME_LEVELS`）。SWがキャッチ保存後に Offscreen Document（`src/offscreen/`、`offscreen` 権限、`AUDIO_PLAYBACK`）へ `lrc:play-sound` を送って再生。単一Audio要素の使い回しで「新しい音は再生中の音を止めてから鳴る」。試聴も選択中ボリュームを反映。音源の出所はREADMEの「Sound credits」に記載。優先度による音の使い分けは**しない**（Yuさんの決定）

## Yuさんと合意済みの方針

- 拡張アイコンの状態表現（§13.1）は**アイコン画像切替ではなくバッジのみ**（件数＋色。監視無効中は灰色 `#696969` の「OFF」）
- 監視の有効/無効はpopupのスイッチ（設定キー `monitoringEnabled`）。無効中は新規キャッチ・音・バッジ加算を停止し、コンテンツスクリプト側はobserverを切断（既存ログは保持、再開時はツリー再スキャン）
- パネル先頭のディスクロージャータイトルは**「ログ管理」**（「オプション」はオプションページと紛らわしいため不可）
- エクスポートの基本セット（DOMパス・フレーム情報・注意情報・各キャッチのページURL）は**常時出力**でUIに出さない。選択できるのは詳細4項目（変更前後の内容・ARIA明示値・Mutation内訳・HTML断片、初期値OFF）のみ。**エクスポート先頭のURL・ページタイトルは出力しない**（ログは複数ページをまたぐことがあり、各キャッチが発生元URLを持つため）。JSONのschemaVersionは1.1
- Optionsページ最下部には `<hr>` ＋ GitHub Issues への報告案内リンクを必ず置く（en/jaでローカライズ）
- フォームエラーは自動消去しない。消してよいのは「同フィールドの再編集・他コントロールの操作・ページのblur」のタイミング
- パネル先頭は**stickyにしない**。「オプション」開閉領域（`details`）にエクスポート／キャッチログの消去（**確認ダイアログなし**・`danger-button`）／オプションページへのリンク／ガイドへのリンクを集約する
- **ガイドは拡張内に持たず** `docs/guide.html`（GitHub Pages）で公開・更新する（パネルは狭く読みにくい／文章の加筆修正のたびに拡張のバージョンを上げたくない、というYuさんの判断）
- `aria-live="off"` と暗黙ライブリージョンロールの競合は、注意付きでキャッチする（実効値は `off` として記録）

## UI文言（仕様書§22）

- 使用する：キャッチ／通知／通知内容／通知候補／通知元／実効値 など
- 使用しない：「スクリーンリーダーが喋った」「実際の発話」「読み上げ内容」などの断定表現
- ARIAトークン・role名・JSON識別子はローカライズしない（§15.2）

## アクセシビリティ（A11Y.mdへの上乗せ、仕様書§17）

- キャッチ項目の追加でユーザーのフォーカスを移動しない。本拡張自身のライブリージョンで新着を自動通知しない
- 差分・通知種別を色だけで示さない（テキストラベル・下線スタイル・チップを併用。forced-colors時は背景なしでも区別が成立すること）
- prefers-reduced-motion・強制カラーモードに対応。キャッチ内容には判定できた場合に `lang`・`dir` を反映する

## 未実装・今後の課題

- §16：未確認の既読タイミング4種／保持期間「ブラウザを閉じるまで・手動まで」（項目単位の既読UI・ログブラウザが前提）
- §14.3：エクスポート範囲「フィルター結果」「選択したキャッチ項目」（パネルにフィルター／選択UIが入るタイミングで）
