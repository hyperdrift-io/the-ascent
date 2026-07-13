#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDirectory, "../..");
const manifestPath = path.join(scriptDirectory, "edge-tree.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedStates = ["quiet", "available", "edge", "loaded", "overloaded"];
const stateDirection = {
  quiet: "low-intensity equilibrium, open space, cool clear air, the force resting without disappearing",
  available: "balanced readiness, full natural colour, generous light, the force easy to access",
  edge: "focused high capacity, stronger contrast and movement, luminous detail at the transition anchor",
  loaded: "compressed demand, denser weather and shadow, amber mineral warning, capacity still visible",
  overloaded: "danger threshold, controlled crimson atmospheric wash and tightened space, never gore or judgment",
};

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = { node: null, state: null, lineage: null, all: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") result.dryRun = true;
    else if (token === "--all") result.all = true;
    else if (["--node", "--state", "--lineage"].includes(token)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) fail(`Missing value for ${token}`);
      result[token.slice(2)] = value;
      index += 1;
    } else fail(`Unknown argument: ${token}`);
  }
  return result;
}

function validateManifest() {
  if (!manifest || !Array.isArray(manifest.nodes)) fail("Invalid Edge asset manifest");
  const nodes = new Map();
  for (const node of manifest.nodes) {
    if (!node || typeof node.nodeId !== "string" || nodes.has(node.nodeId)) {
      fail("Every Edge asset node must have a unique nodeId");
    }
    for (const field of ["force", "fractalFamily", "transitionAnchor", "wikipedia", "alt"]) {
      if (typeof node[field] !== "string" || node[field].trim().length === 0) {
        fail(`Missing ${field} for Edge asset node: ${node.nodeId}`);
      }
    }
    if (!Array.isArray(node.palette) || node.palette.length < 3) fail(`Missing palette for Edge asset node: ${node.nodeId}`);
    if (JSON.stringify(node.states) !== JSON.stringify(expectedStates)) fail(`Invalid states for Edge asset node: ${node.nodeId}`);
    nodes.set(node.nodeId, node);
  }
  for (const node of nodes.values()) {
    if (node.nodeId === "edge") {
      if (node.parentId !== null) fail("The Edge root cannot have a parent");
    } else if (!nodes.has(node.parentId)) fail(`Unknown parent for Edge asset node: ${node.nodeId}`);
  }
  return nodes;
}

