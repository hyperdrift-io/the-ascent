# The Edge Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make The Edge the permanent, searchable, spatially zoomable human-KPI foundation above Weekrun while preserving the existing seven-day loop.

**Architecture:** A pure TypeScript ontology and profile layer owns immutable KPIs, contextual sub-KPIs, daily readings, recommendations, Wikipedia mappings, and Athletic Mode. A Three.js scene renders the ontology as a full-screen Mythic Natural Realism world whose camera follows the KPI tree; React provides semantic controls and an accessible mirror. Weekrun consumes Today's Edge through a narrow adapter and never owns or mutates the ontology.

**Tech Stack:** React 18, TypeScript 5.6, Vite 5, semantic CSS, Three.js, Vitest, localStorage, Recraft v4 through `scripts/generate-recraft-asset.mjs`.

## Global Constraints

- Read `docs/superpowers/specs/2026-07-12-the-edge-foundation-design.md` before every task.
- Obtain explicit dependency approval before adding `three` and `vitest`.
- The fifteen `CoreMetric` identifiers remain unchanged.
- Domains and derived resources may summarise KPIs but may not replace or hide them.
- A sub-KPI always has a stable parent KPI and retains that path in search and history.
- Default mode is one Weekrun; only Athletic Mode counts 52 completed Weekruns.
- Existing Morning Scan, move hand, cairn ritual, night, route readiness, and summit behavior remain intact.
- Fractal navigation is literal spatial zoom, not nested panels.
- Every bitmap asset is generated through the workspace Recraft generator.
- Default voice uses supportive challenge; Push Coach copy appears only in opted-in Athletic Mode.
- Wikipedia suggestions are optional study links with no progression effect.
- Presentation uses semantic CSS only: no Tailwind, CSS-in-JS, or presentation `style={}`.
- All health and emotional readings are non-diagnostic and user-controlled.

---

### Task 1: Install the anti-drift product context

**Files:**
- Create: `skills/the-edge-product/SKILL.md`
- Modify: `AGENTS.md`
- Modify: `MISSION.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved foundation specification.
- Produces: one project-local instruction entrypoint required by all future Edge work.

- [ ] **Step 1: Write the project-local skill**

Create `skills/the-edge-product/SKILL.md` with this routing contract:

```markdown
---
name: the-edge-product
description: Required before any product, KPI, Weekrun, copy, UX, asset, analytics, or release work in The Edge.
---

# The Edge Product

Read `docs/superpowers/specs/2026-07-12-the-edge-foundation-design.md` first.

## Invariants

1. The Edge is the product; Weekrun is one application.
2. Keep all fifteen canonical core KPIs unchanged and searchable.
3. Sub-KPIs belong to fixed parents; recommendations select subsets only.
4. The matrix is a literal spatial zoom experience.
5. Recraft generates every bitmap asset; Mythic Natural Realism is canonical.
6. Default Weekrun uses supportive challenge; Athletic Mode alone uses Push Coach.
7. Wikipedia links support study and never affect progression.

## Before changing anything

- State which tree level the work affects.
- Confirm Weekrun behavior is unchanged unless the request explicitly changes it.
- Confirm no KPI identifier, parent, or meaning changes.
- Confirm every new visual asset has a Recraft prompt and manifest entry.
```

- [ ] **Step 2: Make the skill mandatory in repository context**

Add to `AGENTS.md`:

```markdown
## Required Product Skill

Load `skills/the-edge-product/SKILL.md` before any product, KPI, Weekrun, copy,
UX, asset, analytics, or release change. Its linked foundation specification is
the canonical source of product truth.
```

Replace the current local-prototype framing with the permanent product hierarchy from the specification.

- [ ] **Step 3: Align mission and README without rewriting implementation history**

Make `MISSION.md` lead with:

```markdown
The Edge is a lifelong, zoomable human-capacity matrix that helps a person see
what today can carry and make the right call. Weekrun is a seven-day application
of that foundation toward one chosen aim.
```

Update `README.md` to link the canonical design and state that the current shipped experience is the Weekrun layer being integrated with The Edge.

- [ ] **Step 4: Verify doctrine references**

Run:

```bash
rg -n "The Edge is the product|fifteen canonical|literal spatial|Recraft|Push Coach" \
  AGENTS.md MISSION.md README.md skills/the-edge-product/SKILL.md \
  docs/superpowers/specs/2026-07-12-the-edge-foundation-design.md
