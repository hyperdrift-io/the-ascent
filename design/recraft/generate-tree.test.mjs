import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ORCHESTRATOR = path.join(APP_ROOT, "design/recraft/generate-tree.mjs");
const MANIFEST = JSON.parse(fs.readFileSync(path.join(APP_ROOT, "design/recraft/edge-tree.json"), "utf8"));
const STATES = ["quiet", "available", "edge", "loaded", "overloaded"];
const tempDirectories = [];

function tempDirectory() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "edge-recraft-test-"));
  tempDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

function runGenerator(args, env = {}) {
  return spawnSync(process.execPath, [ORCHESTRATOR, ...args], {
    cwd: APP_ROOT,
    encoding: "utf8",
    env: { ...process.env, RECRAFT_API_KEY: "test-only", ...env },
  });
}

function dryRunEntries(...args) {
  const result = runGenerator([...args, "--dry-run"]);
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function writeExecutable(file, contents) {
  fs.writeFileSync(file, contents, { mode: 0o755 });
}

function createFakeTools(directory) {
  const generator = path.join(directory, "fake-generator.mjs");
  const magick = path.join(directory, "fake-magick.mjs");
  writeExecutable(generator, `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_GENERATOR_LOG, JSON.stringify(args) + "\\n");
if (process.env.FAKE_GENERATOR_FAIL === "1") process.exit(23);
const output = args[args.indexOf("--output") + 1];
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, "RIFF-fake-recraft-master-WEBP");
`);
  writeExecutable(magick, `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
if (args[0] === "identify") {
  const image = args.at(-1);
  if (!fs.existsSync(image) || fs.statSync(image).size === 0) process.exit(9);
  process.stdout.write(process.env.FAKE_INVALID_IMAGE === "1" ? "PNG|10x10|0" : "WEBP|1024x1024|0.125");
  process.exit(0);
}
const countPath = process.env.FAKE_MAGICK_COUNT;
const count = fs.existsSync(countPath) ? Number(fs.readFileSync(countPath, "utf8")) + 1 : 1;
fs.writeFileSync(countPath, String(count));
fs.appendFileSync(process.env.FAKE_MAGICK_LOG, JSON.stringify(args) + "\\n");
if (Number(process.env.FAKE_MAGICK_FAIL_AT || 0) === count) process.exit(31);
const input = args[0];
const output = args.at(-1);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, fs.readFileSync(input).toString() + "\\n" + args.slice(1, -1).join(" "));
`);
  return { generator, magick };
}

function fakeEnvironment(assetRoot) {
  const directory = tempDirectory();
  const tools = createFakeTools(directory);
  return {
    EDGE_ASSET_ROOT: assetRoot,
    EDGE_RECRAFT_GENERATOR_PATH: tools.generator,
    EDGE_MAGICK_PATH: tools.magick,
    FAKE_GENERATOR_LOG: path.join(directory, "generator.jsonl"),
    FAKE_MAGICK_LOG: path.join(directory, "magick.jsonl"),
    FAKE_MAGICK_COUNT: path.join(directory, "magick-count.txt"),
  };
}

function readJsonLines(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function clearFile(file) {
  fs.writeFileSync(file, "");
}

function generateApprovedFamily(assetRoot, env) {
  const result = runGenerator(["--node", "edge", "--force"], env);
  expect(result.status, result.stderr).toBe(0);
  clearFile(env.FAKE_GENERATOR_LOG);
  clearFile(env.FAKE_MAGICK_LOG);
  return path.join(assetRoot, "edge");
}

function singleNodeManifest() {
  const directory = tempDirectory();
  const manifestPath = path.join(directory, "edge-only.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...MANIFEST, nodes: [MANIFEST.nodes[0]] }));
  return manifestPath;
}

describe("Recraft tree orchestrator dry-run", () => {
  it("plans one master per node and derives every requested state from it", () => {
    const lineage = dryRunEntries("--lineage", "pressure.stress.anxiety");
    expect(lineage.filter((job) => job.type === "masterGeneration")).toHaveLength(4);
    expect(lineage.filter((job) => job.type === "derivedOutput")).toHaveLength(20);

    const complete = dryRunEntries("--all");
    expect(complete.filter((job) => job.type === "masterGeneration")).toHaveLength(67);
    expect(complete.filter((job) => job.type === "derivedOutput")).toHaveLength(335);
  });

  it("prints contained absolute outputs, decisions, prompt/model, and provenance mapping", () => {
    const entries = dryRunEntries("--node", "pressure.stress.anxiety");
    const master = entries.find((job) => job.type === "masterGeneration");
    const quiet = entries.find((job) => job.type === "derivedOutput" && job.state === "quiet");

    expect(master).toMatchObject({
      nodeId: "pressure.stress.anxiety",
      model: "recraftv4",
      size: "1024x1024",
      promptIntent: MANIFEST.nodes.find((node) => node.nodeId === "pressure.stress.anxiety").promptIntent,
    });
    expect(master.prompt).toContain("Mythic Natural Realism");
    expect(master.prompt).toContain("one master composition");
    expect(master.provenance).toBe(path.join(APP_ROOT, "public/assets/edge/pressure.stress.anxiety/provenance.json"));
    expect(path.isAbsolute(master.provenance)).toBe(true);
    expect(quiet.output).toBe(path.join(APP_ROOT, "public/assets/edge/pressure.stress.anxiety/quiet.webp"));
    expect(quiet.masterGeneration).toBe("pressure.stress.anxiety");
    expect(quiet.stateTreatment).toEqual(MANIFEST.generator.stateTreatment.quiet);
    expect(["generate", "skip-existing"]).toContain(quiet.decision);
  });

  it("shows force decisions without changing the selected job topology", () => {
    const normal = dryRunEntries("--node", "edge");
    const forced = dryRunEntries("--node", "edge", "--force");
    expect(normal).toHaveLength(6);
    expect(forced).toHaveLength(6);
    expect(normal.filter((job) => job.type === "derivedOutput").every((job) => job.decision === "skip-existing")).toBe(true);
    expect(forced.filter((job) => job.type === "derivedOutput").every((job) => job.decision === "generate-family")).toBe(true);
  });

  it("expands a forced state selector into complete composition families", () => {
    const entries = dryRunEntries("--state", "quiet", "--force");
    const masters = entries.filter((job) => job.type === "masterGeneration");
    const derived = entries.filter((job) => job.type === "derivedOutput");

    expect(masters).toHaveLength(67);
    expect(derived).toHaveLength(335);
    expect(derived.filter((job) => job.requested)).toHaveLength(67);
    expect(derived.filter((job) => job.integrityRequired)).toHaveLength(268);
    expect(derived.every((job) => job.decision === "generate-family")).toBe(true);
  });
});

describe("Recraft tree orchestrator safety", () => {
  it("rejects traversal-bearing node IDs and output patterns before generation", () => {
    const directory = tempDirectory();
    const traversalNode = structuredClone(MANIFEST);
    traversalNode.nodes[0].nodeId = "edge/../../outside";
    const traversalNodePath = path.join(directory, "traversal-node.json");
    fs.writeFileSync(traversalNodePath, JSON.stringify(traversalNode));
    const badNode = runGenerator(["--all", "--dry-run"], { EDGE_TREE_MANIFEST_PATH: traversalNodePath });
    expect(badNode.status).toBe(1);
    expect(badNode.stderr).toContain("Unsafe Edge nodeId");

    const traversalOutput = structuredClone(MANIFEST);
    traversalOutput.generator.outputPattern = "../outside/{nodeId}/{state}.webp";
    const traversalOutputPath = path.join(directory, "traversal-output.json");
    fs.writeFileSync(traversalOutputPath, JSON.stringify(traversalOutput));
    const badOutput = runGenerator(["--all", "--dry-run"], { EDGE_TREE_MANIFEST_PATH: traversalOutputPath });
    expect(badOutput.status).toBe(1);
    expect(badOutput.stderr).toContain("Unsafe output pattern");
  });

  it.each([
    ["Recraft generation", { FAKE_GENERATOR_FAIL: "1" }],
    ["ImageMagick derivation", { FAKE_MAGICK_FAIL_AT: "2" }],
    ["codec, dimension, or blank-image validation", { FAKE_INVALID_IMAGE: "1" }],
  ])("leaves every approved output untouched after a %s failure", (_label, failureEnvironment) => {
    const root = tempDirectory();
    const assetRoot = path.join(root, "public/assets/edge");
    for (const state of STATES) {
      fs.mkdirSync(path.join(assetRoot, "edge"), { recursive: true });
      fs.writeFileSync(path.join(assetRoot, "edge", `${state}.webp`), `approved-${state}`);
    }
    const env = { ...fakeEnvironment(assetRoot), ...failureEnvironment };
    const result = runGenerator(["--node", "edge", "--force"], env);
    expect(result.status).toBe(1);
    for (const state of STATES) {
      expect(fs.readFileSync(path.join(assetRoot, "edge", `${state}.webp`), "utf8")).toBe(`approved-${state}`);
    }
    expect(fs.readdirSync(path.dirname(assetRoot)).filter((name) => name.includes("staging"))).toEqual([]);
  });

  it("does not overwrite approved files without force", () => {
    const root = tempDirectory();
    const assetRoot = path.join(root, "public/assets/edge");
    const env = fakeEnvironment(assetRoot);
    const nodeRoot = generateApprovedFamily(assetRoot, env);
    const result = runGenerator(["--node", "edge"], env);
    expect(result.status, result.stderr).toBe(0);
    expect(readJsonLines(env.FAKE_GENERATOR_LOG)).toHaveLength(0);
    for (const state of STATES) {
      expect(fs.existsSync(path.join(nodeRoot, `${state}.webp`))).toBe(true);
    }
  });

  it.each(["tampered output", "partial family", "stale provenance"])(
    "rejects a %s before invoking Recraft unless force is explicit",
    (failure) => {
      const root = tempDirectory();
      const assetRoot = path.join(root, "public/assets/edge");
      const env = fakeEnvironment(assetRoot);
      const nodeRoot = generateApprovedFamily(assetRoot, env);

      if (failure === "tampered output") fs.appendFileSync(path.join(nodeRoot, "quiet.webp"), "tampered");
      if (failure === "partial family") fs.rmSync(path.join(nodeRoot, "available.webp"));
      if (failure === "stale provenance") {
        const provenancePath = path.join(nodeRoot, "provenance.json");
        const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
        provenance.manifestVersion = "1.0.0";
        fs.writeFileSync(provenancePath, JSON.stringify(provenance));
      }

      const result = runGenerator(["--node", "edge"], env);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("asset family integrity");
      expect(readJsonLines(env.FAKE_GENERATOR_LOG)).toHaveLength(0);
      expect(fs.readdirSync(path.dirname(assetRoot)).filter((name) => name.includes("staging"))).toEqual([]);
    },
  );

  it("publishes five derived states from one exact master with complete provenance", () => {
    const root = tempDirectory();
    const assetRoot = path.join(root, "public/assets/edge");
    const env = fakeEnvironment(assetRoot);
    const result = runGenerator(["--node", "edge"], env);
    expect(result.status, result.stderr).toBe(0);
    expect(readJsonLines(env.FAKE_GENERATOR_LOG)).toHaveLength(1);
    const derivations = readJsonLines(env.FAKE_MAGICK_LOG);
    expect(derivations).toHaveLength(5);
    expect(new Set(derivations.map((args) => args[0])).size).toBe(1);
    expect(new Set(STATES.map((state) => fs.readFileSync(path.join(assetRoot, "edge", `${state}.webp`), "utf8"))).size).toBe(5);

    const provenance = JSON.parse(fs.readFileSync(path.join(assetRoot, "edge/provenance.json"), "utf8"));
    expect(provenance).toMatchObject({
      manifestVersion: MANIFEST.version,
      model: "recraftv4",
      size: "1024x1024",
      promptIntent: MANIFEST.nodes[0].promptIntent,
      stateStrategy: MANIFEST.generator.masterStrategy,
    });
    expect(provenance.masterPrompt).toContain("one master composition");
    expect(provenance.masterSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(provenance.stateMappings)).toEqual(STATES);
    expect(Object.values(provenance.stateMappings).every((mapping) => mapping.masterSha256 === provenance.masterSha256)).toBe(true);
    for (const state of STATES) {
      const mapping = provenance.stateMappings[state];
      expect(mapping.output).toBe(`public/assets/edge/edge/${state}.webp`);
      expect(path.isAbsolute(mapping.output)).toBe(false);
      expect(mapping.outputSha256).toBe(sha256(path.join(assetRoot, "edge", `${state}.webp`)));
    }
    const availability = JSON.parse(fs.readFileSync(path.join(assetRoot, "availability.json"), "utf8"));
    expect(availability).toEqual({
      schema: "https://hyperdrift.io/schemas/edge-asset-availability/v1",
      manifestVersion: MANIFEST.version,
      nodes: ["edge"],
    });
  });

  it("regenerates all five companions for a forced state selector", () => {
    const root = tempDirectory();
    const assetRoot = path.join(root, "public/assets/edge");
    const env = { ...fakeEnvironment(assetRoot), EDGE_TREE_MANIFEST_PATH: singleNodeManifest() };
    const result = runGenerator(["--state", "quiet", "--force"], env);

    expect(result.status, result.stderr).toBe(0);
    expect(readJsonLines(env.FAKE_GENERATOR_LOG)).toHaveLength(1);
    expect(readJsonLines(env.FAKE_MAGICK_LOG)).toHaveLength(5);
    const provenance = JSON.parse(fs.readFileSync(path.join(assetRoot, "edge/provenance.json"), "utf8"));
    expect(Object.keys(provenance.stateMappings)).toEqual(STATES);
  });

  it("commits verifiable hashes for every current vertical-slice output", () => {
    for (const nodeId of ["edge", "pressure", "pressure.stress", "pressure.stress.anxiety"]) {
      const nodeRoot = path.join(APP_ROOT, "public/assets/edge", nodeId);
      const provenance = JSON.parse(fs.readFileSync(path.join(nodeRoot, "provenance.json"), "utf8"));
      for (const state of STATES) {
        expect(provenance.stateMappings[state].output).toBe(`public/assets/edge/${nodeId}/${state}.webp`);
        expect(provenance.stateMappings[state].outputSha256).toBe(sha256(path.join(nodeRoot, `${state}.webp`)));
      }
    }
  });

  it("commits an availability index for exactly the generated vertical slice", () => {
    const availability = JSON.parse(fs.readFileSync(path.join(APP_ROOT, "public/assets/edge/availability.json"), "utf8"));
    expect(availability.nodes).toEqual(["edge", "pressure", "pressure.stress", "pressure.stress.anxiety"]);
    expect(availability.manifestVersion).toBe(MANIFEST.version);
  });
});