function findWorkspaceGenerator() {
  const candidates = [];
  if (process.env.HYPERDRIFT_ROOT) candidates.push(process.env.HYPERDRIFT_ROOT);
  let current = appRoot;
  while (true) {
    candidates.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  for (const root of candidates) {
    const candidate = path.join(root, "scripts/generate-recraft-asset.mjs");
    if (fs.existsSync(candidate)) return candidate;
  }
  fail("Could not locate scripts/generate-recraft-asset.mjs");
}

function lineage(node, nodes) {
  const result = [];
  let current = node;
  while (current) {
    result.unshift(current);
    current = current.parentId === null ? null : nodes.get(current.parentId);
  }
  if (result[0]?.nodeId !== "edge") fail(`Broken lineage for Edge asset node: ${node.nodeId}`);
  return result;
}

function inheritedDna(node, nodes) {
  return lineage(node, nodes)
    .slice(0, -1)
    .map((ancestor) => `${ancestor.nodeId}: ${ancestor.force}; ${ancestor.fractalFamily}; anchor ${ancestor.transitionAnchor}`)
    .join(" | ") || "root source: the universal living mountain watershed";
}

function paletteFor(node, state) {
  if (state === "overloaded") return node.palette;
  const calmPalette = node.palette.filter((colour) => !/(crimson|coral|rose|ember|arterial)/i.test(colour));
  return state === "loaded" ? [...calmPalette, "muted amber warning"] : calmPalette;
}

function promptFor(node, state, nodes) {
  return [
    "Mythic Natural Realism, cinematic square environmental artwork with tactile stone, weather, water, roots, and living light.",
    `Universal human-capacity force: ${node.force}. This identity is universal and independent of any aim, goal, profession, or sport.`,
    `Fractal family: ${node.fractalFamily}. Parent geometry must visibly become child geography rather than a separate icon or panel.`,
    `Inherited parent visual DNA: ${inheritedDna(node, nodes)}.`,
    `Transition anchor: preserve and clarify ${node.transitionAnchor}.`,
    `State palette: ${paletteFor(node, state).join(", ")}.`,
    `Capacity state ${state}: ${stateDirection[state]}. Red is a controlled danger wash only in the overloaded state, never a moral judgment.`,
    "Single immersive natural world, inspectable detail, coherent central landmark, no decorative bokeh, no gradient blobs.",
    "No embedded text, numbers, or logos. No interface, cards, frames, badges, charts, people, faces, medical symbols, diagnoses, or aim-specific objects.",
  ].join(" ");
}

function stateTreatment(state) {
  if (state === "quiet") return ["-modulate", "92,62,100"];
  if (state === "available") return ["-modulate", "100,82,100"];
  if (state === "edge") return ["-modulate", "106,90,100", "-contrast-stretch", "1%x1%"];
  if (state === "loaded") return ["-modulate", "90,84,100", "-fill", "#ad782f", "-colorize", "12"];
  return ["-modulate", "78,105,100", "-fill", "#9b1f2b", "-colorize", "28"];
}

function optimizeWebp(output, state) {
  const optimized = `${output}.optimized.webp`;
  const result = spawnSync("magick", [
    output,
    "-colorspace", "sRGB",
    ...stateTreatment(state),
    "-strip", "-quality", "84", "-define", "webp:method=6",
    optimized,
  ], {
    cwd: appRoot,
    encoding: "utf8",
  });
  if (result.error) fail(`ImageMagick failed for ${output}: ${result.error.message}`);
  if (result.status !== 0) fail(`ImageMagick failed for ${output}: ${result.stderr.trim()}`);
  fs.renameSync(optimized, output);
}

function selections(args, nodes) {
  const selectorCount = Number(Boolean(args.node)) + Number(Boolean(args.state)) + Number(Boolean(args.lineage)) + Number(args.all);
  if (selectorCount !== 1) fail("Choose exactly one selector: --node, --state, --lineage, or --all");
  if (args.state && !expectedStates.includes(args.state)) fail(`Unknown Edge state: ${args.state}`);
  if (args.node && !nodes.has(args.node)) fail(`Unknown Edge node: ${args.node}`);
  if (args.lineage && !nodes.has(args.lineage)) fail(`Unknown Edge node: ${args.lineage}`);

  const selectedNodes = args.node ? [nodes.get(args.node)]
    : args.lineage ? lineage(nodes.get(args.lineage), nodes)
      : [...nodes.values()];
  const selectedStates = args.state ? [args.state] : expectedStates;
  return selectedNodes.flatMap((node) => selectedStates.map((state) => ({ node, state })));
}

const args = parseArgs(process.argv.slice(2));
const nodes = validateManifest();
const jobs = selections(args, nodes).map(({ node, state }) => ({
  nodeId: node.nodeId,
  state,
  output: path.join(appRoot, "public/assets/edge", node.nodeId, `${state}.webp`),
  prompt: promptFor(node, state, nodes),
  optimization: `state tint ${state}, WebP quality 84, metadata stripped`,
}));

if (args.dryRun) {
  for (const job of jobs) process.stdout.write(`${JSON.stringify(job)}\n`);
  process.exit(0);
}

if (!process.env.RECRAFT_API_KEY) fail("Set RECRAFT_API_KEY in the environment");
const generator = findWorkspaceGenerator();
for (const job of jobs) {
  fs.mkdirSync(path.dirname(job.output), { recursive: true });
  const result = spawnSync(process.execPath, [generator, "--output", job.output, "--prompt", job.prompt, "--model", "recraftv4", "--size", "1024x1024"], {
    cwd: appRoot,
    env: process.env,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error) fail(`Recraft generator failed for ${job.nodeId}/${job.state}: ${result.error.message}`);
  if (result.status !== 0) fail(`Recraft generator failed for ${job.nodeId}/${job.state} with status ${result.status}`);
  if (!fs.existsSync(job.output) || fs.statSync(job.output).size === 0) fail(`Missing Recraft output: ${job.output}`);
  optimizeWebp(job.output, job.state);
}
