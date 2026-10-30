# Accessibility audit: respondent filler

**Audit date:** 2026-10-30. **Standard:** WCAG 2.1 AA, plus the A and AA criteria new in 2.2. **Result:** partially conformant.

**Scope:** the public respondent surface: `app/form/**`, `components/forms/filler/**`, `components/forms/fields/**`, `components/forms/form-field-renderer.jsx`, `components/forms/form-filler-content.jsx`, `public/embed.js`, `lib/forms/theme.js`. The workspace, builder (apart from one new setting) and host pages are out of scope.

**Method:** a static code review, criterion by criterion. Nothing was run in a browser or a screen reader and no build was run, so even **Fixed** means "the code now does the right thing as far as reading it can show". The manual plan below is what turns these into evidence. Contrast is the exception: `lib/forms/theme.test.mjs` computes it for all 4,096 three-digit hex accents in each mode.

| Status | Meaning |
|---|---|
| **Pass** | No defect found in the code. Still subject to the manual plan. |
| **Fixed** | A real defect was found and fixed in this audit. |
| **Needs manual test** | The code can't settle it: it depends on rendering, assistive technology, a third party or owner content. |
| **Fails** | A known failure remains. |

## Summary

| Status | WCAG 2.1 A/AA (50) | New in 2.2 A/AA (6) | Total (56) |
|---|---:|---:|---:|
| Pass | 22 | 3 | 25 |
| Fixed | 19 | 2 | 21 |
| Needs manual test | 6 | 1 | 7 |
| Fails | 3 | 0 | 3 |

## WCAG 2.1 A and AA

### 1. Perceivable

