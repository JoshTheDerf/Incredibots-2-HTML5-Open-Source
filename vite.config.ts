import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vue from '@vitejs/plugin-vue';
import ui from '@nuxt/ui/vite';

// The game was ported from ActionScript; ByteArray.ts relies on Node's `zlib`
// and `Buffer` (via iconv-lite). Parcel used to polyfill these automatically;
// Vite does not, so we pull them in explicitly for the browser bundle.
export default defineConfig(({ command }) => ({
    // DEV: served under /ib2/ on thederf.com (Caddy reverse-proxies this dev
    // server; see ../compose/caddy/Caddyfile). The prefix is NOT stripped, so Vite
    // must own the full /ib2/ path for its assets, HMR socket, and dep pre-bundles.
    // BUILD (GitHub Pages): a RELATIVE base so the site works at any deploy path
    // (project-page subpath, custom domain, or /legacy) without hardcoding the repo
    // name — each entry's assets are referenced relative to its own HTML.
    base: command === 'serve' ? '/ib2/' : './',
    plugins: [
        nodePolyfills({
            include: ['zlib', 'buffer', 'util', 'stream'],
            globals: { Buffer: true, process: true },
        }),
        // Vue + Nuxt UI shell (src/ui/*) binds to the headless core; the
        // legacy Pixi game entry (src/index.ts) does not use this plugin.
        vue(),
        ui({
            // `router: false` is required — this app has no vue-router.
            router: false,
            // The editor is a LIGHT-only parchment UI. By default Nuxt UI's
            // color-mode plugin runs VueUse `useDark()`, which follows the OS
            // preference and toggles `class="dark"` on <html>. On a dark-mode
            // OS that flipped every semantic token (--ui-bg/-text/-elevated) to
            // its dark value — including the *teleported* DropdownMenu popovers
            // in the <body> portal — so the menus rendered white-on-black. We
            // ship no light/dark switch, so disable color mode entirely: <html>
            // never gets `.dark`, and the tokens resolve to the cream/dark IB
            // values set in src/ui/main.css.
            colorMode: false,
            // Set the semantic `primary` to the custom `ibpurple` scale (defined
            // via `@theme static` in main.css) instead of Nuxt UI's default
            // green. The CSS `--ui-primary` override only re-points the single
            // semantic token; the `--ui-color-primary-*` shade scale (used by
            // focus rings, `ring-primary`, `-500` utilities …) stayed green
            // until registered here — this is the documented mechanism. neutral
            // stays `slate` (its default) to match the parchment surface tokens.
            ui: { colors: { primary: 'ibpurple', neutral: 'slate' } },
        }),
    ],
    // `.dat` robot/replay files are imported for their URL, like the images.
    assetsInclude: ['**/*.dat'],
    // Don't let esbuild dep-prebundle the box2d3-wasm emscripten glue — it must
    // load as-authored so its `new URL(...wasm, import.meta.url)` asset ref and
    // node/browser branches survive. It's only reached via a lazy dynamic import
    // when engine 2 is selected, so excluding it costs engines 0/1 nothing.
    optimizeDeps: { exclude: ['box2d3-wasm'] },
    resolve: {
        alias: {
            // Engine 2 (Box2D v3) imports the box2d3-wasm COMPAT build directly so
            // the SIMD "deluxe" build (top-level-await worker; needs COOP/COEP) is
            // never pulled into the graph — see src/enginebox2d3/loadBox2D3.ts. The
            // package's `exports` map doesn't expose this deep path, so alias a
            // stable specifier to the file; the adapter is a lazy dynamic import, so
            // this only affects that chunk, and the compat build's
            // `new URL('Box2D.compat.wasm', import.meta.url)` makes Vite emit the wasm.
            'box2d3-wasm/compat': fileURLToPath(
                new URL('./node_modules/box2d3-wasm/build/dist/es/compat/Box2D.compat.mjs', import.meta.url),
            ),
        },
    },
    server: {
        // Listen on all interfaces so the Caddy container can reach us via
        // host.docker.internal.
        host: true,
        port: 5173,
        strictPort: true,
        // Vite blocks requests whose Host header it doesn't recognise; allow the
        // domain we're proxied behind.
        allowedHosts: ['thederf.com', '.thederf.com', 'localhost'],
        // HMR runs over the public TLS endpoint (Caddy terminates on 443), so
        // point the client websocket there rather than at the internal port.
        hmr: {
            protocol: 'wss',
            host: 'thederf.com',
            clientPort: 443,
        },
    },
    build: {
        target: 'es2020',
        outDir: 'dist',
        // These assets are large binary blobs; don't inline any of them.
        assetsInlineLimit: 0,
        // Two deployed entries: the Vue app at the site root (index.html) and the
        // original Pixi build at /legacy/ (legacy/index.html). ui-gallery.html is a
        // dev-only tool and is intentionally excluded from the production build.
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                legacy: fileURLToPath(new URL('./legacy/index.html', import.meta.url)),
            },
        },
    },
}));
