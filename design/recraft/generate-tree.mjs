#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(scriptPath);
const appRoot = path.resolve(scriptDirectory, "../..");
const defaultManifestPath = path.join(scriptDirectory, "edge-tree.json");
const expectedStates = ["quiet", "available", "edge", "loaded", "overloaded"];
const safeNodeId = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const provenanceGeneratorPath = "../../../../scripts/generate-recraft-asset.mjs";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function resolveContainedPath(root, ...segments) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...segments);
  invariant(
    resolved === resolvedRoot || resolved.startsWith(`${resolvedRoot}${path.sep}`),
    `Unsafe output path outside ${resolvedRoot}: ${resolved}`,
  );
  return resolved;
}

export function validateManifestData(manifest, assetRoot) {
  invariant(manifest && Array.isArray(manifest.nodes), "Invalid Edge asset manifest");
  invariant(manifest.schema === "https://hyperdrift.io/schemas/edge-recraft-tree/v2", "Invalid Edge asset manifest schema");
  invariant(typeof manifest.version === "string" && /^2\./.test(manifest.version), "Invalid Edge asset manifest version");
  invariant(manifest.generator?.outputPattern === "public/assets/edge/{nodeId}/{state}.webp", "Unsafe output pattern in Edge asset manifest");
  for (const field of ["path", "model", "size", "masterStrategy", "promptTemplateVersion", "promptTemplateIntent", "accessibilityPurpose"]) {
    invariant(typeof manifest.generator?.[field] === "string" && manifest.generator[field].trim(), `Missing generator ${field}`);
  }
  invariant(manifest.generator.size === "1024x1024", "Unsupported Recraft master size");
  invariant(
    JSON.stringify(Object.keys(manifest.generator.stateTreatment ?? {})) === JSON.stringify(expectedStates),
    "Invalid state treatment mapping",
  );

  const nodes = new Map();
  for (const node of manifest.nodes) {
    invariant(node && typeof node.nodeId === "string" && safeNodeId.test(node.nodeId), `Unsafe Edge nodeId: ${node?.nodeId}`);
    invariant(!nodes.has(node.nodeId), `Duplicate Edge nodeId: ${node.nodeId}`);
    for (const field of ["force", "fractalFamily", "transitionAnchor", "wikipedia", "alt", "promptIntent", "accessibilityPurpose"]) {
      invariant(typeof node[field] === "string" && node[field].trim(), `Missing ${field} for Edge asset node: ${node.nodeId}`);
    }
    invariant(Array.isArray(node.palette) && node.palette.length >= 3, `Missing palette for Edge asset node: ${node.nodeId}`);
    invariant(JSON.stringify(node.states) === JSON.stringify(expectedStates), `Invalid states for Edge asset node: ${node.nodeId}`);
    for (const state of node.states) resolveContainedPath(assetRoot, node.nodeId, `${state}.webp`);
    resolveContainedPath(assetRoot, node.nodeId, "provenance.json");
    nodes.set(node.nodeId, node);
  }

  for (const node of nodes.values()) {
    if (node.nodeId === "edge") invariant(node.parentId === null, "The Edge root cannot have a parent");
    else invariant(nodes.has(node.parentId), `Unknown parent for Edge asset node: ${node.nodeId}`);
  }
  return nodes;
}