git diff --check
```

Expected: every invariant appears in the canonical spec or skill; `git diff --check` prints nothing.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md MISSION.md README.md skills/the-edge-product/SKILL.md
git commit -m "docs: install The Edge product doctrine"
```

---

### Task 2: Add tests and the immutable KPI tree

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/edge-kpis.ts`
- Create: `src/edge-kpis.test.ts`
- Modify: `src/edge.ts`

**Interfaces:**
- Produces: `CORE_KPI_IDS`, `KPI_TREE`, `searchKpis(query)`, `recommendKpiSubset(context)`, `getStudyResource(path)`.
- Preserves: `CoreMetric` imports through a re-export from `src/edge.ts`.

- [ ] **Step 1: Obtain dependency approval, then install Vitest**

```bash
pnpm add -D vitest
```

Add:

```json
"test": "vitest run"
```

- [ ] **Step 2: Write failing ontology tests**

Create `src/edge-kpis.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CORE_KPI_IDS,
  KPI_TREE,
  getStudyResource,
  recommendKpiSubset,
  searchKpis,
} from "./edge-kpis";

describe("The Edge KPI tree", () => {
  it("keeps the canonical root registry exact", () => {
    expect(CORE_KPI_IDS).toEqual([
      "health", "stamina", "sleep", "stress", "nutrition", "cardio",
      "work", "commute", "routine", "sport", "rest", "travel",
      "social", "entertainment", "family",
    ]);
  });

  it("keeps every sub-KPI attached to a canonical parent", () => {
    for (const domain of KPI_TREE) {
      for (const kpi of domain.kpis) {
        expect(CORE_KPI_IDS).toContain(kpi.id);
        for (const child of kpi.children) expect(child.parentId).toBe(kpi.id);
      }
    }
  });

  it("returns contextual motivation branches", () => {
    expect(searchKpis("motivation").map((item) => item.path)).toEqual(
      expect.arrayContaining(["structure.work.motivation", "body.sport.motivation"]),
    );
  });

  it("keeps anxiety under stress", () => {
    expect(searchKpis("anxiety")[0].path).toBe("pressure.stress.anxiety");
  });

  it("recommends only fixed tree nodes", () => {
    const results = recommendKpiSubset({ aim: "deliver a talk", lowResources: ["composure"] });
    const known = new Set(searchKpis("").map((item) => item.path));
    expect(results.every((item) => known.has(item.path))).toBe(true);
  });

  it("maps study links to Wikipedia without creating progression state", () => {
    expect(getStudyResource("pressure.stress.anxiety")).toMatchObject({
      href: "https://en.wikipedia.org/wiki/Arousal",
      source: "Wikipedia",
    });
  });
});
```

- [ ] **Step 3: Run the test and verify failure**

```bash
pnpm test -- src/edge-kpis.test.ts
```

Expected: FAIL because `src/edge-kpis.ts` does not exist.

- [ ] **Step 4: Implement the stable ontology interfaces**

Create `src/edge-kpis.ts` with:

```ts
export const CORE_KPI_IDS = [
  "health", "stamina", "sleep", "stress", "nutrition", "cardio",
  "work", "commute", "routine", "sport", "rest", "travel",
  "social", "entertainment", "family",
] as const;

export type CoreMetric = (typeof CORE_KPI_IDS)[number];
export type DomainId = "body" | "recovery" | "pressure" | "structure" | "connection" | "renewal";

export type SubKpi = {
  id: string;
  parentId: CoreMetric;
  label: string;
  synonyms: readonly string[];
  wikipedia: { title: string; href: `https://en.wikipedia.org/wiki/${string}` };
};

export type KpiNode = {
  id: CoreMetric;
  domainId: DomainId;
  label: string;
  children: readonly SubKpi[];
};

export type DomainNode = {
  id: DomainId;
  label: string;
  kpis: readonly KpiNode[];
};

export type KpiSearchResult = {
  path: `${DomainId}.${CoreMetric}` | `${DomainId}.${CoreMetric}.${string}`;
  label: string;
  parentLabel: string | null;
  source: "core" | "sub";
};

