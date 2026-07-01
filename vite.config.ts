import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// The game was ported from ActionScript; ByteArray.ts relies on Node's `zlib`
// and `Buffer` (via iconv-lite). Parcel used to polyfill these automatically;
// Vite does not, so we pull them in explicitly for the browser bundle.
export default defineConfig({
    // Served under /ib2/ on thederf.com (Caddy reverse-proxies this dev server;
    // see ../compose/caddy/Caddyfile). The prefix is NOT stripped, so Vite must
    // own the full /ib2/ path for its assets, HMR socket, and dep pre-bundles.
    base: '/ib2/',
    plugins: [
        nodePolyfills({
            include: ['zlib', 'buffer', 'util', 'stream'],
            globals: { Buffer: true, process: true },
        }),
    ],
    // `.dat` robot/replay files are imported for their URL, like the images.
    assetsInclude: ['**/*.dat'],
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
    },
});
