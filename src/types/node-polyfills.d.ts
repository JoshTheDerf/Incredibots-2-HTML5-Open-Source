// Type declarations for the Node built-ins that vite-plugin-node-polyfills
// provides to the browser bundle (see vite.config.ts: `include: ['zlib',
// 'buffer', 'util', 'stream'], globals: { Buffer: true, process: true }`).
//
// We deliberately do NOT install @types/node: it would pollute the global
// scope of this browser project (timers, require, process types, …) far
// beyond what the polyfills actually provide. Instead, the `Buffer` global is
// typed from the `buffer` npm package (the actual runtime implementation the
// polyfill injects), and `zlib` is declared with just the four sync functions
// ByteArray.ts uses (browserify-zlib mirrors the Node API for these).

declare module "zlib" {
  import { Buffer } from "buffer";
  export function deflateSync(buf: Buffer | Uint8Array | string, options?: any): Buffer;
  export function deflateRawSync(buf: Buffer | Uint8Array | string, options?: any): Buffer;
  export function inflateSync(buf: Buffer | Uint8Array | string, options?: any): Buffer;
  export function inflateRawSync(buf: Buffer | Uint8Array | string, options?: any): Buffer;
}

// The `Buffer` global injected by the polyfill plugin (and natively present
// under vitest/node). Both the value (constructor with statics) and the
// instance type are exposed.
declare var Buffer: typeof import("buffer").Buffer;
type Buffer = import("buffer").Buffer;
