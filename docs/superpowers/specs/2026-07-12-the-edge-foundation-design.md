# The Edge Foundation Design

**Date:** 2026-07-12  
**Status:** Draft for user review  
**Scope:** The Edge foundation, its relationship to Weekrun, and its permanent artistic direction

## Purpose

The Edge helps a person understand what brings them toward full human capacity, then make the right call with the capacity available today.

It is not a productivity score, a goal tracker, or a seven-day game. It is a lifelong matrix for self-knowledge, balance, meaningful action, and fulfilment. A Weekrun is one way to apply The Edge toward an aim. The Edge exists before a goal is entered, remains accessible throughout the Weekrun, and continues after that Weekrun ends.

The product should leave a person with one immediate feeling:

> I can see my present capacity clearly, understand what shapes it, and choose a call that respects both my aim and myself.

## Product Hierarchy

### 1. The Edge

The permanent top layer. It holds the person's evolving human foundation across days, aims, and Weekruns.

The Edge answers:

- What capacity is available now?
- Which forces are supporting or constraining it?
- What balance would make meaningful action sustainable?
- What is the right call: advance, narrow, recover, connect, or create space?

### 2. Today's Edge

The daily expression of the foundation. It reflects that every day is different without treating one day as a definition of the person.

Daily readings are interactive and always reachable. They influence what today's call can carry. They enter history when the day ends, but they do not silently overwrite the person's longer-term foundation.

### 3. Weekrun

A self-contained seven-day application of current capacity toward one chosen aim. Weekrun determines how best to use capacity; it does not define capacity.

Weekrun may read The Edge and adapt move size, sequence, and support. It must not reinterpret the universal foundation around the aim or turn foundation measures into aim-progress measures.

The existing daily Weekrun loop remains intact. This design integrates The Edge above it; it does not replace the Morning Scan, move hand, cairn ritual, night, route readiness, or summit attempt.

### 4. Athletic Mode

An optional long-horizon practice of completing 52 Weekruns. It counts completed Weekruns, not consecutive calendar weeks.

- Breaks are allowed and remain neutral.
- There are no missed-week warnings or broken streaks.
- The next Weekrun never starts automatically.
- Recovery periods are part of using capacity well.
- Enabling or disabling Athletic Mode never deletes history.
- Athletic Mode adds season progress and longitudinal reflection; it does not change the foundation model.

The default product is one Weekrun at a time with no annual commitment.

## The Foundation Model

The Edge uses a stable tree:

**The Edge -> domain -> core human KPI -> sub-KPI -> daily reading**

The complete KPI ontology is universal and independent of the current aim. A goal, day, or Weekrun may make some KPIs more relevant, but it cannot add, remove, rename, or redefine them.

### Immutable Core Human KPIs

The original fifteen metrics remain canonical:

- health;
- stamina;
- sleep;
- stress;
- nutrition;
- cardio;
- work;
- commute;
- routine;
- sport;
- rest;
- travel;
- social;
- entertainment;
- family.

These stable identifiers are the ground truth of the simulation and the search index. Migrations may preserve old data or improve presentation, but product work must not replace this registry with a goal-specific or trend-driven model.

### Domains

Domains organise the full KPI set into legible branches. They are navigation, not replacement measures. Every core KPI remains searchable and reachable directly.

A domain summary may show the combined state of its children. Opening it reveals the core KPIs beneath it. The interface must disclose which children contributed to any summary.

### Sub-KPIs

Sub-KPIs make a core KPI more granular without becoming independent roots.

Examples:

- `stress -> anxiety`;
- `sleep -> quality`;
- `rest -> detachment`;
- `work -> motivation`;
- `sport -> motivation`;
- `social -> support`;
- `family -> support`.

The parent is part of the sub-KPI's identity. Search for `motivation` may return multiple contextual branches, such as `work -> motivation` and `sport -> motivation`. The UI must retain that context when the person inspects or adjusts the signal.

Sub-KPIs are searchable daily signals derived within the existing canonical tree. They do not expand the root KPI registry.

The approved sub-KPI catalog is also immutable at runtime. An LLM, goal pack, or Weekrun cannot invent a sub-KPI. Search synonyms may improve discovery, but the stable identifier, parent, meaning, and direction of a KPI do not change.

Anxiety is a self-reported signal under stress, not a diagnosis. Motivation is contextual, not a universal character score. Support retains its social or family context.

