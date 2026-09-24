disposition: fix

Substitution: the harness declined the subagent spawn, so this review ran in-thread from reference/degraded/finish-reviewer.md.
Unread: hero diff heatmap and region crops other than headline, primary-action, and the two category photos (final diff).

## persistence

pass. PRODUCT.md present. state.json: comps (3 comps, A approved), spec, plates (4/4), hero (0.7957 ≥ 0.72, no forced record), sections, motion and responsive (desktop 76%) are closed; review is open. The comp approval is recorded in `.impeccable/questions/81d843ea.answer.json` and in the surface brief. hero-repro.png exists. DESIGN.md is absent because this is a new world, so it is not a finding.

## fidelity

| Element | Verdict | Evidence |
|---|---|---|
| Header strip, wordmark position, petal mark | match | Final diff: header-ground 89%, petal 88% |
| Wordmark lettering | contradicted (TYPE) | The comp is condensed and medium weight (spec). The build uses static Bodoni Moda 400 at text optical size, which sets wider and softer. |
| Four nav items, charcoal ink | match / acceptable drift | 69–80%. The paired crops show the same colour; the old `nav-custom` reading came from a coarse crop. |
| Hero photograph and bouquet at decisive scale | match | Plate 78% at 1440. The printed seal is omitted as a cited adaptation: the surface brief's FIRST VIEWPORT says not to literalize it. |
| **TYPE**: headline lettering | contradicted | Crop is 58%. The comp's Didone is condensed, with heavy stems and razor hairlines, and cap height is 68px at 1672. The build uses static Bodoni Moda 400 (text optical size), which sets wider, has less contrast, and caps at about 59px. |
| Primary action | drift → contradicted in treatment | The comp's label is about 11% larger and its arrow sits close to the label, grouped. The build pushes the arrow to the far edge (`space-between`). |
| Category band (3 photos) | acceptable adaptation | Scored "contradicted" at 56–59%, but the crops show the same subjects framed about 20% tighter because the plate aspect (1.78) is covered into a 2.13 tile. The user forbids regenerating the plates. |
| **MATERIAL** | match | Photographic chenille plates ship everywhere the comp paints material. There is no CSS stand-in. |
| **GROUND** | contradicted | Pixel samples: comp header and band gap #faf2eb (blush cream); build #f8f6e8 (yellow-green cream). The build drifts toward the rendition prior. |
| Sections below the fold, mobile reflow, menu | acceptable adaptation | These inherit the system in the sections phase. Mobile keeps the headline, the action, the bouquet at decisive scale, and the band peeking in. |

## ceiling

The display lettering is the unused native device of the "Floristería digital refinada" card, which calls for elegant type. Didone optical sizing (the high-contrast display cut) is available in the chosen family and not used, so every heading reads at text-size contrast. Motion: reached.

## material_fixes

1. TYPE (fidelity): set every Bodoni Moda use in the variable family with optical sizing tracking font size, so the display sizes take the condensed, high-contrast cut. Bring the headline toward the comp's measured cap height at 1672 without exceeding the 6rem floor.
2. GROUND (fidelity): move the page field and every cream surface from #f8f6e8 to the comp's #faf2eb (html/body, opening, header, band, collection, process, menu panel, scrollbar track).
3. Primary action (fidelity): group the label and the arrow (centered, about 1.2rem gap). Scale the label to about 1.44vw, clamped, to match the comp's label size.
4. Floor, kicker ban: the "Tier 1/2/3" labels sit above the tier headings as eyebrows. Set them on the heading's baseline as trailing meta, the way product-story meta already works.
5. Truth: "Hablar de un arreglo" points to #contacto, a footer with no contact channel, which is a silent omission. Add a marked placeholder that names the real channels (WhatsApp and email) and says the details are still to be confirmed. Invent no data.
6. Floor, contrast and browser surfaces: the tracking placeholder #7c6766 on #d6bea9 is 2.96:1, below the 4.5 floor, so darken it. Theme the input caret from the palette.

## keep

The chenille bouquet plate at decisive scale with the focus-pull opening, and the cream → wine → blush → cream → sand → charcoal section rhythm.

---

# Verdict pass 1 (after fix batch 1)

## verdict
1. TYPE: unresolved. Moving to the variable face with auto optical size (opsz 96) drops the hairlines out of every Bodoni use; the wordmark and headline break apart.
2. GROUND: resolved. Both sides now sample #faf2eb.
3. Primary action: resolved. The label is at comp scale and the arrow is grouped with it.
4. Tier eyebrows: resolved. The labels now sit on the heading baseline.
5. Contact placeholder: resolved. The footer reads "Contacto por WhatsApp y correo: datos por confirmar."
6. Placeholder contrast and caret: resolved.
Regression: hairlines drop out in all display serif text (same cause as 1).

## remaining
TYPE and the hairline regression.

disposition: fix

---

# Verdict pass 2 (after fix batch 2: static Bodoni Moda restored; headline and wordmark at weight 500; headline back at the comp-width size)

## verdict
1. TYPE: partial. The stems are heavier and closer to the comp, and the hairline regression is resolved. The face is still wider, with a smaller cap height than the comp's condensed Didone (headline crop 52%, final overall 77%). This cannot close inside Bodoni Moda at the comp's line width.
Regressions: none visible (wordmark 75%, CTA 79%).

## remaining
TYPE: the headline and wordmark are less condensed than the comp. This needs a condensed high-contrast display face outside the family that font-match ranked, which is a user decision.

disposition: fix (this covers the scored fixes only; the unattended two-round budget is spent)