| Criterion | Status | Evidence |
|---|---|---|
| 1.1.1 Non-text Content (A) | Fixed | The welcome screen's bare question count had no meaning without its icon; it now has text (`components/forms/filler/welcome-screen.jsx:36`). Image alt comes from the builder (`components/forms/fields/content-blocks.jsx:50`, `components/forms/builder/type-settings.jsx:206`), picture options likewise (`components/forms/fields/picture-choice.jsx:30`). New video title setting (`components/forms/builder/type-settings.jsx:223`, used at `content-blocks.jsx:60`). Signature canvas names its state (`components/forms/fields/signature-field.jsx:167`). The captcha is tracked under 3.3.8. |
| 1.2.1 Audio-only and Video-only (A) | Needs manual test | Owner content. A text alternative can only go in the block's caption (`content-blocks.jsx`). |
| 1.2.2 Captions, Prerecorded (A) | Fails | A direct `.mp4`/`.webm` renders a bare `<video>` with no way to supply a `<track>` (`content-blocks.jsx:76`). YouTube and Vimeo depend on the owner. The builder hint now asks for captioned video (`type-settings.jsx:223`) but that doesn't fix it. |
| 1.2.3 Audio Description or Media Alternative (A) | Needs manual test | Owner content; a transcript could go in the caption. |
| 1.2.4 Captions, Live (AA) | Pass | No live media feature. |
| 1.2.5 Audio Description, Prerecorded (AA) | Fails | Same cause as 1.2.2: direct files have no track support (`content-blocks.jsx:76`). |
| 1.3.1 Info and Relationships (A) | Fixed | Matrix rows were `<tr role="radiogroup">`, which destroyed the table's row semantics; now `role="row"` (`components/forms/fields/survey-fields.jsx:249`). Composite fields were nested groups naming the same thing twice; now one fieldset (`components/forms/fields/field-shell.jsx:110`) or one radiogroup (`components/forms/form-field-renderer.jsx:22`). Fieldsets carry hint, note and error (`field-shell.jsx:110`). Group `aria-required` on invalid roles removed. Page titles are headings (`components/forms/filler/progress.jsx:27`). Conversational mode had no `h1` (`components/forms/filler/conversational-view.jsx:127`). `h3`s with no parent `h2` promoted (`components/forms/fields/commerce-fields.jsx:141`, `components/forms/filler/submit-extras.jsx:96`). Scale end labels now describe their group (`survey-fields.jsx:87`). |
| 1.3.2 Meaningful Sequence (A) | Pass | DOM order matches visual order; RTL uses `dir` (`components/forms/filler/filler-shell.jsx:58`). |
| 1.3.3 Sensory Characteristics (A) | Pass | Instructions don't rely on shape or position. "Drag or use the arrows" names the buttons too. |
| 1.3.4 Orientation (AA) | Pass | No orientation lock. |
| 1.3.5 Identify Input Purpose (AA) | Fixed | Email, tel, url, name and address parts were already tokenised (`components/forms/fields/basic-inputs.jsx:66`, `components/forms/fields/contact-fields.jsx:47`, `:61`). Short-text inference now also covers email, phone and address titles, and date of birth (`lib/forms/field-types.js:172`, `:180`). Gaps: dropdowns take no token, and inference depends on the owner's title wording; the builder's setting is the override. |
| 1.4.1 Use of Color (A) | Pass | Errors are text; required uses an asterisk with a legend (`components/forms/filler/classic-view.jsx:92`); selected states add a thicker border, check or fill. |
| 1.4.2 Audio Control (A) | Pass | Nothing autoplays (`content-blocks.jsx:76`). |
| 1.4.3 Contrast, Minimum (AA) | Fixed | Dark `--text-secondary` #737373 (3.4:1 to 3.7:1) and `--text-tertiary` #525252 (2.2:1) failed, as did `contrastText`, which put white on any accent below 0.42 luminance (#3b82f6: 3.68:1). Tokens at `lib/forms/theme.js:33`, `:63`; picker at `:133`, `:146`; auto mode at `app/globals.css:209`, `:217`; tested in `lib/forms/theme.test.mjs`. Failing Tailwind colours replaced: `red-500`, `emerald-600`, `amber-600`, `zinc-400` on light surfaces. Forced-light forms in a dark app picked up `dark:` colours; fixed at `app/globals.css:7`. Heavier image scrim for conversational (`theme.js:197`). **Not computed:** classic banners over a cover image and transparent inline embeds on host pages; both are in the manual plan. |
| 1.4.4 Resize Text (AA) | Needs manual test | Rem-based Tailwind, no viewport-locked type; needs 200% zoom. |
| 1.4.5 Images of Text (AA) | Pass | None in the filler chrome. Typed signature previews are real text; its stored PNG isn't shown to respondents as content. |
| 1.4.10 Reflow (AA) | Needs manual test | Concrete fixes: truncated labels now wrap (`commerce-fields.jsx`, `components/forms/fields/file-field.jsx`, `submit-extras.jsx`, `conversational-view.jsx`), pager wraps (`classic-view.jsx:125`), sticky header unsticks on short viewports (`filler-shell.jsx:84`). The signature canvas keeps its load-time width (`components/forms/fields/signature-field.jsx:69`), so zooming afterwards may clip it. Matrix at wide widths scrolls horizontally, allowed as tabular data. |
| 1.4.11 Non-text Contrast (AA) | Fixed | Input and control borders were about 1.2:1 to 1.5:1; now 3:1 (`theme.js:33`, `app/globals.css:209`, `components/forms/fields/basic-inputs.jsx:49`). Empty rating stars and radio rings use the stronger token; filled stars have a darker stroke (`survey-fields.jsx:59`). Accents hold 3:1 on all surfaces (`theme.js:146`). Focus ring was a translucent token, about 1.3:1 in dark (`app/globals.css:228`). |
| 1.4.12 Text Spacing (AA) | Needs manual test | Fixed-height buttons (`h-9`, `h-10`, `h-14`, from `@geiger/ui` and the header) may clip with overridden spacing. |
| 1.4.13 Content on Hover or Focus (AA) | Fixed | The info tip was a Radix tooltip that doesn't open on tap, so touch users couldn't read it. It's now a click popover, dismissable with Escape (`field-shell.jsx:60`). |

### 2. Operable

