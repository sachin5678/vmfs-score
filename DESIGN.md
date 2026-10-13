# DESIGN.md

Direction file for the VMFS Score app. The owner answered the two open questions on 13 Oct 2026:

- **antislop mode:** DURING — the anti-slop filter runs while building, and the Delivery Gate still runs at the end.
- **Identity:** Market terminal, dark — a monitoring tool for a monitoring subject.

Dials: **ENERGY 2 · RHYTHM 2 · MOTION 1**. A tool someone opens monthly to read a number, not a page that performs.

## Reading

Research/monitoring dashboard for Indian index valuation. Audience: retail investors and analysts who already know what P/E means. The page's job is to let one person answer "which part of the market is expensive" in a few seconds, then defend that answer with evidence.

## Palette, and why it is this narrow

Every hue in this app belongs to one sequential valuation heat ramp, because **colour here is data, not decoration**. Chrome stays neutral so the only colour on screen is a reading.

| Token | Dark (default) | Light | Source |
| --- | --- | --- | --- |
| page | `#000000` | `#F5F5F5` | Neon bg / Polymarket bgSoft |
| panel | `#0E1010` | `#FFFFFF` | interpolated above page / Polymarket bg |
| raise (fills, hover) | `#262828` | `#EFEFEF` | Neon bgSoft |
| ink | `#FFFFFF` | `#000000` | Neon / Polymarket |
| ink-soft | `#94979E` | `#666666` | Neon / Polymarket |
| muted | `#797D86` | `#6E6E6E` | Neon (light darkened to hold 4.5:1) |
| line | `rgba(255,255,255,.1)` | `rgba(0,0,0,.1)` | Neon border token |

Heat ramp (8 steps, one system, meaning carried by legend and swatch — never by text colour alone):
`#12864F` → `#2FA360` → `#7CB342` → `#C7C44B` → `#E8B23A` → `#E58A2E` → `#DB5B33` → `#C9382C`.

Rules written during the build:

- No chroma accent for buttons, links or focus. Focus is a 2px ink outline. Reason: a purple or green accent would either read as the AI default (purple on black) or collide with the heat semantics (green = cheap).
- Trailing and forward returns are never coloured. A minus sign carries the sign. Reason: green/red must mean one thing only — cheap/expensive.
- Dark is the default with a stated reason: this is a monitoring tool, read repeatedly, often at night. A working light mode ships in the same commit (grounded in Polymarket's own tokens).

## Typography

- **Barlow Condensed 600** — score numerals, section headings, wordmark. Reason: condensed grotesque is the vernacular of exchange display boards, and it lets a 3-digit score read huge without eating column width.
- **Inter 400/500/600** — body and UI, following Neon's own type rule (Inter for body, Geist Mono for technical labels; mono dropped here so the app stays at two families).
- `font-variant-numeric: tabular-nums` on every figure in tables and readouts.
- No all-caps eyebrows, no extreme letter-spacing.

## Layout

1280px container, 680px measure for prose, 8px spacing rhythm, radius 4 (controls) / 8 (panels), 1px hairlines instead of shadows (one shadow, on the chart tooltip, where it floats over data).

The page alternates composition, not background colour:

1. **Focal** — asymmetric 5/7 split: giant score readout left, the six-index rail right.
2. **History** — full-bleed chart, zone bands behind the line, legend under it.
3. **Evidence** — 7/5 split: zone backtest table beside the claim verdict.
4. **Monthly** — full-width dense table, sticky header, internal scroll.
5. **Method** — narrow single column.

## Motif

The heat rail: bar length is the score, colour is the zone, hairline guides at 200/400/600/800 with a stronger dashed line at 400 (the fairly valued boundary from the video). It appears twice — as the index rail and as the chart's bands — and nowhere else.

## Motion

`cubic-bezier(0.4,0,0.2,1)` at 150–200ms. Hover, focus and selection states only; no entrance animations, no scroll reveals, no loops. `prefers-reduced-motion` collapses all of it.

## Prohibitions

No gradient hero, no purple/blue glow, no neon accent, no emoji, no icon set, no pill-shaped chips for ordinary actions, no centred hero with two buttons, no decorative background grids, no colour used for anything that is not a valuation reading.
