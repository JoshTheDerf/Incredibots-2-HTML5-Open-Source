import { defineConfig } from "vitest/config";

// Vitest harness for the CHARACTERIZATION tests that pin the node-headless
// GameCore (src/core/*) to the ORIGINAL legacy behaviour. The core bundles for
// node (see scripts/check-core-node.mjs), so we run the tests in the node
// environment and import the Part classes / GameCore / robotSerialization
// directly — no Pixi, no DOM, no Vue.
//
// This config is deliberately node-focused and does NOT reuse the app's
// vite.config.ts (that config pulls in @nuxt/ui + the Vue plugin, which the
// headless tests neither need nor want). Asset imports (.png/.mp3/.dat/.wav)
// are stubbed so a test that transitively reaches an asset URL import never
// fails to resolve — though the pure core should never reach one.
export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
		// Byte-format / physics assertions can be a touch slower on cold JIT.
		testTimeout: 15000,
	},
	// Treat legacy asset imports as empty stubs (belt-and-suspenders — the core
	// is asset-free, but shared modules under src/ may import an asset URL).
	assetsInclude: ["**/*.dat"],
	resolve: {
		alias: [{ find: /\.(png|jpg|jpeg|gif|mp3|wav|ogg|dat)$/, replacement: "\0empty-asset" }],
	},
	plugins: [
		{
			name: "stub-assets",
			resolveId(id) {
				if (id === "\0empty-asset") return id;
				return null;
			},
			load(id) {
				if (id === "\0empty-asset") return "export default '';";
				return null;
			},
		},
	],
});