| Criterion | Status | Evidence |
|---|---|---|
| 2.1.1 Keyboard (A) | Fixed | Ranking has move buttons and Alt+Arrow, which previously did nothing on the matching button, and keeps focus after a move (`components/forms/fields/choice-fields.jsx:170`, `:185`). Signature has **Type instead** (`signature-field.jsx:235`). Booking slots claimed `role="radio"` without arrow keys, now roving (`components/forms/fields/booking-field.jsx:61`). The file button and its hidden input were two tab stops, one invisible (`file-field.jsx:112`, `:134`). Calendar keyboard use comes from `react-day-picker`; see the manual plan. |
| 2.1.2 No Keyboard Trap (A) | Pass | Radix traps are escapable; embed guards send focus round the dialog, and Escape closes it (`public/embed.js:197`, `:198`, `:476`). Tabbing out of a cross-origin iframe needs a real test. |
| 2.1.4 Character Key Shortcuts (A) | Fixed | A to Z shortcuts were global on `window`. They now fire only with focus inside the question (`conversational-view.jsx:92`) and can be turned off with a saved switch (`conversational-view.jsx:20`, `:196`). |
| 2.2.1 Timing Adjustable (A) | Fails | `data-auto-close` closes the dialog on a timer with no way to extend (`public/embed.js:226`). Off by default, owner-set. Everything else passes: min-review delays submit rather than limiting it, and is announced (`components/forms/filler/form-runner.jsx:85`, `:543`, `:710`). Edit links show their expiry (`form-runner.jsx:765`). The post-submit redirect went from 1.2s to 3s with a link to go now (`form-runner.jsx:401`, `components/forms/filler/thank-you.jsx:186`). |
| 2.2.2 Pause, Stop, Hide (A) | Pass | Only loaders move, and they end when loading does. Reduced motion stops them (`app/globals.css:245`). |
| 2.3.1 Three Flashes or Below Threshold (A) | Pass | `LogoLoading` has flash-named variants ("Sequential strobe", "Warning flash") in `@geiger/ui`, but at 96px at most it is far below the general flash threshold's area. Timing not measured. |
| 2.4.1 Bypass Blocks (A) | Pass | The header has no links to repeat; `main` and `footer` landmarks exist (`filler-shell.jsx:65`, `:66`). |
| 2.4.2 Page Titled (A) | Fixed | Server metadata was right (`app/form/[formId]/page.js`), but forms the client fetched itself stayed on "Form" (`components/forms/form-filler-content.jsx:73`). Embeds now name their iframe after the form (`public/embed.js:466`, `components/forms/filler/use-embed-bridge.js:35`). |
| 2.4.3 Focus Order (A) | Fixed | `focusField` tried to focus a `<span>` on every group type, so focus went nowhere (`form-runner.jsx:50`). Focus was also lost on page change (`classic-view.jsx:67`), on submit (`thank-you.jsx:169`), on a failed submit (`form-runner.jsx:63`), on removing a file or repeater entry (`file-field.jsx:56`, `components/forms/fields/repeater-field.jsx:50`) and when a coupon applied (`commerce-fields.jsx:124`). |
| 2.4.4 Link Purpose (A) | Pass | Links state their purpose; the new tab is announced (`filler-shell.jsx:111`). |
| 2.4.5 Multiple Ways (AA) | Pass | A form is a process, which is exempt. |
| 2.4.6 Headings and Labels (AA) | Pass | Labels come from the owner; chrome labels are descriptive. The ranking "OK" button gained a fuller name (`choice-fields.jsx:254`). |
| 2.4.7 Focus Visible (AA) | Fixed | Translucent rings were replaced by a solid outline (`app/globals.css:228`); hidden radios light up their card (`field-shell.jsx:48`). |
| 2.5.1 Pointer Gestures (A) | Pass | Only the signature drawing is path-based, and it has a typed alternative. |
| 2.5.2 Pointer Cancellation (A) | Pass | Buttons use click. Drawing a signature can be cleared. |
| 2.5.3 Label in Name (A) | Pass | Accessible names start with the visible text, for example `file-field.jsx:112` and `choice-fields.jsx:254`. |
| 2.5.4 Motion Actuation (A) | Pass | None. |