### Derived Human Resource Summaries

The existing seven resources remain the deceptively simple surface:

- energy;
- focus;
- composure;
- confidence;
- recovery;
- connection;
- time.

They are derived summaries across the KPI tree, not replacements for the canonical metrics. A person can always zoom through a summary to the domains, core KPIs, sub-KPIs, readings, and evidence that shaped it.

### Recommendations

The Edge may recommend a subset of canonical KPIs or contextual sub-KPIs that matter most for today's conditions or a chosen aim. The recommendation is a lens over the fixed human matrix.

The person confirms the subset. Weekrun may then use it as the underlying capacity focus while keeping the declared life aim intact.

This confirmed subset is the **underlying Edge aim**: the balance to protect or adjust so the declared aim can be pursued well. It is not a new KPI and it does not change the tree.

Search remains available whether or not a KPI is recommended. Results show the complete contextual path, current state, and why the result matched. Opening a result zooms to that branch without losing the current Edge or Weekrun context.

### Study Resources

Each active Weekrun day suggests one optional resource that helps the player understand the confirmed KPI or sub-KPI currently shaping Today's Edge.

Wikipedia is the canonical study source. The product uses a curated, stable mapping from KPI tree nodes to relevant Wikipedia articles. It does not generate arbitrary search results or present an uncited explanation as authority.

The study suggestion:

- is labelled with the KPI path and Wikipedia article title;
- explains briefly why it is relevant today;
- remains secondary to the right call and daily move;
- opens the source directly;
- never changes a reading, score, route, recommendation, or reward;
- never creates a new human resource, KPI, sub-KPI, or game currency;
- is optional and carries no completion state or streak.

Example:

