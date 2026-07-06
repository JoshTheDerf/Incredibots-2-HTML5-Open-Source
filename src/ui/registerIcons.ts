// Offline icon registration.
//
// Nuxt UI's <UIcon> renders icons through @iconify/vue, which by default fetches
// each icon on demand from the Iconify network API (api.iconify.design). That
// makes icons flash in on first use and disappear entirely offline or when the
// API host is blocked (CSP/proxy) — which is exactly what "the icons vanished"
// was. There is no build-time bundling in this pure-Vite setup because our icon
// names are DYNAMIC (`:name="item.icon"`), so no static scanner can see them.
//
// Fix: bundle a trimmed lucide collection (only the ~90 icons the app + Nuxt UI
// internals actually use — generated into generated/lucideSubset.json) and load
// it into @iconify/vue's module-level storage up front with addCollection. Once
// registered, <UIcon> resolves these locally and never touches the network.
import { addCollection } from "@iconify/vue";
import lucideSubset from "./generated/lucideSubset.json";
import type { IconifyJSON } from "@iconify/types";

let done = false;

/** Register the bundled lucide icon subset so <UIcon> resolves offline (idempotent). */
export function registerIcons(): void {
	if (done) return;
	done = true;
	addCollection(lucideSubset as IconifyJSON);
}
