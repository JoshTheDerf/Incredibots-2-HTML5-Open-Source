// Standalone entry for the Vue + Pinia UI shell demo.
//
// This is a proof-of-contract page (ui-demo.html), fully isolated from the
// legacy Pixi game entry (src/index.ts / index.html). It mounts App.vue,
// which binds to the headless GameCore via the Pinia store in gameStore.ts.

import "./main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import ui from "@nuxt/ui/vue-plugin";
import App from "./App.vue";
import { preloadUiAssets } from "./assets";
import { registerIcons } from "./registerIcons";

// Register the bundled lucide icon subset so <UIcon> resolves offline instead of
// fetching each glyph from the Iconify network API (must run before mount).
registerIcons();

// Warm the image cache for every button/panel texture (all states) so the
// rollover/click glossy variants don't flash in on first interaction.
preloadUiAssets();

const app = createApp(App);
app.use(createPinia());
app.use(ui);
app.mount("#ui-root");
