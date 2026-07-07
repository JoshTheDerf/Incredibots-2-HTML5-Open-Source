// Ambient declaration for the deep "box2d3-wasm/compat" specifier.
//
// loadBox2D3.ts imports the COMPAT build directly (see the comment there for
// why the package entry must be avoided). The specifier only resolves through
// a Vite `resolve.alias`, so plain tsc/vue-tsc cannot find it (the package's
// ESM `exports` map gates the deep path). The import site immediately casts
// the namespace to `{ default: Box2D3FactoryFn }`, so `any` here is safe and
// adds no false precision.
declare module "box2d3-wasm/compat" {
	const factory: any;
	export default factory;
}
