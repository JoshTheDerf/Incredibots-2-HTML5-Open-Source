// Type-checking uses `vue-tsc`, which resolves and type-checks `.vue` files
// natively — so we deliberately do NOT declare `module "*.vue"` here (a broad
// shim would mask the real component types with `any`).

// Vite resolves asset imports (PNGs etc.) to their URL string at build time;
// these ambient declarations let plain `tsc` type-check the `.ts` files that
// import the legacy UI textures (see assets.ts).
declare module "*.png" {
	const src: string;
	export default src;
}

// Sound assets (the sound service + legacy Resource.ts import these). Vite
// resolves them to a URL string at build time.
declare module "*.mp3" {
	const src: string;
	export default src;
}

// Binary game-data blobs (robot/replay/challenge .dat). Vite's assetsInclude
// resolves these to a URL string at build time (Resource.ts + the menu demo
// replay import them and fetch() the bytes).
declare module "*.dat" {
	const src: string;
	export default src;
}

// The bundled offline icon subset (registerIcons.ts). Vite resolves .json
// imports natively; tsconfig has no resolveJsonModule, so declare just this
// one module (narrow wildcard — not "*.json" — to avoid masking other JSON).
declare module "*lucideSubset.json" {
	import type { IconifyJSON } from "@iconify/types";
	const data: IconifyJSON;
	export default data;
}

