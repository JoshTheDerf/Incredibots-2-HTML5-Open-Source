#!/usr/bin/env node
//
// check-core-node.mjs
//
// Transitive headless-purity gate for the game core.
//
// The shell gate (check-core-purity.sh) only catches *literal* forbidden import
// strings in the core's own files. It cannot see a leak that hides one hop away
// (Part -> some innocent-looking module -> ControllerGameGlobals -> pixi-sound).
//
// This check closes that gap. For each core entry it esbuild-bundles the whole
// transitive dependency graph for platform=node and then:
//
//   1) Inspects esbuild's metafile — the exact set of source files pulled into
//      the graph — and FAILS if any of them is a forbidden module: a pixi
//      package (node_modules/pixi*, @pixi), the controller layer
//      (ControllerGame*, ControllerMainMenu, ControllerGameGlobals), any Gui
//      path, or the pixi-bound Resource module. This is precise: it keys off the
//      real import graph, not substrings in comments/strings.
//
//   2) require()s the bundle to prove it actually loads headless (no throw at
//      module-init time — the exact failure mode a DOM/pixi dependency causes
//      under node).
//
// Run:  node scripts/check-core-node.mjs   (also wired into `npm run check:core`)

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const require = createRequire(import.meta.url);

// Core entries that MUST be node-clean and load headless.
const ENTRIES = [
  "src/Parts/Circle.ts",
  "src/Parts/Rectangle.ts",
  "src/Parts/Triangle.ts",
  "src/Parts/Cannon.ts",
  "src/Parts/RevoluteJoint.ts",
  "src/Parts/PrismaticJoint.ts",
  "src/Parts/Thrusters.ts",
  "src/Parts/TextPart.ts",
  "src/core/GameCore.ts",
];

// A transitive input file is a forbidden leak if its path matches any of these.
// (Matched against esbuild metafile input keys, which are repo-relative paths
// like "node_modules/pixi.js/..." or "src/Game/ControllerGame.ts".)
const FORBIDDEN_INPUT = [
  { label: "pixi package", re: /(^|\/)node_modules\/(pixi(\.js|-sound|-scrollbox|-text-input|-viewport)?|@pixi)(\/|$)/i },
  { label: "controller layer", re: /(^|\/)(ControllerGame\b|ControllerGameGlobals|ControllerMainMenu|ControllerChallenge|ControllerSandbox|ControllerEditor)/ },
  { label: "Gui path", re: /(^|\/)Gui\//i },
  { label: "pixi-bound Resource", re: /(^|\/)Graphics\/Resource\.[tj]s$/i },
];

let failed = false;
const results = [];

for (const entry of ENTRIES) {
  const abs = resolve(ROOT, entry);
  let out;
  try {
    out = await build({
      entryPoints: [abs],
      bundle: true,
      platform: "node",
      format: "cjs",
      write: false,
      metafile: true,
      logLevel: "silent",
      absWorkingDir: ROOT,
    });
  } catch (err) {
    results.push({ entry, ok: false, inputs: 0, reason: `esbuild bundle failed: ${err.message}` });
    failed = true;
    continue;
  }

  const inputs = Object.keys(out.metafile.inputs);

  // 1) Graph purity: no forbidden module anywhere in the transitive inputs.
  const leaks = [];
  for (const f of inputs) {
    for (const rule of FORBIDDEN_INPUT) {
      if (rule.re.test(f)) leaks.push(`${rule.label} (${f})`);
    }
  }

  // 2) Runtime load: require the bundle; must not throw at module init.
  let loadOk = true;
  let loadErr = "";
  const bundleText = out.outputFiles[0].text;
  const dir = mkdtempSync(join(tmpdir(), "core-node-"));
  const file = join(dir, "bundle.cjs");
  try {
    writeFileSync(file, bundleText);
    require(file);
  } catch (err) {
    loadOk = false;
    loadErr = err && err.message ? err.message : String(err);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const ok = leaks.length === 0 && loadOk;
  if (!ok) failed = true;
  results.push({
    entry,
    ok,
    inputs: inputs.length,
    reason: [
      leaks.length ? `leaks: ${leaks.join("; ")}` : null,
      loadOk ? null : `load threw: ${loadErr}`,
    ]
      .filter(Boolean)
      .join("; "),
  });
}

console.log("== Core node-load gate (transitive) ==");
console.log("Bundling each core entry for platform=node; asserting no pixi/Gui/Controller/Resource in the import graph + loads clean...\n");
for (const r of results) {
  const detail = r.ok ? `${r.inputs} inputs, node-clean, loads OK` : r.reason;
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.entry}  -> ${detail}`);
}
console.log("");

if (failed) {
  console.log("FAIL: one or more core entries transitively reach the renderer/DOM/controller layer or failed to load headless.");
  process.exit(1);
}
console.log(`PASS: all ${results.length} core entries are node-clean and load without throwing.`);
process.exit(0);