export type RecommendationContext = {
  aim: string;
  lowResources: readonly ("energy" | "focus" | "composure" | "confidence" | "recovery" | "connection" | "time")[];
};

export const DOMAIN_KPIS: Record<DomainId, readonly CoreMetric[]> = {
  body: ["health", "stamina", "nutrition", "cardio", "sport"],
  recovery: ["sleep", "rest"],
  pressure: ["stress"],
  structure: ["work", "commute", "routine", "travel"],
  connection: ["social", "family"],
  renewal: ["entertainment"],
};

export const SUB_KPI_IDS: Record<CoreMetric, readonly string[]> = {
  health: ["general-wellbeing", "physical-comfort", "illness-load"],
  stamina: ["sustained-effort", "physical-endurance", "mental-endurance"],
  sleep: ["duration", "quality", "regularity"],
  stress: ["anxiety", "tension", "overwhelm"],
  nutrition: ["nourishment", "hydration", "regularity"],
  cardio: ["breath", "aerobic-capacity", "exertion-response"],
  work: ["workload", "motivation", "autonomy"],
  commute: ["duration", "friction", "predictability"],
  routine: ["consistency", "adaptability", "activation"],
  sport: ["movement", "motivation", "enjoyment"],
  rest: ["detachment", "relaxation", "quiet"],
  travel: ["disruption", "novelty", "recovery-cost"],
  social: ["support", "belonging", "relational-energy"],
  entertainment: ["enjoyment", "restoration", "stimulation"],
  family: ["support", "closeness", "responsibility-load"],
};
```

Populate every core KPI with three contextual children using the approved parent rules:

| Parent | Children |
|---|---|
| health | general wellbeing, physical comfort, illness load |
| stamina | sustained effort, physical endurance, mental endurance |
| sleep | duration, quality, regularity |
| stress | anxiety, tension, overwhelm |
| nutrition | nourishment, hydration, regularity |
| cardio | breath, aerobic capacity, exertion response |
| work | workload, motivation, autonomy |
| commute | duration, friction, predictability |
| routine | consistency, adaptability, activation |
| sport | movement, motivation, enjoyment |
| rest | detachment, relaxation, quiet |
| travel | disruption, novelty, recovery cost |
| social | support, belonging, relational energy |
| entertainment | enjoyment, restoration, stimulation |
| family | support, closeness, responsibility load |

Implement search as case-insensitive matching over labels, synonyms, and full paths. An empty query returns the complete flattened tree. Implement recommendations as deterministic rules over the fixed flattened results; never construct a new node.

- [ ] **Step 5: Re-export the canonical type**

In `src/edge.ts`, replace the local `CoreMetric` union with:

```ts
import type { CoreMetric } from "./edge-kpis";
export type { CoreMetric } from "./edge-kpis";
```

Keep the existing `CORE_METRICS` runtime array temporarily, but add an equality test and replace it with `CORE_KPI_IDS` before this task ends.

- [ ] **Step 6: Run tests and build**

```bash
pnpm test
pnpm build
```

Expected: all ontology tests pass; TypeScript and Vite builds succeed.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/edge-kpis.ts src/edge-kpis.test.ts src/edge.ts
git commit -m "feat: add immutable human KPI tree"
```

---

### Task 3: Add persistent Edge profile and Athletic Mode state

**Files:**
- Create: `src/edge-profile.ts`
- Create: `src/edge-profile.test.ts`

**Interfaces:**
- Consumes: `CoreMetric`, `KpiSearchResult`, existing `HumanResource`.
- Produces: `loadEdgeProfile()`, `saveDailyReading()`, `confirmRecommendation()`, `completeAthleticWeekrun()`.

- [ ] **Step 1: Write failing profile tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  completeAthleticWeekrun,
  createEdgeProfile,
  saveDailyReading,
  setAthleticMode,
} from "./edge-profile";

