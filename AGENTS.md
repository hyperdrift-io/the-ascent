# The Edge

> Inherits [PoC lane context](../AGENTS.md) and [Hyperdrift workspace context](../../../AGENTS.md).

## Mission

The Edge is a lifelong, zoomable human-capacity matrix that helps a person see what today can carry and make the right call. Weekrun is a seven-day application of that foundation toward one chosen aim.

## Required Product Skill

Load `skills/the-edge-product/SKILL.md` before any product, KPI, Weekrun, copy,
UX, asset, analytics, or release change. Its linked foundation specification is
the canonical source of product truth.

## Product Hierarchy

- **The Edge** is the permanent foundation across days, aims, and Weekruns.
- **Today's Edge** expresses what the current day can carry without redefining the person.
- **Weekrun** applies current capacity toward one chosen aim for seven days.
- **Athletic Mode** is an optional practice across 52 completed Weekruns and is the only mode that uses Push Coach.

## Boundaries

- The current Weekrun experience is public at `https://theascent.hyperdrift.io` and deployed through Hyperdrift infra as `the-ascent` while it is integrated with The Edge.
- Keep deployment, analytics, and discoverability aligned with the public app whenever its routes or metadata change.
- Keep the game legible: small rules, visible trade-offs, no hidden punitive scoring.
- Real data starts with local imports: `.ics` calendar files and health/activity JSON exports.
- Follow the workspace CSS standard: semantic CSS with custom properties, no Tailwind, no CSS-in-JS.

## Design Authority

- Product foundation: `docs/superpowers/specs/2026-07-12-the-edge-foundation-design.md` (canonical product hierarchy, KPI ontology, spatial matrix, voice, and artistic direction).
- Existing Weekrun visual and game design: `~/dev/hyperdrift/docs/superpowers/specs/2026-07-11-edge-ascent-visual-design.md` (monorepo checkout) (The Living Mountain world, light state, locks, cards, Resolve ritual, canonical metrics as Conditions + Trail Notes).
- Existing Weekrun architecture and naming: `~/dev/hyperdrift/docs/superpowers/specs/2026-07-11-edge-hypergame-architecture-design.md` (monorepo checkout) (product Edge, weekly mode Ascent, purpose graphs, game kernel, run signals, MVP scope).
- First viewport composite: `design/first-viewport-mock.html` (open in browser; state switcher, dawn/night/send visuals, lock treatment, move hand, readiness bar).

## Product Notes

- The user sets the aim in their own words.
- The game selects a subset of life criteria based on that aim.
- Rest and sleep quietly govern how much effort can become progress.
- Family and meaningful social time should improve sustained momentum without direct moralizing.
