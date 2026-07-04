// loadBox2D3 — async, memoized loader for the box2d3-wasm (Box2D v3) module.
//
// E3-1 (see .agents/ib3-merge/ENGINE-BOX2D3-PLAN.md). This file lives OUTSIDE
// the node-clean game core (src/core): box2d3-wasm is an async WebAssembly
// binary dependency, so it must never be statically reachable from the core
// purity entrypoints (§C4). GameCore + the PhysicsBackend interface stay
// pure/types-only; only this adapter (src/enginebox2d3) touches the wasm.
//
// CONSTRAINT §C3 — determinism + deploy: we use the NON-THREADED "compat"
// build (no SIMD, no SharedArrayBuffer). The SIMD "deluxe" build needs
// COOP/COEP cross-origin isolation which our GitHub-Pages-behind-thederf.com
// deploy cannot set, and its enkiTS work-stealing is not guaranteed
// bit-identical across machines (breaks replay sync). box2d3-wasm ships both
// build entries under build/dist/es/{compat,deluxe}; we force compat.
//
// The wasm load is ASYNC but the PhysicsBackend interface is SYNC. Resolve by
// awaiting THIS loader once (browser: at app boot; node/tests: in a beforeAll),
// then constructing Box2D3Backend FROM the resolved module — every backend
// method is then synchronous. loadBox2D3() memoizes so repeated selects/tests
// share one module instance.

import type Box2D3Factory from "box2d3-wasm";

/**
 * The box2d3-wasm build version this adapter targets. Engine-2 replays record it
 * (E3-4) and playback warns on mismatch — v3 promises deterministic results only
 * for a FIXED build (§C3). Keep in sync with the "box2d3-wasm" dependency version
 * in package.json (the package's ESM `exports` map gates a direct package.json
 * import, so this is a hand-maintained mirror).
 */
export const BOX2D3_WASM_VERSION = "5.2.0";

/** The resolved emscripten module namespace (all bound v3 functions/structs). */
export type Box2D3Module = Awaited<ReturnType<typeof Box2D3Factory>>;

/** An emscripten module factory: options -> Promise<module>. */
type Box2D3FactoryFn = (options?: Record<string, unknown>) => Promise<Box2D3Module>;

let modulePromise: Promise<Box2D3Module> | null = null;

/**
 * Resolve the box2d3-wasm compat module, memoized. Safe to call repeatedly:
 * the wasm is fetched/instantiated once and the same module namespace is
 * returned to every caller.
 */
export function loadBox2D3(): Promise<Box2D3Module> {
	if (modulePromise === null) modulePromise = loadModule();
	return modulePromise;
}

async function loadModule(): Promise<Box2D3Module> {
	if (typeof window !== "undefined") {
		// Browser / Vite. Import the COMPAT build DIRECTLY (not the package entry).
		// The entry ("box2d3-wasm") conditionally imports BOTH the compat and the
		// SIMD "deluxe" builds; bundling deluxe (a) breaks `vite build` — its
		// enkiTS worker uses top-level await which Rollup can't emit as an iife
		// worker — and (b) violates §C3 (deluxe is threaded/non-deterministic and
		// needs COOP/COEP our deploy can't set). Importing compat directly keeps
		// deluxe out of the graph. The package's ESM `exports` map gates this deep
		// path, so a Vite `resolve.alias` ("box2d3-wasm/compat" -> the compat mjs)
		// makes it resolvable; its own `new URL("Box2D.compat.wasm", import.meta.url)`
		// then makes Vite emit the wasm as a hashed asset in the adapter's lazy chunk.
		const compat = (await import("box2d3-wasm/compat")) as unknown as { default: Box2D3FactoryFn };
		return compat.default({});
	}

	// Node / vitest. The package entry would pick the SIMD "deluxe" build here
	// (no `window`, SIMD available), which we must NOT use for the sim/replay
	// path — so we resolve and import the compat build entry explicitly. Node's
	// ESM `exports` map blocks the deep subpath specifier, so we resolve the
	// package entry URL and reach compat by a relative URL off it (the global
	// URL constructor — no node:path/url imports, so no @types/node needed).
	// @ts-ignore import.meta.resolve is valid at ESM runtime; tsconfig
	// module=commonjs flags only the syntax. This file is ESM at runtime.
	const entryUrl: string = import.meta.resolve("box2d3-wasm");
	const compatUrl = new URL("./compat/Box2D.compat.mjs", entryUrl).href;
	const compat = (await import(/* @vite-ignore */ compatUrl)) as unknown as {
		default: Box2D3FactoryFn;
	};
	return compat.default({});
}
