# Mimi visual identity

This document is the source of truth for how Mimi looks and feels. Both the web
PWA and the browser extension must share this identity. The tokens below live in
`web/public/style.css` today and move to `shared/styles/tokens.css` during the
extension's shared-core extraction; treat this document as the human-readable
companion to that file.

## Voice and feeling

Mimi should feel like a **calm, warm utility** — a friendly companion, not a
security dashboard. Avoid alarm colors, lock iconography, jargon, and scores.
Microcopy is short, encouraging, and plainspoken ("A little password magic,
wherever you sign in.", "Ready when you are", "made to travel lightly").

Guidelines:
- Reassure without lecturing. State what Mimi does, not what could go wrong.
- Never show an entropy score for a single password; use descriptive guidance
  ("Recommended", "Good", "Shorter than recommended").
- Prefer verbs and everyday nouns ("App or device", "Your secret", "Make my
  password").

## Color palette

Light theme is the base. Dark theme redefines the same token names. Never give a
color a single definition that only exists in one theme.

### Core tokens

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--ink` | `#302a35` | `#f2ebf2` | Primary text |
| `--muted` | `#786f7c` | `#b8aebb` | Secondary text, captions |
| `--plum` | `#5f516e` | `#c2a9d0` | Primary brand / actions |
| `--plum-dark` | `#493d58` | `#dfd0e6` | Hover / emphasis |
| `--lavender` | `#e8deef` | `#3d3345` | Tinted fills, selected states |
| `--cream` | `#fffdf8` | `#29232d` | Raised surfaces |
| `--line` | `#ded7d2` | `#4b424f` | Borders, dividers |
| `--peach` | `#f2cbbd` | `#684a45` | Warm accent (tips, ambient glow) |

Page background is `#f2eee8` (light) / `#1d1921` (dark) with two soft radial
glows — peach at top-left, sage-green at bottom-right — at low opacity.

### Semantic / status colors

These are used directly (not yet tokenized). Keep them consistent across clients.

| Meaning | Light | Dark |
| --- | --- | --- |
| Success | `#52765c` | `#9bc7a4` |
| Error | `#a44747` | `#ef9999` |
| Warning ("Good") | `#8b6c35` | `#e1c17e` |
| Eyebrow / warm label | `#9a6b5d` | `#d9a293` |
| Offline dot | `#d18b7c` | — |

Panels in dark mode use `rgba(41, 35, 45, …)` surfaces with
`rgba(194, 169, 208, …)` borders rather than the raw tokens, to sit correctly on
the dark ground.

## Typography

| Use | Stack | Weight |
| --- | --- | --- |
| Display / headings (`h1`, `h2`, brand) | `Georgia, serif` | 700 |
| Body / UI | `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` | 400–800 |
| Password output | `ui-monospace, SFMono-Regular, Menlo, monospace` | 750 |

Headings are serif with tight tracking (`letter-spacing: -0.025em` to `-0.04em`).
Eyebrows are `0.68rem`, uppercase, `letter-spacing: 0.12em`, weight 800, in the
warm label color. Labels are `~0.76rem`, weight ~750. Inter is a progressive
enhancement over the system sans fallback; do not block on a web font.

## Shape, spacing, elevation

- **Radii:** inputs/small controls `10–11px`; panels `24px`; profile panel and
  dialog `18–24px`; pills and QR chips `999px`; QR card `16px`.
- **The brand mark** is a `46px` rounded square (`15px` radius), plum background,
  white italic serif lowercase "m".
- **Elevation** is soft and low-contrast: e.g. panels
  `0 18px 55px rgba(65, 53, 73, 0.09)`; buttons
  `0 10px 22px rgba(73, 61, 88, 0.22)`. No hard shadows.
- **Rhythm** is compact: gaps of `0.4–0.9rem`, panel padding `1–1.25rem`.
- **Min touch target** `≥ 34–42px` tall for interactive controls.

## Components

- **Primary button** (`.generate-button`, `.compact-actions button`): solid plum
  fill, white text, weight 800, rounded. Hover → `--plum-dark`.
- **Quiet button**: transparent fill, plum text, plum border.
- **Transfer button** (QR / file pills): `999px` radius, `--line` border, muted
  text on a translucent cream fill; hover tints lavender with plum text.
- **Panels** (`.panel`): translucent cream, hairline border, soft shadow, `24px`
  radius. The result panel is sticky on wide screens with a lavender→cream
  gradient wash.
- **Inputs**: white (light) / `#211c25` (dark) fill, `--line` border; focus adds
  a `3px` lavender ring (`rgba(155, 136, 172, 0.16)`) and a `#9b88ac` border.
- **Selected radio card** (`.length-modes label:has(:checked)`): `#9b88ac`
  border, lavender-tinted fill.
- **Status text**: `data-type` drives color — `info` muted, `success` green,
  `error` red. Use `aria-live="polite"` for async feedback.
- **Strength / length guidance badge**: pill with `data-level`
  (`recommended` / `good` / `short` / `compatibility`) mapping to the semantic
  colors above.

## Iconography

- Use **inline SVG icons**, not emoji, for controls (e.g. the sun/moon theme
  toggle). Stroke style: `currentColor`, `stroke-width: 2`, round caps and
  joins, `24`-unit viewBox, rendered around `18px`.
- Decorative sparkles (`✦`) and ambient glyphs may remain as text flourishes,
  but functional controls get real icons.
- The app icon / brand mark is the italic serif "m" on plum.

## Theming rules

- The theme follows the system preference on first load, then remembers an
  explicit choice in local storage (`mimi.theme.v1` in the PWA; extension-local
  storage in the extension).
- `data-theme="light|dark"` on the root element drives all theme-specific CSS.
- The `theme-color` meta (PWA) is `#5f516e` light / `#1d1921` dark.
- QR codes are always rendered **dark-on-light regardless of theme** so they stay
  scannable.

## Responsive behavior

- Wide screens use a two-column workspace (generator + sticky result). Below
  `840px` it collapses to a single column with the result below the form.
- Below `560px`, tighten padding, drop the tagline, and stack the profile
  controls. Below `350px`, single-column form fields.
- Honor `prefers-reduced-motion`: disable transitions and smooth scrolling.

## Extension-specific application

The extension popup reuses every token, the type stack, the component styles,
and the voice. Differences are layout only, not identity:

- The popup is always single-column (design target ~`380px` wide).
- Omit PWA-only chrome (install button, connectivity indicator).
- Recovery-sensitive profile actions (create/import/QR/file) live on the
  full-page options document, styled with the same panels and tokens.
