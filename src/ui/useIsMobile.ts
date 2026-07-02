// Mobile-detection composable — the single gate for all mobile-only layout and
// behaviour added in the mobile/responsive pass. Desktop must stay visually
// unchanged, so every mobile tweak is guarded by the reactive boolean this
// returns.
//
// "Mobile" means a narrow viewport (<= 768px) OR a coarse pointer (touch). The
// coarse-pointer branch catches tablets/phones held in landscape where the
// width alone might exceed the breakpoint, while the width branch catches a
// narrow desktop window. Either match flips the flag on.
import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

const MOBILE_QUERY = "(max-width: 768px), (pointer: coarse)";

/**
 * Returns a reactive boolean that is `true` on narrow / touch devices and
 * updates live when the media query changes (window resize, device rotation).
 * SSR/no-`matchMedia` environments fall back to `false` (desktop).
 */
export function useIsMobile(): Ref<boolean> {
	const isMobile = ref(false);
	let mql: MediaQueryList | null = null;

	const onChange = (e: MediaQueryListEvent | MediaQueryList): void => {
		isMobile.value = e.matches;
	};

	onMounted(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		mql = window.matchMedia(MOBILE_QUERY);
		isMobile.value = mql.matches;
		// addEventListener is the modern API; older Safari used addListener.
		if (typeof mql.addEventListener === "function") mql.addEventListener("change", onChange);
		else mql.addListener(onChange);
	});

	onBeforeUnmount(() => {
		if (!mql) return;
		if (typeof mql.removeEventListener === "function") mql.removeEventListener("change", onChange);
		else mql.removeListener(onChange);
		mql = null;
	});

	return isMobile;
}
