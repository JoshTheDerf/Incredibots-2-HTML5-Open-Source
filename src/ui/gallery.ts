// Standalone entry for the ported-panels gallery (ui-gallery.html).
// Renders every PIXI→Vue panel port for visual review; isolated from the
// legacy Pixi game entry. Binds to the headless GameCore via the Pinia store.

import "./main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import ui from "@nuxt/ui/vue-plugin";
import PanelGallery from "./PanelGallery.vue";

const app = createApp(PanelGallery);
app.use(createPinia());
app.use(ui);
app.mount("#ui-root");