describe("Edge profile", () => {
  it("stores daily readings without rewriting the baseline", () => {
    const profile = createEdgeProfile("2026-07-12");
    const next = saveDailyReading(profile, {
      date: "2026-07-12",
      path: "pressure.stress.anxiety",
      value: 68,
    });
    expect(next.baselines).toEqual(profile.baselines);
    expect(next.daily["2026-07-12"]["pressure.stress.anxiety"]).toBe(68);
  });

  it("counts completed Weekruns only in Athletic Mode", () => {
    const defaultProfile = createEdgeProfile("2026-07-12");
    expect(completeAthleticWeekrun(defaultProfile, "run-1").athletic.completed).toBe(0);
    const athletic = setAthleticMode(defaultProfile, true);
    expect(completeAthleticWeekrun(athletic, "run-1").athletic.completed).toBe(1);
  });

  it("does not double count a Weekrun", () => {
    const athletic = setAthleticMode(createEdgeProfile("2026-07-12"), true);
    const once = completeAthleticWeekrun(athletic, "run-1");
    expect(completeAthleticWeekrun(once, "run-1").athletic.completed).toBe(1);
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm test -- src/edge-profile.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement versioned profile state**

```ts
export type DailyReading = { date: string; path: string; value: number };
export type ConfirmedRecommendation = { date: string; paths: readonly string[]; aim: string };

export type EdgeProfile = {
  version: 1;
  baselines: Record<HumanResource, number>;
  daily: Record<string, Record<string, number>>;
  recommendations: readonly ConfirmedRecommendation[];
  athletic: { enabled: boolean; completed: number; runIds: readonly string[] };
};

export const EDGE_PROFILE_KEY = "edge.foundation.v1";
```

Clamp readings to `0..100`, preserve prior-day history, and make duplicate run completion idempotent. Parse localStorage defensively and return `createEdgeProfile(today)` on invalid data.

- [ ] **Step 4: Run tests and commit**

```bash
pnpm test -- src/edge-profile.test.ts
git add src/edge-profile.ts src/edge-profile.test.ts
git commit -m "feat: persist The Edge foundation profile"
```

---

### Task 4: Define literal zoom navigation as a pure state machine

**Files:**
- Create: `src/edge-navigation.ts`
- Create: `src/edge-navigation.test.ts`

**Interfaces:**
- Produces: `EdgeViewportState`, `edgeNavigationReducer`, `getVisibleNodeIds`.
- Consumed by: Three.js renderer and semantic navigation mirror.

- [ ] **Step 1: Write failing navigation tests**

```ts
import { describe, expect, it } from "vitest";
import { createViewport, edgeNavigationReducer } from "./edge-navigation";

describe("fractal navigation", () => {
  it("zooms through a stable KPI lineage", () => {
    let state = createViewport();
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure" });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "stress" });
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "anxiety" });
    expect(state.path).toEqual(["edge", "pressure", "stress", "anxiety"]);
  });

  it("returns to the exact parent camera", () => {
    const parent = { x: 1, y: 2, z: 4, targetX: 0, targetY: 0, targetZ: 0 };
    let state = createViewport(parent);
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure" });
    state = edgeNavigationReducer(state, { type: "back" });
    expect(state.camera).toEqual(parent);
  });

  it("returns home in one action", () => {
    let state = createViewport();
    state = edgeNavigationReducer(state, { type: "enter", nodeId: "pressure" });
    state = edgeNavigationReducer(state, { type: "home" });
    expect(state.path).toEqual(["edge"]);
  });
});
```

- [ ] **Step 2: Implement the reducer**

```ts
export type CameraPose = {
  x: number; y: number; z: number;
  targetX: number; targetY: number; targetZ: number;
};

export type EdgeViewportState = {
  path: readonly string[];
  camera: CameraPose;
  history: readonly CameraPose[];
  selectedNodeId: string | null;
};

export type EdgeNavigationAction =
  | { type: "enter"; nodeId: string; camera?: CameraPose }
  | { type: "back" }
  | { type: "home" }
  | { type: "select"; nodeId: string | null }
  | { type: "camera"; camera: CameraPose };
```

Reject any `enter` action whose node is not a direct child of the current path node according to `KPI_TREE`.

- [ ] **Step 3: Run tests and commit**

```bash
pnpm test -- src/edge-navigation.test.ts
git add src/edge-navigation.ts src/edge-navigation.test.ts
git commit -m "feat: model fractal Edge navigation"
```

---

### Task 5: Build the Recraft tree manifest and validate one lineage

**Files:**
- Create: `design/recraft/edge-tree.json`
- Create: `design/recraft/generate-tree.mjs`
- Create: `src/edge-assets.ts`
- Create: `src/edge-assets.test.ts`
- Create: `public/assets/edge/` generated files

**Interfaces:**
- Produces: `getEdgeAsset(nodeId, state)`, generated Recraft images, transition anchors.
- Uses: root `scripts/generate-recraft-asset.mjs`; does not call Recraft directly.

- [ ] **Step 1: Define the manifest schema and complete node inventory**

Each manifest node must contain:

```json
{
  "nodeId": "pressure.stress.anxiety",
  "parentId": "pressure.stress",
  "force": "storm pressure",
  "fractalFamily": "storm cells resolving into branching electrical fields",
  "palette": ["mineral grey", "moonlit blue", "controlled crimson"],
  "transitionAnchor": "the central spiral cloud boundary",
  "wikipedia": "https://en.wikipedia.org/wiki/Arousal",
  "states": ["quiet", "available", "edge", "loaded", "overloaded"]
}
```

Include one manifest node for the Edge root, every domain, all fifteen core KPIs, and every approved sub-KPI from Task 2.

- [ ] **Step 2: Write a failing manifest test**

```ts
import { describe, expect, it } from "vitest";
import manifest from "../design/recraft/edge-tree.json";
import { searchKpis } from "./edge-kpis";

describe("Edge asset manifest", () => {
  it("covers every ontology node", () => {
    const ids = new Set(manifest.nodes.map((node) => node.nodeId));
    for (const result of searchKpis("")) expect(ids.has(result.path)).toBe(true);
  });

  it("gives every non-root node a valid parent and transition anchor", () => {
    const ids = new Set(manifest.nodes.map((node) => node.nodeId));
    for (const node of manifest.nodes.filter((item) => item.nodeId !== "edge")) {
      expect(ids.has(node.parentId)).toBe(true);
      expect(node.transitionAnchor.length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 3: Implement a manifest orchestrator around the workspace generator**

`design/recraft/generate-tree.mjs` accepts:

```text
--node <nodeId>      generate one node
--state <state>      generate one state
--lineage <nodeId>   generate root through node
--all                generate the complete manifest
--dry-run            print prompts and outputs without API calls
```

For each selected node/state, invoke:

```bash
node ../../../scripts/generate-recraft-asset.mjs \
  --output public/assets/edge/<nodeId>/<state>.webp \
  --prompt "Mythic Natural Realism ..."
```

The prompt concatenates the parent's inherited visual DNA, node force, fractal family, transition anchor, state, no-text rule, and universal/no-aim rule. The orchestrator must fail before an API call if the parent, prompt fields, or output mapping is missing.

- [ ] **Step 4: Generate and inspect the first complete lineage**

```bash
set -a && source ../../../.env && set +a
node design/recraft/generate-tree.mjs --lineage pressure.stress.anxiety
```

Expected outputs: five states each for `edge`, `pressure`, `pressure.stress`, and `pressure.stress.anxiety`.

Inspect a contact sheet and reject the lineage if parent landmarks do not visibly resolve into child geography. Do not generate the remaining tree until this lineage passes visual review.

- [ ] **Step 5: Implement typed asset resolution**

```ts
export type EdgeAssetState = "quiet" | "available" | "edge" | "loaded" | "overloaded";
export type EdgeAsset = { src: string; parentId: string | null; transitionAnchor: string; alt: string };
export function getEdgeAsset(nodeId: string, state: EdgeAssetState): EdgeAsset;
```

- [ ] **Step 6: Test and commit the pipeline plus approved vertical slice**

```bash
pnpm test -- src/edge-assets.test.ts
git add design/recraft src/edge-assets.ts src/edge-assets.test.ts public/assets/edge
git commit -m "feat: add Recraft fractal asset lineage"
```

---

### Task 6: Render the immersive Edge world

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/components/edge/EdgeWorld.tsx`
- Create: `src/components/edge/EdgeSemanticTree.tsx`
- Create: `src/edge-scene.ts`
- Create: `src/edge-world.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: ontology, asset resolver, viewport reducer, profile.
- Produces: `<EdgeWorld />` and accessible semantic mirror.

- [ ] **Step 1: Obtain dependency approval and consult official Three.js documentation**

Use Context7 or official Three.js docs for the installed version, then:

```bash
pnpm add three
```

- [ ] **Step 2: Implement the scene controller**

`src/edge-scene.ts` exports:

```ts
export type EdgeSceneController = {
  enter(nodeId: string): Promise<void>;
  back(): Promise<void>;
  home(): Promise<void>;
  resize(width: number, height: number, pixelRatio: number): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
};

export function createEdgeScene(
  canvas: HTMLCanvasElement,
  initial: EdgeViewportState,
  onSelect: (nodeId: string) => void,
): EdgeSceneController;
```

Use a full-bleed `WebGLRenderer`, perspective camera, textured planes/meshes for current/parent/children, raycasting for node selection, and an animation loop that interpolates camera pose. Clamp device pixel ratio to `2`. Dispose textures, geometries, materials, observers, and animation frames.

- [ ] **Step 3: Implement React ownership and semantic mirror**

`EdgeWorld.tsx` owns one canvas and one scene controller. It responds to wheel, pointer, keyboard, and touch gestures and delegates valid transitions to `edgeNavigationReducer`.

`EdgeSemanticTree.tsx` renders the same visible nodes as buttons in DOM order with:

```tsx
<button aria-label={`Enter ${node.label}`} onClick={() => enter(node.id)}>
  {node.label}
</button>
```

The semantic tree is visually restrained but never `display:none`; screen readers and keyboard users receive the complete hierarchy.

- [ ] **Step 4: Add reduced-motion behavior**

When `prefers-reduced-motion: reduce` matches, set transition duration to zero for camera travel and use a 150ms opacity crossfade. Preserve node selection, path, parent return, and asset meaning.

- [ ] **Step 5: Mount The Edge before aim entry**

In `App.tsx`, render `EdgeWorld` as the full-bleed first experience. Keep aim entry as an action within the root Edge scene, not a separate landing page.

- [ ] **Step 6: Verify canvas and navigation**

Run:

```bash
pnpm test
pnpm build
pnpm dev
```

Use browser tooling at desktop `1440x900` and mobile `390x844` to verify:

- canvas has non-zero coloured pixels;
- root -> pressure -> stress -> anxiety zoom works;
- back restores exact parent camera;
- home returns to root;
- semantic buttons match visible nodes;
- reduced motion completes without continuous travel;
- no text or controls overlap.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/edge src/edge-scene.ts src/edge-world.css src/App.tsx
git commit -m "feat: add immersive fractal Edge world"
```

---

### Task 7: Integrate search, daily readings, recommendations, and study

**Files:**
- Create: `src/components/edge/EdgeSummary.tsx`
- Create: `src/components/edge/KpiSearch.tsx`
- Create: `src/components/edge/KpiReading.tsx`
- Create: `src/components/edge/StudyResource.tsx`
- Create: `src/components/edge/EdgeOverlay.tsx`
- Create: `src/weekrun-edge.ts`
- Create: `src/weekrun-edge.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: KPI search/recommendation, profile, navigation.
- Produces: persistent Edge summary and full-screen overlay accessible from Weekrun.
- Produces: `buildWeekrunHeader()` and the Morning Scan-to-foundation adapter.

- [ ] **Step 1: Add component tests at the pure interface boundary**

Test the model inputs rather than WebGL pixels:

```ts
it("keeps route readiness separate from Edge state", () => {
  expect(buildWeekrunHeader({ edgeState: "balanced", edgeValue: 68, readiness: 31 })).toEqual({
    edgeLabel: "Balanced 68",
    readinessLabel: "Route readiness 31%",
  });
});
```

Implement the tested function in `src/weekrun-edge.ts`:

```ts
export function buildWeekrunHeader(input: {
  edgeState: string;
  edgeValue: number;
  readiness: number;
}): { edgeLabel: string; readinessLabel: string } {
  return {
    edgeLabel: `${input.edgeState[0].toUpperCase()}${input.edgeState.slice(1)} ${input.edgeValue}`,
    readinessLabel: `Route readiness ${input.readiness}%`,
  };
}
```

- [ ] **Step 2: Implement the persistent summary**

The summary shows state plus value. Hover/focus previews resources and domains. Click/tap opens `EdgeOverlay`, which expands into `EdgeWorld` and restores the exact Weekrun state on close.

- [ ] **Step 3: Implement global KPI search**

Search remains available at every depth. Results display full paths, for example:

```text
Pressure / Stress / Anxiety
Structure / Work / Motivation
Body / Sport / Motivation
```

Selecting a result instructs the scene controller to traverse the lineage in order.

- [ ] **Step 4: Implement interactive daily readings**

Use native range inputs with visible values and endpoint copy. Inputs write only to today's profile record:

```tsx
<input
  type="range"
  min="0"
  max="100"
  value={value}
  aria-label={`${path} today`}
  onChange={(event) => save(Number(event.currentTarget.value))}
/>
```

Render lower-side and higher-side directional statements from the fixed sub-KPI definition. Do not use inline presentation styles.

- [ ] **Step 5: Implement recommendation confirmation**

Show at most three fixed KPI paths with evidence explaining why they matter. The user can confirm or remove paths. Confirmation creates an underlying Edge aim without changing the declared Weekrun aim.

- [ ] **Step 6: Implement one Wikipedia study suggestion per active day**

`StudyResource` renders the mapped title, relevance sentence, `Wikipedia` source label, and an external link. It has no checkbox, completion state, XP, analytics conversion, or required action.

- [ ] **Step 7: Adapt Morning Scan without changing its flow**

After the existing `applyMorningScan`, mirror the seven resource readings into Today's Edge adapter. Do not change Scan copy, number of inputs, skip behavior, or Weekrun transitions.

- [ ] **Step 8: Test, build, and commit**

```bash
pnpm test
pnpm build
git add src/components/edge src/weekrun-edge.ts src/weekrun-edge.test.ts src/App.tsx src/styles.css
git commit -m "feat: integrate The Edge with Weekrun"
```

---

### Task 8: Add Athletic Mode and the two voice contracts

**Files:**
- Create: `src/edge-voice.ts`
- Create: `src/edge-voice.test.ts`
- Create: `src/components/edge/AthleticMode.tsx`
- Modify: `src/App.tsx`
- Modify: `src/edge.ts`

**Interfaces:**
- Produces: `getCoachLine(mode, context)` and Athletic Mode opt-in UI.

- [ ] **Step 1: Write voice tests**

```ts
it("reserves Push Coach for Athletic Mode", () => {
  expect(getCoachLine("default", { capacity: "available", call: "act" })).toBe(
    "You have enough capacity for one demanding move. Choose it and begin.",
  );
  expect(getCoachLine("athletic", { capacity: "available", call: "act" })).toBe(
    "The capacity is there. Stop negotiating with the first move. Take it.",
  );
});

it("never pushes through overload", () => {
  expect(getCoachLine("athletic", { capacity: "overloaded", call: "restore" })).toBe(
    "Redline is not courage. Cut the load, recover, then return ready.",
  );
});
```

- [ ] **Step 2: Implement fixed, auditable voice tables**

Do not generate coaching copy dynamically. Use typed lookup tables keyed by mode, capacity, and call so Voice Covenant review can inspect every line.

- [ ] **Step 3: Add explicit Athletic Mode opt-in**

Explain `52 completed Weekruns`, breaks allowed, no automatic next run, and Push Coach voice before confirmation. Disabling it preserves history.

- [ ] **Step 4: Count completion paths**

Call `completeAthleticWeekrun` from summit, complete, and meaningful recon summaries. Pass a stable run ID and rely on idempotence.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test -- src/edge-voice.test.ts src/edge-profile.test.ts
pnpm build
git add src/edge-voice.ts src/edge-voice.test.ts src/components/edge/AthleticMode.tsx src/App.tsx src/edge.ts
git commit -m "feat: add opt-in Athletic Mode coaching"
```

---

### Task 9: Generate the full Recraft tree and verify continuity

**Files:**
- Modify: `design/recraft/edge-tree.json`
- Add: remaining `public/assets/edge/**`
- Create: `design/recraft/asset-review.md`

**Interfaces:**
- Completes: all manifest assets used by `getEdgeAsset`.

- [ ] **Step 1: Dry-run the full manifest**

```bash
node design/recraft/generate-tree.mjs --all --dry-run > /tmp/edge-recraft-prompts.txt
```

Expected: one output per manifest node per five states; no missing parent or output errors.

- [ ] **Step 2: Generate in parent-first batches**

```bash
set -a && source ../../../.env && set +a
node design/recraft/generate-tree.mjs --all
```

Do not parallelise API calls beyond the Recraft limit implemented by the orchestrator. Resume by skipping outputs that already exist and match the manifest.

- [ ] **Step 3: Create contact sheets and review every lineage**

Use ImageMagick to create domain contact sheets. Record pass/fail for inherited force, fractal family, transition anchor, text absence, and state progression in `design/recraft/asset-review.md`. Regenerate failed nodes before continuing.

- [ ] **Step 4: Verify completeness**

```bash
pnpm test -- src/edge-assets.test.ts
find public/assets/edge -type f -name '*.webp' | wc -l
```

Expected image count: `manifest node count * 5`.

- [ ] **Step 5: Commit**

```bash
git add design/recraft public/assets/edge
git commit -m "feat: complete The Edge visual tree"
```

---

### Task 10: Correct public doctrine and release

**Files:**
- Modify: `README.md`
- Modify in `apps/hyper-drift`: `content/blog/the-ascent-software-that-rests-with-you.mdx`
- Modify in `apps/hyper-drift`: `src/lib/playground.ts`
- Add in `apps/hyper-drift`: refreshed Recraft-generated article/Playground images
- Modify in root: submodule pins

**Interfaces:**
- Makes public copy match the shipped Edge foundation.

- [ ] **Step 1: Rewrite the article around fulfilment and human balance**

The article thesis must be: The Edge helps a person understand the universal conditions that support meaningful action; Weekrun is one practice for applying that understanding. Software implementation belongs only in a short technical disclosure.

Include the immutable KPI tree, literal zoom experience, and public demo/repo links. Keep the article 400-700 words excluding details blocks.

- [ ] **Step 2: Align Playground copy**

Keep `Open demo` linked to `https://theascent.hyperdrift.io`. Replace Weekrun-only framing with The Edge as the human-capacity matrix and name Weekrun as the currently playable layer.

- [ ] **Step 3: Run complete local verification**

```bash
pnpm test
pnpm build
```

Browser matrix:

- desktop `1440x900`;
- mobile `390x844`;
- reduced motion;
- fresh profile;
- active Weekrun;
- default and Athletic modes;
- root -> domain -> KPI -> sub-KPI -> pattern -> evidence zoom;
- KPI search;
- daily reading persistence;
- Wikipedia link;
- overload red tint;
- return to exact Weekrun state.

Use screenshots and canvas pixel checks to prove the scene is nonblank, correctly framed, and free of overlap.

- [ ] **Step 4: Commit app and public-surface changes separately**

```bash
git commit -m "feat: launch The Edge foundation"
git commit -m "content: align The Edge public doctrine"
```

- [ ] **Step 5: Deploy through infra in a background subagent**

```bash
cd /Users/yannvr/dev/hyperdrift/infra
make deploy app=the-ascent
make check-launch-readiness app=the-ascent
make deploy app=hyperdrift
make check-launch-readiness app=hyperdrift
```

Expected: both readiness checks have zero failures.

- [ ] **Step 6: Verify live and resubmit sitemaps**

```bash
cd /Users/yannvr/dev/hyperdrift
scripts/.venv/bin/python scripts/growth/cli.py sitemap the-ascent
scripts/.venv/bin/python scripts/growth/cli.py sitemap hyperdrift
```

Confirm the live demo, public repo, article, Playground card, robots, sitemap, OG image, GA script, and all public links return HTTP 200.

---

## Self-Review Record

- Spec coverage: doctrine, immutable KPI tree, contextual sub-KPIs, search, recommendations, daily state, Wikipedia study, literal zoom, Recraft lineage, Weekrun contract, Athletic Mode, voice, public copy, and deploy are each assigned to a task.
- Type consistency: `CoreMetric`, tree paths, asset states, profile state, viewport state, and coaching modes are defined before consumers.
- Scope control: the existing daily Weekrun loop is adapted only at explicit read/return boundaries.
- Dependency control: `vitest` and `three` require explicit approval before installation.
- Asset cost control: one full lineage must pass before full-tree Recraft generation.
- Completeness scan: every implementation action names its file, interface, command, and expected result.