> **Study today's ability: Stress -> Anxiety**  
> Explore how arousal can affect attention and decision-making. [Read on Wikipedia](https://en.wikipedia.org/wiki/Arousal)

The link is an invitation to understand, not medical guidance. Health-related topics retain the product's non-diagnostic boundary.

Alignment is the direction of The Edge, not another score. It asks whether current action expresses the person's values and desired life. A goal may be tested against alignment, but it may not redefine the KPI tree.

## The Underlying Mechanism

The Edge is a dynamic fit between:

- current human resources;
- current internal and external demands;
- available recovery and support;
- psychological flexibility;
- values and meaning;
- the demand introduced by a chosen move.

Full capacity does not mean every KPI or signal reads 100. Some forces have useful middle ranges. High motivation with poor sleep and limited rest is not full capacity. Low anxiety is not automatically better if it also reflects disengagement. Abundant time without alignment does not create meaningful action.

The Edge therefore expresses **balance and fit**, not a total of independent KPIs.

This model is grounded in:

- the WHO view of wellbeing as the capacity to cope, realise abilities, learn, work, connect, and contribute;
- Self-Determination Theory's needs for autonomy, competence, and relatedness;
- demands-resources models, where resources support growth and offset sustained demands;
- effort-recovery models, where capacity must be replenished after load;
- psychological flexibility, where a person can persist or adapt in service of valued ends;
- goal-adjustment research, where flexible striving supports both progress and wellbeing.

References:

- [WHO World Mental Health Report](https://www.who.int/publications/i/item/9789240049338)
- [Self-Determination Theory: Basic Psychological Needs](https://selfdeterminationtheory.org/research/basic-psychological-needs/)
- [Job Demands-Resources systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9531691/)
- [Recovery-enhancing processes](https://pmc.ncbi.nlm.nih.gov/articles/PMC10094142/)
- [Psychological flexibility and wellbeing](https://pmc.ncbi.nlm.nih.gov/articles/PMC12981213/)
- [Goal-adjustment meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC12932095/)

## Fractal Interaction Model

The Edge is deceptively simple, never oversimplified.

Every visible summary is a real, useful surface. Every summary can also be entered. Depth repeats the same structure at different scales, like a fractal:

1. **State:** What is true at this level?
2. **Branches:** Which domains and canonical KPIs contribute to it?
3. **Signals:** Which contextual sub-KPIs make each branch rise, fall, or change character?
4. **Pattern:** How has this behaved across time and context?
5. **Call:** What action best fits what is now known?

### Zoom Level 0: The Edge Summary

Always visible before and during a Weekrun.

- Edge state, such as Balanced, Loaded, Restoring, or Overextended
- A secondary orientation value, presented as self-knowledge rather than an objective health score
- The Edge horizon
- One concise right call

Hover or focus reveals the seven-resource summary. Click or tap opens the full matrix.

### Zoom Level 1: Domains and Resources

The seven derived resources appear together as the simple surface. Opening one reveals the related domains and the immutable core KPIs that contributed to it.

### Zoom Level 2: Core KPIs

The complete canonical KPI set is searchable from every matrix depth. A KPI screen shows its present state, parent domain, contributing contexts, and child signals.

### Zoom Level 3: Sub-KPIs and Daily Readings

Selecting a core KPI reveals its contextual sub-KPIs. Each signal includes:

- the current reading;
- its recent direction;
- the conditions that commonly influence it;
- a lower-side statement describing what that state invites;
- a higher-side statement describing what that state enables or risks.

These statements are directional wisdom, not generic motivation and not moral judgment.

### Zoom Level 4: Patterns

The person may inspect relationships across days and Weekruns: for example, how restoration affects clarity, or how connection changes the capacity to attempt difficult work.

The system may surface associations as observations. It must not present correlation as medical or causal fact.

### Zoom Level 5: Evidence

The deepest layer shows the person's own scans, reflections, cairns, contexts, and confirmed learning. The user's lived evidence remains the source of truth.

Every depth has a clear route back to the parent layer. The product must never trap the person inside analysis.

## Weekrun Integration Contract

Weekrun and The Edge expose two separate readings:

- **Edge state:** What can today carry?
- **Route readiness:** How close is this Weekrun to its meaningful attempt?

They must never be combined into one score.

Weekrun integration follows four operations:

1. **Read:** Weekrun reads Today's Edge and the chosen aim.
2. **Fit:** It adjusts move intensity, sequence, and support.
3. **Act:** Cairns record evidence; route readiness records progress.
4. **Return:** Reflection contributes learning back to The Edge.

After the daily KPI subset is confirmed, Weekrun surfaces its single mapped Wikipedia study resource. The suggestion supports understanding; it does not become another task in the move hand.

Long-term baseline changes proposed from Weekrun learning require confirmation. Weekrun cannot silently update the person's foundation.

The persistent Weekrun surface shows a compact Edge horizon and state. Hover or keyboard focus reveals the derived-resource and domain summary. Click or tap opens the full-screen matrix with a smooth spatial blend, then returns to the same Weekrun state.

When current demand materially exceeds available capacity, the interface may introduce a controlled danger-red wash. This signals that the call needs adjustment, not that the person or aim has failed. The available calls are:

- reduce the move;
- add support;
- restore first.

## Artistic Direction

### Canonical Direction: Mythic Natural Realism

The Edge is a living natural world in balanced tension. Sunlight, water, wind, roots, atmosphere, terrain, and underground networks behave as universal forces. The world should feel ancient, precise, and alive without becoming fantasy illustration or goal-specific scenery.

### Fractal Law

Everything is fractal-driven. Visual forms repeat across scales:

- roots become river systems;
- rivers become circulatory paths;
- mycelium becomes social connection;
- coastlines become the Edge boundary;
- wind fields become time and available space;
- light scattering becomes clarity;
- thermal lift becomes agency;
- wave interference becomes regulation.

Fractal structure is functional. It explains that a pattern visible in one day may recur across a Weekrun or season without claiming those scales are identical.

### Recraft Asset Rule

All production bitmap artwork for The Edge is generated through the workspace Recraft pipeline:

```bash
RECRAFT_API_KEY=... node scripts/generate-recraft-asset.mjs \
  --output <path> \
  --prompt "<documented prompt>"
```

Production prompts must specify:

- Mythic Natural Realism;
- the exact tree node identifier and its parent lineage;
- the relevant universal natural force;
- fractal and self-similar structure;
- no goal, sport, career, or project-specific imagery for foundation assets;
- no embedded text, numbers, or logos;
- the intended state and UI role;
- restrained palette and accessibility requirements.

Prompts and asset purpose stay documented beside the asset manifest so future generations remain coherent.

### Visual Tree Inheritance

Recraft maps every level of the KPI tree with a distinct but related asset:

- The Edge has the complete living world.
- A domain enters one region or ecosystem of that world.
- A core KPI enters a distinct natural force inside the domain.
- A sub-KPI moves closer into a related fractal structure, material, weather pattern, or living process.
- A daily reading changes the state of that same child asset.

Children inherit visual DNA from their parent:

- natural force;
- composition and spatial orientation;
- fractal family;
- material language;
- base palette;
- lighting logic;
- motion character.

A child must still have its own generated asset. Reusing one image with a new label is not sufficient. The relationship should be visible before it is explained: entering `stress -> anxiety`, for example, feels like moving deeper into the same weather system rather than opening an unrelated illustration.

The asset manifest records `nodeId`, `parentId`, prompt, Recraft model, intended states, output paths, and accessibility notes. This makes the visual tree reproducible and reviewable.

### Continuous Progression

The system does not generate a separate bitmap for every percentage. Each visual tree node receives coherent Recraft key states using the same composition and inherited art direction:

- quiet;
- available;
- balanced Edge;
- loaded;
- overloaded.

The UI interpolates between key states through crossfade, masking, reveal, tint, density, depth, and motion. Every percentage therefore has a distinct visual expression without maintaining hundreds of unrelated images.

Aim progress changes Weekrun terrain, route definition, and summit light. It never changes the identity or lineage of the human KPI assets.

### Colour Semantics

- Warm natural gold: usable balance and meaningful tension
- Cool mineral and moonlit tones: restoration and low external demand
- Clear daylight: available clarity and agency
- Dense weather: high load or limited space
- Controlled crimson: demand exceeds available capacity

Red is never used as decoration or as a judgment of the person. Motion slows and contrast strengthens in overload; the UI does not become chaotic when the person most needs clarity.

## Voice

The Edge inherits Hyperdrift's Voice Covenant.

- Enable, never diminish.
- Describe conditions, not character.
- Lead with what is available.
- Treat a lower reading as information about the right call.
- Do not manufacture urgency.
- Do not imply that maximisation is fulfilment.
- Do not turn missed days or breaks into failure.

Example:

> The aim still stands. Restoration is the call that keeps tomorrow available.

Not:

> You are falling behind because your recovery is too low.

## Data and Trust

- Self-assessment is the primary source of truth.
- Today's readings expire into history at the next local day.
- Long-term foundation changes are proposed, explained, and confirmed.
- The person can correct or remove their data.
- Derived resource and domain states must disclose which canonical KPIs and sub-KPIs contributed.
- Core KPIs and sub-KPIs are searchable by stable name, contextual path, and documented synonyms.
- Recommendations select a subset of the fixed tree and require confirmation; they never mutate the ontology.
- Study suggestions come only from the curated Wikipedia mapping and have no effect on state or progression.
- Health-related signals are orientation tools, not diagnoses or treatment recommendations.
- No signal should be shared or used for advertising.

## Anti-Drift Rules

Future work must preserve these boundaries:

1. The Edge is the product; Weekrun is one application.
2. The fifteen canonical core human KPIs are immutable and independent of the current aim.
3. Weekrun progress and human capacity are separate readings.
4. Full capacity means dynamic fit, not every slider at maximum.
5. Daily state may inform but never silently redefine the long-term foundation.
6. Default mode is one Weekrun; 52 completed Weekruns belongs only to optional Athletic Mode.
7. Simple surfaces must preserve access to depth.
8. Domains organise KPIs; derived resources summarise them; neither may replace or hide the canonical registry.
9. Sub-KPIs belong to a named parent KPI and retain that context in search, adjustment, and history.
10. Recommendations are confirmed subsets of the fixed tree, never new metrics.
11. Wikipedia study links help the player understand a recommended ability; they are never resources, tasks, or progression mechanics.
12. Every layer follows the fractal state -> branches -> signals -> pattern -> call structure.
13. Every KPI tree node has a distinct Recraft asset that visibly inherits its parent's visual DNA.
14. Production bitmap art uses Recraft and the canonical Mythic Natural Realism direction.
15. The user is never the problem. The system helps reveal the conditions for the next right call.

## Documentation and Skill Integration

Implementation should create a project-local `the-edge-product` skill from this specification and require it in the app's `AGENTS.md`. The skill should route product, UX, copy, asset, Weekrun, and analytics work back to this document before changes begin.

The following surfaces must be aligned after approval:

- `MISSION.md`;
- `AGENTS.md`;
- `README.md`;
- product-local skill documentation;
- existing visual and architecture design authority;
- the Hyperdrift article;
- Playground copy;
- Recraft asset manifest and prompts.

Generic Hyperdrift skills should remain generic. The project-local skill is the canonical anti-drift mechanism for The Edge.