### 3. Understandable

| Criterion | Status | Evidence |
|---|---|---|
| 3.1.1 Language of Page (A) | Fixed | `<html lang="en">` was fixed in the root layout, so an Arabic form's page language was English. It's now set on load, with direction (`filler-shell.jsx:24`). **Caveat:** the server's first HTML still says `en` until hydration. |
| 3.1.2 Language of Parts (AA) | Fixed | The filler root had `lang` (`filler-shell.jsx:58`), but English built-in errors sat inside it unmarked. They're now tagged (`field-shell.jsx:81`, `form-field-renderer.jsx:94`, `lib/forms/a11y.js`). |
| 3.2.1 On Focus (A) | Pass | Focus alone triggers nothing. |
| 3.2.2 On Input (A) | Fixed | Choosing an option auto-advances with no warning. It now says so before the respondent chooses (`conversational-view.jsx:161`). Arrow-key moves still only select. Logic can also reveal fields as you answer; those appear later in the DOM and aren't announced. |
| 3.2.3 Consistent Navigation (AA) | Pass | One pager layout per mode. |
| 3.2.4 Consistent Identification (AA) | Pass | Controls share one label set (`lib/forms/i18n.js`). |
| 3.3.1 Error Identification (A) | Fixed | Added an error summary with links that takes focus (`components/forms/filler/banners.jsx:36`, `form-runner.jsx:482`, `:488`, `classic-view.jsx:82`). Conversational mode focuses the field and announces the error. Extras now report too (`form-runner.jsx:468`). **Limitation:** repeater errors don't name the entry, since the message comes from `lib/forms/logic.js`. |
| 3.3.2 Labels or Instructions (A) | Fixed | The `*` legend was hidden on phones and on multi-page or save-and-resume forms; now always shown (`classic-view.jsx:92`, `conversational-view.jsx:158`). The typed-signature input had only a placeholder (`signature-field.jsx:190`). Selection limits are tied to their group (`field-shell.jsx:110`). |
| 3.3.3 Error Suggestion (AA) | Fixed | Messages say what to do, and now reach every field by link and description. **Limitation:** built-in messages are English-only on translated forms (`lib/forms/logic.js`, `validateField`). |
| 3.3.4 Error Prevention, Legal and Financial (AA) | Needs manual test | Input is validated and payments confirm at Stripe, but there's no review step. Whether a form is covered depends on its purpose and the owner's edit window. |

### 4. Robust

| Criterion | Status | Evidence |
|---|---|---|
| 4.1.1 Parsing (A) | Pass | Removed from WCAG 2.2. IDs are derived per field (`field-shell.jsx:12`); the two matrix layouts use distinct IDs. |
| 4.1.2 Name, Role, Value (A) | Fixed | Fixes under 1.3.1 and 2.1.1, plus: `aria-required` now only on parts the validator needs (`contact-fields.jsx:35`); `aria-invalid` on checkbox and matrix controls; the file control's name includes its question (`file-field.jsx:112`); `aria-valuenow` restored on upload progress, dropped by `@geiger/ui` (`file-field.jsx:168`); stepper buttons name their product (`commerce-fields.jsx:85`). |
| 4.1.3 Status Messages (AA) | Fixed | Added one always-mounted live region (`banners.jsx:19`, `:26`, `form-runner.jsx:817`) for position (`:703`), errors, first save (`:316`), offline and queue (`:713`), and review lock (`:710`). Local ones for ranking (`choice-fields.jsx:164`), slots (`booking-field.jsx:82`, `:152`), uploads (`file-field.jsx:85`, `:174`), repeater (`repeater-field.jsx:58`) and order total (`commerce-fields.jsx:229`). The calculated field's `<output>` was already live (`commerce-fields.jsx:31`). The old `aria-live` on the conversational container was remounted per step, so was unreliable, and is gone. Actual announcements need a screen reader. |

## New in WCAG 2.2 (A and AA)