export function parseArgs(argv) {
  const result = { node: null, state: null, lineage: null, all: false, dryRun: false, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run") result.dryRun = true;
    else if (token === "--force") result.force = true;
    else if (token === "--all") result.all = true;
    else if (["--node", "--state", "--lineage"].includes(token)) {
      const value = argv[index + 1];
      invariant(value && !value.startsWith("--"), `Missing value for ${token}`);
      result[token.slice(2)] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${token}`);
  }
  return result;
}

function lineage(node, nodes) {
  const result = [];
  const visited = new Set();
  let current = node;
  while (current) {
    invariant(!visited.has(current.nodeId), `Cyclic lineage for Edge asset node: ${node.nodeId}`);
    visited.add(current.nodeId);
    result.unshift(current);
    current = current.parentId === null ? null : nodes.get(current.parentId);
  }
  invariant(result[0]?.nodeId === "edge", `Broken lineage for Edge asset node: ${node.nodeId}`);
  return result;
}

function inheritedDna(node, nodes) {
  return lineage(node, nodes)
    .slice(0, -1)
    .map((ancestor) => `${ancestor.nodeId}: ${ancestor.force}; ${ancestor.fractalFamily}; anchor ${ancestor.transitionAnchor}`)
    .join(" | ") || "root source: the universal living mountain watershed";
}

export function masterPromptFor(node, nodes, manifest) {
  const palette = node.palette.filter((colour) => !/(crimson|coral|rose|ember|arterial)/i.test(colour));
  return [
    "Mythic Natural Realism, cinematic square environmental artwork with tactile stone, weather, water, roots, and living light.",
    `Create one master composition for node ${node.nodeId}; all five capacity states will be deterministic treatments of this exact Recraft scene, so do not encode a capacity state or warning tint in the composition itself.`,
    `Prompt intent: ${node.promptIntent}`,
    `Universal human-capacity force: ${node.force}. This identity is universal and independent of any aim, goal, profession, or sport.`,
    `Fractal family: ${node.fractalFamily}. Parent geometry must visibly become child geography rather than a separate icon or panel.`,
    `Inherited parent visual DNA: ${inheritedDna(node, nodes)}.`,
    `Transition anchor: preserve and clarify ${node.transitionAnchor}.`,
    `Neutral master palette: ${palette.join(", ")}, warm natural gold, balanced full tonal range suitable for later cool, clear, amber, and controlled-crimson grading.`,
    `Accessibility purpose: ${node.accessibilityPurpose}`,
    `Pipeline intent ${manifest.generator.promptTemplateVersion}: ${manifest.generator.promptTemplateIntent}`,
    "Single immersive natural world, inspectable detail, coherent central landmark, no decorative bokeh, no gradient blobs.",
    "No embedded text, numbers, or logos. No interface, cards, frames, badges, charts, people, faces, medical symbols, diagnoses, or aim-specific objects.",
  ].join(" ");
}

function selectedNodesAndStates(args, nodes) {
  const selectorCount = Number(Boolean(args.node)) + Number(Boolean(args.state)) + Number(Boolean(args.lineage)) + Number(args.all);
  invariant(selectorCount === 1, "Choose exactly one selector: --node, --state, --lineage, or --all");
  if (args.state) invariant(expectedStates.includes(args.state), `Unknown Edge state: ${args.state}`);
  if (args.node) invariant(safeNodeId.test(args.node) && nodes.has(args.node), `Unknown Edge node: ${args.node}`);
  if (args.lineage) invariant(safeNodeId.test(args.lineage) && nodes.has(args.lineage), `Unknown Edge node: ${args.lineage}`);

  return {
    nodes: args.node ? [nodes.get(args.node)] : args.lineage ? lineage(nodes.get(args.lineage), nodes) : [...nodes.values()],
    requestedState: args.state,
  };
}

function stableOutputPath(nodeId, state) {
  return `public/assets/edge/${nodeId}/${state}.webp`;
}

function sameValue(left, right) {
  return isDeepStrictEqual(left, right);
}

function assessExistingFamily(node, manifest, assetRoot, prompt) {
  const provenancePath = resolveContainedPath(assetRoot, node.nodeId, "provenance.json");
  const outputs = Object.fromEntries(expectedStates.map((state) => [
    state,
    resolveContainedPath(assetRoot, node.nodeId, `${state}.webp`),
  ]));
  const present = [provenancePath, ...Object.values(outputs)].filter((file) => fs.existsSync(file));
  if (present.length === 0) return { status: "missing", reason: "no approved family exists" };
  if (present.length !== expectedStates.length + 1) {
    return { status: "invalid", reason: "the five outputs and provenance file are not all present" };
  }

  let provenance;
  try {
    provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
  } catch (error) {
    return { status: "invalid", reason: `provenance is not valid JSON: ${error.message}` };
  }

  const identityChecks = [
    [provenance.schema === manifest.schema, "schema"],
    [provenance.manifestVersion === manifest.version, "manifest version"],
    [provenance.generatorPath === provenanceGeneratorPath, "generator path"],
    [provenance.model === manifest.generator.model, "model"],
    [provenance.size === manifest.generator.size, "size"],
    [provenance.masterPrompt === prompt, "master prompt"],
    [provenance.promptTemplateVersion === manifest.generator.promptTemplateVersion, "prompt template version"],
    [provenance.promptIntent === node.promptIntent, "prompt intent"],
    [provenance.accessibilityPurpose === node.accessibilityPurpose, "accessibility purpose"],
    [provenance.stateStrategy === manifest.generator.masterStrategy, "state strategy"],
    [/^[a-f0-9]{64}$/.test(provenance.masterSha256 ?? ""), "master SHA-256"],
    [sameValue(Object.keys(provenance.stateMappings ?? {}), expectedStates), "state mappings"],
  ];
  const staleIdentity = identityChecks.find(([matches]) => !matches);
  if (staleIdentity) return { status: "invalid", reason: `provenance ${staleIdentity[1]} does not match the current manifest` };

  for (const state of expectedStates) {
    const mapping = provenance.stateMappings[state];
    if (mapping.output !== stableOutputPath(node.nodeId, state)) {
      return { status: "invalid", reason: `${state} output path is not portable` };
    }
    if (!sameValue(mapping.treatment, manifest.generator.stateTreatment[state])) {
      return { status: "invalid", reason: `${state} treatment does not match the current manifest` };
    }
    if (mapping.masterSha256 !== provenance.masterSha256 || mapping.lineage !== "derived-from-this-master") {
      return { status: "invalid", reason: `${state} master lineage does not match provenance` };
    }
    if (!/^[a-f0-9]{64}$/.test(mapping.outputSha256 ?? "") || mapping.outputSha256 !== sha256(outputs[state])) {
      return { status: "invalid", reason: `${state} output SHA-256 does not match the approved WebP` };
    }
  }
  return { status: "valid", reason: "all five outputs match current provenance and SHA-256 hashes" };
}

export function planInvocation(args, manifest, nodes, assetRoot) {
  const selection = selectedNodesAndStates(args, nodes);
  return selection.nodes.map((node) => {
    const provenance = resolveContainedPath(assetRoot, node.nodeId, "provenance.json");
    const prompt = masterPromptFor(node, nodes, manifest);
    const familyIntegrity = assessExistingFamily(node, manifest, assetRoot, prompt);
    if (familyIntegrity.status === "invalid" && !args.force) {
      throw new Error(`Existing Edge asset family integrity failed for ${node.nodeId}: ${familyIntegrity.reason}. Use --force to regenerate all five states atomically.`);
    }
    const decision = args.force || familyIntegrity.status === "missing" ? "generate-family" : "skip-existing";
    const derived = expectedStates.map((state) => {
      const output = resolveContainedPath(assetRoot, node.nodeId, `${state}.webp`);
      return {
        type: "derivedOutput",
        nodeId: node.nodeId,
        state,
        masterGeneration: node.nodeId,
        output,
        provenance,
        stateTreatment: manifest.generator.stateTreatment[state],
        decision,
        requested: selection.requestedState === null || selection.requestedState === state,
        integrityRequired: selection.requestedState !== null && selection.requestedState !== state,
        familyIntegrity,
        force: args.force,
      };
    });
    return {
      node,
      master: {
        type: "masterGeneration",
        nodeId: node.nodeId,
        stagingOutputPattern: path.join(path.dirname(assetRoot), ".edge-tree-staging-<invocation>", "masters", `${node.nodeId}.webp`),
        provenance,
        prompt,
        promptIntent: node.promptIntent,
        model: manifest.generator.model,
        size: manifest.generator.size,
        masterStrategy: manifest.generator.masterStrategy,
        decision,
        requestedState: selection.requestedState,
        familyIntegrity,
        force: args.force,
      },
      derived,
    };
  });
}

function findWorkspaceGenerator(manifest) {
  if (process.env.EDGE_RECRAFT_GENERATOR_PATH) return path.resolve(process.env.EDGE_RECRAFT_GENERATOR_PATH);
  const candidates = [];
  if (process.env.HYPERDRIFT_ROOT) candidates.push(path.resolve(process.env.HYPERDRIFT_ROOT));
  let current = appRoot;
  while (true) {
    candidates.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  for (const root of candidates) {
    const candidate = path.resolve(root, manifest.generator.path.replace(/^\.\.\/\.\.\/\.\.\//, ""));
    if (fs.existsSync(candidate)) return candidate;
    const canonical = path.join(root, "scripts/generate-recraft-asset.mjs");
    if (fs.existsSync(canonical)) return canonical;
  }
  throw new Error(`Could not locate ${manifest.generator.path}`);
}

function runCommand(command, args, label) {
  const result = spawnSync(command, args, { cwd: appRoot, env: process.env, encoding: "utf8" });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} with status ${result.status}: ${result.stderr.trim()}`);
  return result.stdout;
}

function validateImage(file, magick, size) {
  invariant(fs.existsSync(file) && fs.statSync(file).size > 0, `Missing generated image: ${file}`);
  const details = runCommand(
    magick,
    ["identify", "-format", "%m|%wx%h|%[standard-deviation]", file],
    `Image validation failed for ${file}`,
  ).trim();
  const [codec, dimensions, deviation] = details.split("|");
  invariant(codec === "WEBP", `Invalid codec for ${file}: ${codec}`);
  invariant(dimensions === size, `Invalid dimensions for ${file}: ${dimensions}`);
  invariant(Number.isFinite(Number(deviation)) && Number(deviation) > 0.0001, `Blank generated image: ${file}`);
}

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writeProvenance(file, nodePlan, manifest, masterFile, stagedTree) {
  const masterSha256 = sha256(masterFile);
  const stateMappings = Object.fromEntries(nodePlan.derived.map((job) => [job.state, {
    output: stableOutputPath(nodePlan.node.nodeId, job.state),
    outputSha256: sha256(resolveContainedPath(stagedTree, nodePlan.node.nodeId, `${job.state}.webp`)),
    treatment: job.stateTreatment,
    masterSha256,
    lineage: "derived-from-this-master",
  }]));
  const provenance = {
    schema: manifest.schema,
    manifestVersion: manifest.version,
    generatorPath: provenanceGeneratorPath,
    model: manifest.generator.model,
    size: manifest.generator.size,
    masterPrompt: nodePlan.master.prompt,
    promptTemplateVersion: manifest.generator.promptTemplateVersion,
    promptIntent: nodePlan.node.promptIntent,
    accessibilityPurpose: nodePlan.node.accessibilityPurpose,
    stateStrategy: manifest.generator.masterStrategy,
    masterSha256,
    stateMappings,
  };
  fs.writeFileSync(file, `${JSON.stringify(provenance, null, 2)}\n`);
}

function writeAvailabilityIndex(stagedTree, manifest) {
  const nodes = manifest.nodes
    .filter((node) => [
      resolveContainedPath(stagedTree, node.nodeId, "provenance.json"),
      ...expectedStates.map((state) => resolveContainedPath(stagedTree, node.nodeId, `${state}.webp`)),
    ].every((file) => fs.existsSync(file) && fs.statSync(file).size > 0))
    .map((node) => node.nodeId);
  invariant(nodes[0] === "edge", "The generated availability index requires the Edge root family");
  const index = {
    schema: "https://hyperdrift.io/schemas/edge-asset-availability/v1",
    manifestVersion: manifest.version,
    nodes,
  };
  fs.writeFileSync(resolveContainedPath(stagedTree, "availability.json"), `${JSON.stringify(index, null, 2)}\n`);
}

function publishStagedTree(stagedTree, assetRoot, stagingRoot) {
  const backup = path.join(path.dirname(assetRoot), `.edge-tree-backup-${process.pid}-${randomUUID()}`);
  const hadOriginal = fs.existsSync(assetRoot);
  if (hadOriginal) fs.renameSync(assetRoot, backup);
  try {
    fs.renameSync(stagedTree, assetRoot);
  } catch (error) {
    if (hadOriginal && !fs.existsSync(assetRoot)) fs.renameSync(backup, assetRoot);
    throw error;
  }
  if (hadOriginal) fs.rmSync(backup, { recursive: true, force: true });
  fs.rmSync(stagingRoot, { recursive: true, force: true });
}

export function executeInvocation(plans, manifest, assetRoot) {
  const generating = plans.filter((plan) => plan.master.decision === "generate-family");
  if (generating.length === 0) return;
  const rootWillExist = generating.some((plan) => plan.node.nodeId === "edge") || [
    resolveContainedPath(assetRoot, "edge", "provenance.json"),
    ...expectedStates.map((state) => resolveContainedPath(assetRoot, "edge", `${state}.webp`)),
  ].every((file) => fs.existsSync(file) && fs.statSync(file).size > 0);
  invariant(rootWillExist, "The generated availability index requires the Edge root family");
  invariant(process.env.RECRAFT_API_KEY, "Set RECRAFT_API_KEY in the environment");

  const generator = findWorkspaceGenerator(manifest);
  const magick = process.env.EDGE_MAGICK_PATH ? path.resolve(process.env.EDGE_MAGICK_PATH) : "magick";
  const stagingRoot = path.join(path.dirname(assetRoot), `.edge-tree-staging-${process.pid}-${randomUUID()}`);
  const stagedTree = path.join(stagingRoot, "edge");
  const masters = path.join(stagingRoot, "masters");

  try {
    fs.mkdirSync(stagingRoot, { recursive: true });
    if (fs.existsSync(assetRoot)) fs.cpSync(assetRoot, stagedTree, { recursive: true, preserveTimestamps: true });
    else fs.mkdirSync(stagedTree, { recursive: true });
    fs.mkdirSync(masters, { recursive: true });

    for (const plan of generating) {
      const masterFile = resolveContainedPath(masters, `${plan.node.nodeId}.webp`);
      runCommand(
        process.execPath,
        [generator, "--output", masterFile, "--prompt", plan.master.prompt, "--model", manifest.generator.model, "--size", manifest.generator.size],
        `Recraft generator failed for ${plan.node.nodeId}`,
      );
      validateImage(masterFile, magick, manifest.generator.size);

      for (const job of plan.derived) {
        const stagedOutput = resolveContainedPath(stagedTree, plan.node.nodeId, `${job.state}.webp`);
        fs.mkdirSync(path.dirname(stagedOutput), { recursive: true });
        runCommand(
          magick,
          [masterFile, "-colorspace", "sRGB", ...job.stateTreatment.magickArgs, "-strip", "-quality", "84", "-define", "webp:method=6", stagedOutput],
          `ImageMagick derivation failed for ${plan.node.nodeId}/${job.state}`,
        );
        validateImage(stagedOutput, magick, manifest.generator.size);
      }

      const stagedProvenance = resolveContainedPath(stagedTree, plan.node.nodeId, "provenance.json");
      fs.mkdirSync(path.dirname(stagedProvenance), { recursive: true });
      writeProvenance(stagedProvenance, plan, manifest, masterFile, stagedTree);
    }

    writeAvailabilityIndex(stagedTree, manifest);
    publishStagedTree(stagedTree, assetRoot, stagingRoot);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const manifestPath = process.env.EDGE_TREE_MANIFEST_PATH ? path.resolve(process.env.EDGE_TREE_MANIFEST_PATH) : defaultManifestPath;
  const assetRoot = process.env.EDGE_ASSET_ROOT ? path.resolve(process.env.EDGE_ASSET_ROOT) : path.join(appRoot, "public/assets/edge");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const nodes = validateManifestData(manifest, assetRoot);
  const plans = planInvocation(args, manifest, nodes, assetRoot);

  if (args.dryRun) {
    for (const plan of plans) {
      process.stdout.write(`${JSON.stringify(plan.master)}\n`);
      for (const job of plan.derived) process.stdout.write(`${JSON.stringify(job)}\n`);
    }
    return;
  }
  executeInvocation(plans, manifest, assetRoot);
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
