import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ORCHESTRATOR = path.join(APP_ROOT, "design/recraft/generate-tree.mjs");

function runGenerator(...args) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "edge-recraft-test-"));
  const stdoutPath = path.join(directory, "stdout.jsonl");
  const stdout = fs.openSync(stdoutPath, "w");
  try {
    const result = spawnSync(process.execPath, [ORCHESTRATOR, ...args], {
      cwd: APP_ROOT,
      encoding: "utf8",
      env: { ...process.env, RECRAFT_API_KEY: "must-not-be-used-by-dry-runs" },
      stdio: ["ignore", stdout, "pipe"],
    });
    return { ...result, stdout: fs.readFileSync(stdoutPath, "utf8") };
  } finally {
    fs.closeSync(stdout);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function dryRunEntries(...args) {
  const result = runGenerator(...args, "--dry-run");
  expect(result.status, result.stderr).toBe(0);
  return result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

describe("Recraft tree orchestrator", () => {
  it("selects one node, one state, one lineage, or the complete tree", () => {
    expect(dryRunEntries("--node", "pressure.stress.anxiety")).toHaveLength(5);
    expect(dryRunEntries("--state", "quiet")).toHaveLength(67);
    expect(dryRunEntries("--lineage", "pressure.stress.anxiety")).toHaveLength(20);
    expect(dryRunEntries("--all")).toHaveLength(335);
  });

  it("prints absolute app-local outputs and inherited universal visual DNA", () => {
    const entries = dryRunEntries("--node", "pressure.stress.anxiety");
    const [entry] = entries;

    expect(entry.output).toBe(
      path.join(APP_ROOT, "public/assets/edge/pressure.stress.anxiety/quiet.webp"),
    );
    expect(entry.optimization).toBe("state tint quiet, WebP quality 84, metadata stripped");
    expect(entry.prompt).toContain("Mythic Natural Realism");
    expect(entry.prompt).toContain("Inherited parent visual DNA");
    expect(entry.prompt).toContain("pressure.stress");
    expect(entry.prompt).toContain("universal and independent of any aim");
    expect(entry.prompt).toContain("No embedded text, numbers, or logos");
    expect(entries.find((item) => item.state === "available").prompt).not.toContain("controlled crimson");
    expect(entries.find((item) => item.state === "loaded").prompt).toContain("muted amber warning");
    expect(entries.find((item) => item.state === "overloaded").prompt).toContain("controlled crimson");
  });

  it("fails on invalid input before invoking the workspace generator", () => {
    const unknownNode = runGenerator("--node", "../outside");
    const unknownState = runGenerator("--state", "unknown");
    const conflicting = runGenerator("--node", "edge", "--all", "--dry-run");

    expect(unknownNode.status).toBe(1);
    expect(unknownNode.stderr).toContain("Unknown Edge node");
    expect(unknownNode.stdout).toBe("");
    expect(unknownState.status).toBe(1);
    expect(unknownState.stderr).toContain("Unknown Edge state");
    expect(conflicting.status).toBe(1);
    expect(conflicting.stderr).toContain("Choose exactly one selector");
  });
});