| Criterion | Status | Evidence |
|---|---|---|
| 2.4.11 Focus Not Obscured, Minimum (AA) | Fixed | Tabbing backwards could hide a control under the sticky header (`app/globals.css:241`, `filler-shell.jsx:84`). |
| 2.5.7 Dragging Movements (AA) | Pass | Ranking has buttons (`choice-fields.jsx:228`), signature has typing (`signature-field.jsx:235`), file drop has a button. |
| 2.5.8 Target Size, Minimum (AA) | Fixed | Info button was 20px (`field-shell.jsx:60`); matrix radios were 16px, now with a 28px hit area (`survey-fields.jsx:257`); policy and consent links were one text line high (`choice-fields.jsx:137`, `submit-extras.jsx`); footer links (`filler-shell.jsx:111`). Passes by the spacing exception only: the 20px-tall `@geiger/ui` switch. |
| 3.2.6 Consistent Help (A) | Pass | The filler has no help mechanism; the statement link stays in the same footer spot (`filler-shell.jsx:121`). |
| 3.3.7 Redundant Entry (A) | Pass | Answers persist across pages and Back, and nothing asks twice. Owner-authored duplicates can't be checked. |
| 3.3.8 Accessible Authentication, Minimum (AA) | Needs manual test | The password gate allows paste and password managers (`components/forms/filler/gates.jsx:28`). Turnstile is third-party and usually non-interactive, with no alternative route. A failed load is now reported with a retry (`submit-extras.jsx:212`, `:215`), but must not be bypassable on the server. |

## The 39 field types

The registry (`lib/forms/field-types.js`) has 39 types. Input types are named by `FieldShell` unless noted.

| Types | How they're named and grouped |
|---|---|
| text, textarea, email, phone, url, number, currency, date, time, datetime, dropdown | `<label for>`; currency code exposed to screen readers (`basic-inputs.jsx:96`) |
| select, picture, rating, scale, nps, opinion | One radiogroup labelled by the question |
| multiselect, multipicture, ranking, matrix, name, address, booking, repeater, signature | One fieldset labelled by the question |
| checkbox, consent, product | The control's own label holds the statement or product |
| file | Button named by its text and the question |
| calculated, total | Live `<output>` and live total |
| heading, statement, content, image, video | Headings, paragraphs, `alt`, named players |
| hidden, page | Not rendered |

## Embed (`public/embed.js`)

| Check | Result |
|---|---|
| `aria-modal`, role, name | Present (`:185`); name now follows the form (`:466`) |
| Focus trap | Guards (`:197`, `:198`) |
| Escape | Host (`:476`) and from inside the iframe (`use-embed-bridge.js:55`) |
| Focus return | `:263` |
| Iframe title | `:124`, replaced by the form's title when none is set |
| Close button | Was blend-mode white with no contrast guarantee; now solid (`:103`) |
| Launcher colour | Text colour used a brightness formula; now WCAG luminance (`:132`) |
| Reduced motion | `:108` |

## Remaining failures

1. **1.2.2 and 1.2.5:** direct video files can't carry tracks. Needs a captions upload in the builder and `<track>` in the player, or dropping direct files. This is a product decision.
2. **2.2.1:** `data-auto-close`. Needs a decision: remove it, or replace the timer with a visible "Closing in N, keep open" control.

## Known gaps that aren't outright failures

- Built-in validation errors are English-only (`lib/forms/logic.js`), and the server reuses them, so they need a code-based design.
- Repeater errors don't name their entry.
- `<html lang>` is only right after hydration; a route-level root layout would be needed for server HTML.
- `DatePicker` month and day labels aren't localised, as no date-fns locale is passed.
- Letter badges stay visible when shortcuts are off.
- `~N min` on the welcome screen is hard-coded English.
- The signature canvas doesn't resize.

## `@geiger/ui` defects to fix upstream

