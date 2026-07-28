# Evalora Typography

One ladder, nine rungs. Every piece of text in the product sits on one of them.

## Why this exists

The UI had drifted to ~790 font-size declarations across ~28 distinct sizes —
`text-[6.5px]` through `text-[60px]`, with `text-[11px]` (128 uses) and
`text-[10px]` (95 uses) doing most of the work. Two tables would use different
cell sizes; a card heading could render smaller than the label next to it. The
design tokens in `globals.css` had the same problem: `--text-h3` was 17px while
`--text-label` was 20px, so a "heading" was smaller than a form label.

## The ladder

These are the stock Tailwind rungs, so `text-h2` and `text-2xl` resolve to
identical metrics and the token and utility systems can be mixed freely.

| Utility | Token | Size / line-height | Use it for |
|---|---|---|---|
| `text-xs` | `text-micro` | **12 / 16** | Chips, badges, uppercase eyebrow labels, dense table meta, timestamps. **This is the floor.** |
| `text-sm` | `text-caption`, `text-label` | **14 / 20** | The default. Table cells, form values and labels, buttons, nav links, list rows, secondary copy. |
| `text-base` | `text-body` | **16 / 24** | Primary paragraph copy, card lead-ins, page intros. |
| `text-lg` | `text-h4`, `text-body-lg` | **18 / 28** | Small card and panel headings. |
| `text-xl` | `text-h3` | **20 / 28** | Section subheadings. |
| `text-2xl` | `text-h2` | **24 / 32** | Card and panel titles, medium stat numbers. |
| `text-3xl` | `text-h1` | **30 / 36** | Page titles, large stat numbers. |
| `text-4xl` | — | **36 / 40** | Hero sub-headline, XL stat numbers. |
| `text-5xl` | `text-display` | **48 / 1** | Landing hero headline. |

## Rules

1. **Never go below 12px.** If something feels like it needs 10px, the container
   is too small — fix the layout, not the type.
2. **Never use an arbitrary size.** `text-[13px]` and friends are how the drift
   started. If a rung feels wrong, the element's *role* is probably wrong.
3. **Pick by role, not by eye.** Two things that do the same job get the same
   rung. All table cells match. All card titles match.
4. **Don't fight the built-in line-height.** Each rung ships one. Only add an
   explicit `leading-*` when you want something deliberately tighter (multi-line
   headings → `leading-tight`) or when centring a single glyph in a fixed box
   (`leading-none`). A `leading-*` smaller than the rung's own value clips
   descenders.
5. **Cap body text at 16px.** Larger sizes are for headings and stat numerals.

## The one exception

`src/app/page.tsx` renders a *decorative miniature dashboard* inside the landing
hero — a fake, zoomed-out product screenshot. Its `text-[6.5px]` / `text-[7px]`
are intentional: they sell the illusion of a scaled-down screen. That block is
the only place in the repo allowed below 12px, and it is not real UI.

## Changing the scale

Edit the `@theme` block in `src/app/globals.css`. Keep the rungs aligned to
Tailwind's scale — if they diverge, `text-h2` and `text-2xl` stop matching and
the drift starts over.
