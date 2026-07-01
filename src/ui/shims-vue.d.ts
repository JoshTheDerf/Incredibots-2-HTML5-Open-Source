// Minimal module shim so `tsc --noEmit` can resolve `.vue` imports.
//
// This project runs plain `tsc` (no `vue-tsc`), so `.vue` files are not
// actually type-checked — this only satisfies module resolution for `.ts`
// files that import a `.vue` component (e.g. demo.ts importing App.vue).
declare module "*.vue" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent<object, object, unknown>;
	export default component;
}

// Vite resolves asset imports (PNGs etc.) to their URL string at build time;
// these ambient declarations let plain `tsc` type-check the `.ts` files that
// import the legacy UI textures (see assets.ts).
declare module "*.png" {
	const src: string;
	export default src;
}