| Component | Defect |
|---|---|
| `progress.jsx` | Drops `value`, so Radix never sets `aria-valuenow`. Worked around at `file-field.jsx:168`. |
| `button`, `input`, `radio-group` | Focus uses `ring-ring/50`. Under 3:1 with most tokens. Overridden for the filler only (`app/globals.css:228`). |
| `checkbox`, `switch` | Focus uses `ring-border-strong`. Under 3:1 at default token values. |
| `select.jsx`, `textarea.jsx` | Focus uses `ring-border`, close to invisible; rest border is `border-border`, about 1.2:1. |
| `radio-group.jsx` | Rest border `border-border`, about 1.2:1. Overridden per use. |
| `switch.jsx` | 20px tall: under 24px, passes 2.5.8 only by spacing. |
| `logo-loading` | No `prefers-reduced-motion` handling of its own; the filler stops it globally. |
| `footer.jsx` | Many `href="#"` links, on the statement page too. They go nowhere. |
| `tokens` | Suite dark `--text-secondary` #737373 and `--text-tertiary` #525252 fail 4.5:1 everywhere they're used. Only the filler is fixed. |

## Manual test plan

Test on a seeded form holding every field type, in classic and conversational layouts, light, dark and auto, with one failing accent (#ffff00). Record results here, then update the statement.

### Keyboard only (Chrome and Firefox)

1. Tab through each type. Focus must always be visible, and the order logical.
2. Ranking: reorder with the buttons and Alt+Up/Down. Focus stays on the moved item, including at the ends.
3. Signature: sign using Type instead.
4. Booking: reach a date in the calendar, then choose a slot with the arrow keys.
5. File: open the picker with Enter or Space. Reach the limit and confirm focus lands on the list.
6. Repeater: add and remove entries and watch focus.
7. Submit empty. Focus lands on the error summary. Each link reaches its field, across pages.
8. Conversational: A to Z work with focus in the question and not in the footer. Turn them off, reload, confirm they stay off.
9. Embed: run popup, slider, fullscreen and popover modes. Tab cycles through the dialog, Escape closes from inside the iframe, and focus returns to the launcher.
10. Tab backwards on a long form. Nothing lands under the sticky header.

### NVDA with Firefox and Chrome (Windows)

1. Each type announces name, role, required state and hint.
2. Matrix: table navigation announces row and column; radios announce both.
3. Scale and NPS: end labels are read as the description.
4. Trigger an error and check the summary is read once, not repeated per field.
5. Listen for: step change, first autosave, offline (disconnect the network), queued, upload done, slots loaded, ranking move, total change, submit success.
6. In focus mode on a choice step, confirm shortcuts behave and don't conflict.
7. Does auto-advance fire on an NVDA activation? The code ignores clicks with `detail === 0`; verify.
8. Check Turnstile: does it pass, and can its failure state be reached and retried?
9. Spanish and Arabic forms: `lang` switches voice, and English errors are read in English.

### VoiceOver with Safari (macOS and iOS)

1. Repeat NVDA steps 1 to 5.
2. Confirm `role="row"` on a Radix group keeps table navigation. This is the riskiest change in the audit.
3. iOS: the info popover opens on double tap; picture options select.
4. iOS: the signature pad doesn't trap the rotor; Type instead is reachable.

### 320px width (or 1280px at 400% zoom)

1. No horizontal page scroll on any type or status screen.
2. Long labels, file names and policy titles wrap and aren't cut off.
3. NPS, opinion at 7 steps, and picture grids stay at 24px or larger.
4. Signature: load, then zoom. Is the pad clipped?
5. Popover and slider embeds fit, and the close button stays reachable.

### 200% zoom and text spacing

1. Browser zoom 200%: nothing clipped or overlapping.
2. Apply the WCAG 1.4.12 spacing bookmarklet. Check fixed-height buttons, the stepper and the sticky header.
3. Set Chrome's text-only size to very large, and check `text-[11px]` px-sized text.

### Contrast and modes

1. Check text on cover images in both layouts and both modes, using one white and one black image.
2. Check banners over a cover image in classic.
3. Check a transparent inline embed on a dark host and a light host. Decide whether `solid` should be the default.
4. Windows High Contrast (forced colors): selected states and focus remain visible.
5. Reduced motion on: no slides, and loaders still show something.
6. Forced-light form with the OS in dark mode, and forced-dark with the OS in light: colours follow the form, including in the save dialog.
