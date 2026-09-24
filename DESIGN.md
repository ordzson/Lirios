---
name: Lirios
description: Floristería digital refinada para flores artesanales de limpiapipas en Quetzaltenango.
colors:
  wine: "#6c1326"
  wine-deep: "#641326"
  wine-action: "#741429"
  wine-pressed: "#5f0e21"
  petal: "#d99ca4"
  leaf: "#2f513e"
  cream: "#faf2eb"
  blush: "#e8d1cc"
  sand: "#d6bea9"
  charcoal: "#2d2427"
  night: "#261c1f"
  mauve-ink: "#513f42"
  muted-ink: "#75686a"
  rule: "#cdbeb4"
  cream-on-wine: "#fff5eb"
  parchment: "#f4e7dd"
typography:
  display:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: "clamp(3rem, 5.05vw, 5.3rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  wordmark:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: "clamp(2.75rem, 3.25vw, 3.4rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: "clamp(4rem, 7.4vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Bodoni Moda', serif"
    fontSize: "clamp(1.55rem, 2.2vw, 2.2rem)"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "1.12rem"
    fontWeight: 400
    lineHeight: 1.75
  nav:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "clamp(0.95rem, 1.005vw, 1.05rem)"
    fontWeight: 460
    lineHeight: 1
  label:
    fontFamily: "'Manrope Variable', sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  none: "0"
spacing:
  gutter-mobile: "1.25rem"
  gutter-desktop: "clamp(2rem, 8vw, 8rem)"
  section-block: "clamp(7rem, 11vw, 11rem)"
  section-block-mobile: "5.5rem"
  content-max: "96rem"
components:
  button-primary:
    backgroundColor: "{colors.wine-action}"
    textColor: "#fff8f3"
    rounded: "{rounded.none}"
    padding: "0.9rem clamp(1.4rem, 2vw, 2.1rem)"
    height: "clamp(3.6rem, 4.26vw, 4.45rem)"
  button-primary-hover:
    backgroundColor: "{colors.wine-pressed}"
    textColor: "#fff8f3"
  button-attached:
    backgroundColor: "{colors.wine-deep}"
    textColor: "{colors.cream-on-wine}"
    rounded: "{rounded.none}"
    padding: "0 1.8rem"
    height: "4.8rem"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.none}"
    height: "4.8rem"
  nav-link:
    textColor: "{colors.charcoal}"
    typography: "{typography.nav}"
  nav-link-hover:
    textColor: "{colors.wine}"
---

# Design System: Lirios

## Overview

**Creative North Star: "El escaparate sereno"**

Lirios reads like the window of a refined florist: calm matte cream, one real arrangement at decisive scale, and a single wine-colored invitation to step inside. The material carries the persuasion. The supplied product photographs show the chenille fibre, wrapping and handmade variation before any copy explains them. The interface stays out of the way, with a precise grid, square corners, hairline rules and generous quiet between passages.

The page is paced like a studio layout. A photographic opening gives way to an editorial catalogue on cream, then a full-bleed wine passage for single stems, a blush passage for personalised tiers, a quiet cream process list, a sand tracking panel, and a charcoal close. Density rises and falls inside one grammar. A high-contrast Didone speaks for the brand, and a sober grotesque does the operating.

The warmth is feminine without becoming decorative or childish. Wine, blush and petal pink sit against charcoal ink, the photography stays naturally lit, and nothing is rounded, glossy or illustrated.

**Key Characteristics:**
- Matte blush-cream ground (never yellow cream, never white).
- Photography of the real chenille material as the proof; no illustration, no CSS stand-ins.
- Didone display voice in wine; Manrope for everything operational.
- Square corners everywhere; depth from photography and tonal passages, not cards.
- One orchestrated opening motion ("coming into focus"), no scattered reveals.

## Colors

A warm, restrained palette: wine for voice and action, cream for the field, blush and sand as tonal passages, charcoal for reading.

### Primary
- **Florist Wine** (wine): the wordmark, the hero headline, text-link ink, the focus ring and text selection. It is the brand's voice.
- **Deep Wine Passage** (wine-deep): full-bleed section surfaces (single stems), section headlines on light passages, the attached submit button, and tier rules at 35% alpha.
- **Action Wine** (wine-action): the single primary call to action. It is slightly brighter than the voice wine so the action stands out from the headline above it.
- **Pressed Wine** (wine-pressed): hover state of the primary action.

