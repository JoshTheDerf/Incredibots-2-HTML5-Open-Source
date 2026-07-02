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

