# The Edge Recraft Asset Review

## Status

Incomplete because the Recraft account returned `not_enough_credits` on
`body.nutrition.regularity` on 2026-07-13. The generator stopped without a
staging residue. Resume the manifest after credits are restored; valid families
are integrity-checked and skipped automatically.

```bash
set -a
source /Users/yannvr/dev/hyperdrift/.env
set +a
node design/recraft/generate-tree.mjs --all
```

## Durable Batch

- 16 complete families
- 80 WebP state assets
- 16 provenance files
- 51 families and 255 WebPs remaining
- Availability index contains complete families only

Generated families: `edge`, `body`, `body.health`,
`body.health.general-wellbeing`, `body.health.physical-comfort`,
`body.health.illness-load`, `body.stamina`,
`body.stamina.sustained-effort`, `body.stamina.physical-endurance`,
`body.stamina.mental-endurance`, `body.nutrition`,
`body.nutrition.nourishment`, `body.nutrition.hydration`, `pressure`,
`pressure.stress`, and `pressure.stress.anxiety`.

## Visual Gate

The 16-family available-state contact sheet and the complete five-state
`body.health.general-wellbeing` progression were inspected at source resolution.

| Criterion | Result |
| --- | --- |
| Inherited natural force | Pass: water, stone, roots, weather, and the spiral anchor remain related across depths. |
| Fractal family | Pass: every child is distinct while visibly belonging to the same landscape system. |
| Transition anchor | Pass: the central force remains readable enough for camera continuity. |
| Text absence | Pass: no labels, lettering, interface chrome, or watermarks are visible. |
| State progression | Pass: quiet, available, edge, loaded, and overloaded preserve composition while light and tint intensify; overloaded reaches a restrained red danger treatment. |

This is a partial production-safe batch, not completion of the full tree. A
full domain-by-domain review and the 335-image completeness gate remain required
after Recraft credits are replenished.