### Secondary
- **Petal Pink** (petal): the wordmark's petal mark only. It is a small accent, never a surface.
- **Leaf Green** (leaf): the success state of order tracking. It is the only place green appears outside photography.

### Neutral
- **Matte Blush Cream** (cream): the page field, the header, the gaps in the category band, the mobile menu panel and the scrollbar track.
- **Blush Passage** (blush): surface of the personalisation section.
- **Sand Passage** (sand): surface of the tracking section.
- **Charcoal Ink** (charcoal): primary reading ink, nav links and product titles.
- **Night** (night): the footer surface. It closes the page.
- **Mauve Ink** (mauve-ink): secondary copy on sand and blush. Secondary ink is always tinted toward its surface (#5d4b4f on blush, #564a4c and #66595a on cream) rather than grey.
- **Muted Ink** (muted-ink): uppercase meta labels and the provisional-content note on cream (4.8:1).
- **Hairline Rule** (rule): 1px dividers in the process list.
- **Cream on Wine** (cream-on-wine) and **Parchment** (parchment): ink on wine and on night surfaces.

### Named Rules
**The Blush-Cream Rule.** The field is #faf2eb. A cream that drifts toward yellow (#f8f6e8 was measured and rejected against the comp) breaks the florist's temperature.

**The One Action Rule.** Action Wine fills exactly one control per viewport, the primary call to action. Every other link is wine ink on the ground, with an arrow.

## Typography

**Display Font:** Bodoni Moda (with serif fallback), self-hosted via @fontsource at weights 400 and 500.
**Body Font:** Manrope Variable (with sans-serif fallback), self-hosted.

**Character:** A high-contrast Didone gives the florist's voice, set tight at -0.035em. A calm humanist grotesque handles every label, control and paragraph.

### Hierarchy
- **Display** (500, clamp(3rem, 5.05vw, 5.3rem), 0.95): the hero headline only, set as two deliberate lines.
- **Wordmark** (500, clamp(2.75rem, 3.25vw, 3.4rem), 1): the provisional name in the header. It is set in type, so it survives the rename.
- **Headline** (400, clamp(4rem, 7.4vw, 6rem), 0.9–0.94): section headlines in wine, capped at 6rem. On mobile, clamp(2.6rem, 11.5vw, 4.4rem).
- **Title** (400, clamp(1.55rem, 2.2vw, 2.2rem) for products; clamp(2.2rem, 3vw, 3.2rem) for tiers): product and tier names.
- **Body** (400, 1.12rem, 1.7–1.75): paragraphs held to about 34–36ch in asides.
- **Nav / Control** (460–650, about 1rem): nav links, text links and buttons.
- **Label** (700, 0.78–0.82rem, 0.06–0.08em, uppercase): meta beside a heading (product type, tier number) and form labels.

### Named Rules
**The Serif Speaks, Sans Operates Rule.** Bodoni Moda never sets a control, a form or a label. Manrope never sets a headline.

**The Meta Beside, Never Above Rule.** An uppercase label sits on the heading's baseline as trailing meta (see "Tier 1" and "Arreglo listo"). It never sits above a heading as an eyebrow.

## Layout

The opening is a measured composition that keeps the approved comp's 1672:941 proportion (`height: min(100vh, 56.28vw)`, min 42rem). The header is 8.6% of the height, the hero is 63.2%, and the category band fills the rest. On desktop the real portrait photograph occupies the right half of the hero without competing with the headline on the left. The wordmark and headline align on a 9.1% left edge, and the nav starts at 46.4%, with gaps that scale in vw. Below the opening, sections use `clamp(2rem, 8vw, 8rem)` inline padding and `clamp(7rem, 11vw, 11rem)` block padding, with content capped at 96rem. The asymmetric two-column grids (1.5fr / 0.7fr and similar) put the headline on the wide side and the aside on the narrow side, aligned at the bottom.

Breakpoints:
- Below 68.75rem, the nav folds into a "Menú" disclosure and process steps collapse to two columns.
- Below 56.25rem, the page becomes a single column with 1.25rem gutters. The headline and action come first, then the bouquet photograph full-bleed at decisive scale (object-position 66%). The category band becomes a horizontal scroll-snap shelf with visible serif captions.

Rhythm: more space above a heading than below it. Dense passages (catalogue, tiers) alternate with quiet ones (stems, process).

## Elevation & Depth

The system is flat with tonal layering. Depth comes from photography and from alternating full-bleed passages (cream, wine, blush, sand, night), never from cards. Shadows are reserved for elements that float over photography or content.

### Shadow Vocabulary
- **Action lift** (`box-shadow: 0 0.7rem 1.5rem rgb(77 13 31 / 12%)`, hover `0 0.85rem 1.8rem rgb(77 13 31 / 18%)`): the primary action resting on the hero photograph.
- **Menu drop** (`box-shadow: 0 1.5rem 2.5rem rgb(45 36 39 / 10%)`): the unfolded mobile and tablet menu panel.

### Named Rules
**The No-Card Rule.** Content never sits in raised, rounded containers. Groups are separated by 1px rules or by a change of passage colour.

## Shapes

Square corners throughout (radius 0): buttons, fields, photographs and panels. Structure is drawn with 1px hairlines in wine at 35% alpha on blush, or in the rule colour on cream. Links carry a 1px bottom rule, and inputs are a single underline. The only organic shape is the petal mark beside the wordmark. Photographs are cropped with `object-fit: cover` to their grid boxes.

## Components

### Buttons
- **Shape:** square (0).
- **Primary:** Action Wine fill, #fff8f3 label in Manrope 560 at clamp(1.1rem, 1.44vw, 1.5rem). The label and the arrow are grouped and centered with a 1.2rem gap; the width is 17% of the viewport.
- **Hover / Focus:** Pressed Wine, a slightly deeper lift, and a 0.125rem rise over 180ms ease-out. Focus shows a 3px wine outline at 4px offset.
- **Attached submit:** Deep Wine block fused to the right of an underline field, with a label and arrow; the arrow slides 0.3rem on hover.

### Text links
- **Arrow link:** wine ink, Manrope 650, 1.4rem gap to a 1.5px-stroke arrow that slides 0.3rem on hover. On wine and blush passages it adds a 1px bottom rule.

### Inputs / Fields
- **Style:** transparent field with a 1px wine underline and a large grotesque value (clamp(1.5rem, 2.4vw, 2.2rem)). The placeholder is #5a4547 (≥4.5:1 on sand) and the caret is wine.
- **States:** a polite live message below the field, mauve at idle, leaf on success, wine on error. It arrives with a 260ms slide.

### Navigation
- **Desktop:** four Manrope links in charcoal; on hover they turn wine with a 0.45rem-offset underline.
- **Below 68.75rem:** a "Menú / Cerrar" toggle whose two strokes rotate into an X. The panel unfolds downward (clip-path, 320ms) with Bodoni links at 1.85rem, separated by hairlines. Escape closes it and returns focus to the toggle.

### Category shelf (signature)
Three real photographs directly under the hero, square-cornered with 0.875rem cream gaps. On desktop they are captionless links, and on hover the image scales to 1.025 over 520ms. On mobile they become a scroll-snap shelf with Bodoni captions. Tier 1 and tier 2 imagery lead the page; only one tier 3 image appears in the personalisation section.

### Tier columns
Three ruled columns on blush: one real example photograph, a Bodoni title with its "Tier N" meta on the same baseline, then one line of body. On mobile they stack, divided by horizontal rules.

### Opening motion (signature)
The shop window "comes into focus" once. The photograph resolves from blur(1.1rem) and scale(1.05) to sharp over 1500ms (cubic-bezier(0.16, 1, 0.3, 1)). The headline lines, the action and the three shelf tiles arrive through the same focus, staggered 260–900ms. The resting state is the visible default. Under reduced motion, everything swaps to short opacity fades.

## Do's and Don'ts

### Do:
- **Do** use #faf2eb as the field and move between full-bleed tonal passages (wine, blush, sand, night) to pace the page.
- **Do** let real photographs of the chenille material carry the proof, at decisive scale, cropped to square-cornered boxes.
- **Do** keep Action Wine to the one primary action; every secondary route is an arrow link.
- **Do** set uppercase meta labels beside their heading, never above it.
- **Do** tint secondary ink toward its surface's hue, and keep body and placeholder text at or above 4.5:1.
- **Do** mark every unconfirmed fact as a placeholder in the page's own words ("provisionales", "datos por confirmar").

### Don't:
- **Don't** round corners or put content in raised cards.
- **Don't** set controls or labels in Bodoni Moda, or headlines in Manrope.
- **Don't** drift the field toward yellow cream or pure white.
- **Don't** add scroll reveals section by section; the page has one opening motion.
- **Don't** invent prices, testimonials, delivery zones or contact data. (Temporary exception: catalog mock prices for layout, flagged in `catalog-products.ts` and `CATALOG_HANDOFF.md`; replace before launch.)
