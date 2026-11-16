# Accessibility

Last updated: 2026-11-17

## Priorities and Goals

This statement covers:

- The extension's UI (the popup, the side panel, and the options page)
- How the extension affects the pages you visit
- The guide page and the demo page published on GitHub Pages

For the UI, we target WCAG 2.2 Level AA, and we treat it as a minimum, not a ceiling. Some of our own rules are stricter than AA (see [Contributor Expectations](#contributor-expectations)). We have not had a third-party evaluation, so this is a target, not a claim of conformance.

## Effect on the Pages You Visit

Live Regions Catcher observes pages; it does not change them.

- It does not modify the page's DOM
- To observe `ariaNotify()` and `attachShadow()`, it wraps these two methods. The wrappers always call the original method and do not change its arguments, return value, or exceptions
- It does not move focus on the page

## How New Catches Appear in the Side Panel

- Focus does not move when a new catch arrives
- The extension does not announce new catches through a live region of its own, so its announcements do not overlap with the page's notifications. You can find new catches by the "New from here" divider in the side panel and by the count on the toolbar icon's badge. You can also choose a notification sound on the options page (silent by default)
- Differences between the previous and current content, and the kinds of notification, are not shown by color alone. Text labels and underline styles are used as well, and the distinction remains in forced colors mode
- When the language (`lang`) and direction (`dir`) of the caught content can be determined, they are applied to the content in the side panel

## Supported Environments

- Browser: Google Chrome (desktop), version 116 or later
- Operating systems: tested on Windows and macOS
- Screen readers: tested with NVDA on Windows. We have not yet tested other screen readers, including JAWS and PC-Talker on Windows and VoiceOver on macOS
- All features of the extension's UI can be operated with a keyboard alone

## Known Limitations

- **When a new catch arrives, the side panel scrolls to the end by default if you are already viewing the end, and new catches fade in.** The fade-in is off by default when your OS is set to reduce motion.
  - Workaround: On the options page, under "Display," set "Auto-scroll on new catches" to "Do not auto-scroll" and "Fade in new catches" to "Do not fade in."
- **Some text in the side panel does not reach our own 7:1 contrast rule.** To give the side panel the look of a chat app, some text has a contrast ratio between 4.5:1 and 7:1, such as the times, some labels, the "New from here" band, and the message shown when there are no catches. This meets WCAG 2.2 Level AA (4.5:1), but not the stricter rule in [Contributor Expectations](#contributor-expectations).
  - Workaround: In forced colors mode, such as Windows contrast themes, the side panel is shown in the system colors.

## Reporting Accessibility Barriers

Please report barriers through [GitHub Issues](https://github.com/securecat/live-regions-catcher/issues). You can write in English or Japanese.

The following details help us, but all of them are optional:

- What you were trying to do
- The screen or feature you were using (for example, the side panel or the options page), and the URL of the page you were checking
- What happened, and what you expected
- Your OS, browser version, and Live Regions Catcher version
- Any assistive technology you use, such as a screen reader

You don't need to tell us about any disability. Screenshots and recordings are not required.

## Response Process

Live Regions Catcher is developed by an individual, so we can't promise a deadline for replies or fixes. We will respond as quickly as we can.

- We will reply on the issue once we've seen your report
- If there is a workaround, we will share it
- Before releasing a fix, we may ask you to confirm that it works for you
- Fixes are recorded in [CHANGELOG.md](https://github.com/securecat/live-regions-catcher/blob/main/CHANGELOG.md)

## Contributor Expectations

These expectations apply equally to human contributors and coding agents.

When you change the UI, aim to meet the following:

- Use native form controls (`<input>`, `<select>`, `<textarea>`). Don't use `<div>` or `<span>` as buttons; use `<button>` for actions on the page and `<a>` for navigation
- Don't use the `disabled` attribute
- Don't remove focus indicators (no `outline: none`)
- Don't remove link underlines
- Keep text contrast at 7:1 or higher for body text and 4.5:1 or higher for secondary text, in both light and dark themes
- Keep non-text elements, such as borders and icons, at 3:1 or higher against adjacent colors
- Don't apply `opacity` to elements that need contrast
- Use a minimum font size of 16px for Japanese and 14px for English
- Use `font-family: sans-serif` (don't use `system-ui`)
- Don't dismiss status messages automatically
- Don't add anything that moves on its own, such as auto-scrolling

After the change, check that everything can be operated with a keyboard alone, and that a screen reader such as NVDA reads the content correctly.

When you change the content scripts (`src/content/`), don't modify the page's DOM or move focus on the page. The wrappers in `page-hooks.js` must always call the original method and must not change `this`, the arguments, the return value, or exceptions. When you change the side panel, don't move focus when a catch arrives, and don't announce new catches through the extension's own live region.

## Ownership and Maintenance

This statement is maintained by the maintainer, securecat. We update it when we add features or when the tested environments change.

## Feedback on This Statement

Suggestions about this statement or our approach to accessibility are also welcome through [GitHub Issues](https://github.com/securecat/live-regions-catcher/issues).

---

# アクセシビリティ

最終更新：2026-11-17

## 優先事項と目標

この文書が対象とするのは、次のとおりです。

- 拡張機能のUI（ポップアップ、サイドパネル、オプションページ）
- 拡張機能が、閲覧中のページに与える影響
- GitHub Pages で公開しているガイドページとデモページ

UIは WCAG 2.2 のレベル AA を目標とし、これを上限ではなく下限と考えています。AAより厳しい独自の基準もあります（[貢献者への期待](#貢献者への期待)を参照）。第三者による試験は受けていないため、これは目標であり、適合を表明するものではありません。

## 閲覧中のページへの影響

ライブリージョン・キャッチャーは、ページを観測するだけで、ページを変更しません。

- ページの DOM を書き換えません
- `ariaNotify()` と `attachShadow()` を観測するため、この2つのメソッドを包んでいます。包んだメソッドは、必ず元のメソッドを呼び、引数・戻り値・例外を変えません
- ページのフォーカスを動かしません

## サイドパネルでの新着の表示

- 新しいキャッチが届いても、フォーカスは動きません
- 拡張機能自身のライブリージョンで新着を知らせることはしません。ページ側の通知と重ならないようにするためです。新着は、サイドパネルの「ここから新着」の区切りと、ツールバーアイコンのバッジの件数で確認できます。オプションページで通知音を選ぶこともできます（初期値は無音）
- 変更前後の内容の違いや通知の種類は、色だけで示しません。テキストのラベルや下線の種類も使っており、強制カラーモードでも区別できます
- キャッチした内容の言語（`lang`）と書字方向（`dir`）が分かる場合は、サイドパネルの表示に反映します

## 対応している環境

- ブラウザ：Google Chrome（デスクトップ版）のバージョン116以降
- OS：Windows、macOS で動作を確認済み
- スクリーンリーダー：Windows の NVDA で読み上げを確認済み。Windows の JAWS や PC-Talker、macOS の VoiceOver など、ほかのスクリーンリーダーではまだ試していません
- 拡張機能のUIのすべての機能を、キーボードだけで操作できます

## 既知の制限

- **新しいキャッチが届くと、初期設定では、末尾を見ているときにサイドパネルが末尾まで自動でスクロールし、新しい項目がフェードインで表示されます。** フェードインは、OS で視差効果を減らす設定にしている場合は、初期設定で表示しません。
  - 回避策：オプションページの「表示」で、「新しいキャッチ時の自動スクロール」を「自動スクロールしない」に、「新しいキャッチのフェードイン表示」を「しない」にしてください。
- **サイドパネルの一部の文字は、独自の基準であるコントラスト比 7:1 に届いていません。** サイドパネルをチャットアプリ風の見た目にするため、時刻、一部のラベル、「ここから新着」の帯、キャッチがないときのメッセージなどは、コントラスト比が 4.5:1 以上 7:1 未満です。WCAG 2.2 のレベル AA（4.5:1）は満たしていますが、[貢献者への期待](#貢献者への期待)に挙げた、より厳しい基準には届いていません。
  - 回避策：Windows のコントラスト テーマなどの強制カラーモードでは、サイドパネルはシステムの配色で表示されます。

## アクセシビリティの問題を報告する

問題は [GitHub Issues](https://github.com/securecat/live-regions-catcher/issues) で報告してください。日本語でも英語でも構いません。

次のことを書いてもらえると助かりますが、どれも任意です。

- 何をしようとしていたか
- 使っていた画面や機能（サイドパネル、オプションページなど）と、点検していたページのURL
- 何が起きたか、どうなると思っていたか
- OS、ブラウザのバージョン、ライブリージョン・キャッチャーのバージョン
- 使っている支援技術（スクリーンリーダーなど）

障害の有無や内容を書く必要はありません。スクリーンショットや録画も必須ではありません。

## 対応の流れ

ライブリージョン・キャッチャーは個人で開発しているため、返信や修正の期限はお約束できません。それでも、できるかぎり早く対応します。

- 報告を確認したら、Issue で返信します
- 回避策があれば、お知らせします
- 修正をリリースする前に、問題が解消したかどうかの確認をお願いすることがあります
- 修正の内容は [CHANGELOG.md](https://github.com/securecat/live-regions-catcher/blob/main/CHANGELOG.md) に記載します

## 貢献者への期待

ここに挙げることは、人間の貢献者にもコーディングエージェントにも、同じように求めます。

UIを変更するときは、次を満たすように心がけてください。

- フォームにはネイティブの要素（`<input>`・`<select>`・`<textarea>`）を使う。`<div>` や `<span>` をボタンの代わりにしない。画面内の操作には `<button>`、ページの移動には `<a>` を使う
- `disabled` 属性を使わない
- フォーカスインジケーターを消さない（`outline: none` を使わない）
- リンクの下線を消さない
- テキストのコントラスト比は、本文で 7:1 以上、補足的なテキストで 4.5:1 以上にする。ライトテーマとダークテーマのそれぞれで満たす
- 境界線やアイコンなど、テキスト以外の要素も、隣り合う色に対して 3:1 以上にする
- コントラストが必要な要素に `opacity` を使わない
- 文字サイズは、日本語で 16px 以上、英語で 14px 以上にする
- `font-family` は `sans-serif` にする（`system-ui` は使わない）
- ステータスメッセージを自動で消さない
- 自動スクロールなど、ひとりでに動くものを作らない

変更したあとは、キーボードだけですべて操作できること、NVDA などのスクリーンリーダーで内容が正しく読み上げられることを確認してください。

コンテンツスクリプト（`src/content/`）を変更するときは、ページの DOM を書き換えないこと、ページのフォーカスを動かさないことを守ってください。`page-hooks.js` で包んだメソッドは、必ず元のメソッドを呼び、`this`・引数・戻り値・例外を変えないでください。サイドパネルを変更するときは、キャッチが届いてもフォーカスを動かさないこと、拡張機能自身のライブリージョンで新着を知らせないことを守ってください。

## 責任者と保守

この文書は、メンテナーの securecat が管理しています。機能を追加したときや、動作を確認した環境が変わったときに更新します。

## この文書へのフィードバック

この文書やアクセシビリティへの取り組み方についての提案も、[GitHub Issues](https://github.com/securecat/live-regions-catcher/issues) で受け付けています。
