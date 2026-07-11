# Edge PoC

> Inherits [PoC lane context](../AGENTS.md) and [Hyperdrift workspace context](../../../AGENTS.md).

## Mission

Help a person see whether their current week can carry the aim they choose, then adjust the rhythm until progress becomes possible without turning life into a grind.

## Boundaries

- This is a local prototype, not a production Hyperdrift app.
- Do not add infra, vault secrets, analytics, billing, or deployment wiring without an explicit promotion decision.
- Keep the game legible: small rules, visible trade-offs, no hidden punitive scoring.
- Real data starts with local imports: `.ics` calendar files and health/activity JSON exports.
- Follow the workspace CSS standard: semantic CSS with custom properties, no Tailwind, no CSS-in-JS.

## Design Authority

- Visual & game design: `~/dev/hyperdrift/docs/superpowers/specs/2026-07-11-edge-ascent-visual-design.md` (monorepo checkout) (The Living Mountain world, light state, locks, cards, Resolve ritual, canonical metrics as Conditions + Trail Notes).
- Game architecture & naming: `~/dev/hyperdrift/docs/superpowers/specs/2026-07-11-edge-hypergame-architecture-design.md` (monorepo checkout) (product Edge, weekly mode Ascent, purpose graphs, game kernel, run signals, MVP scope).
- First viewport composite: `design/first-viewport-mock.html` (open in browser; state switcher, dawn/night/send visuals, lock treatment, move hand, readiness bar).

## Product Notes

- The user sets the aim in their own words.
- The game selects a subset of life criteria based on that aim.
- Rest and sleep quietly govern how much effort can become progress.
- Family and meaningful social time should improve sustained momentum without direct moralizing.
