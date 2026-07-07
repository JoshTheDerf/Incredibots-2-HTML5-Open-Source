import { computed, ref, watch } from "vue";
import { useGameStore } from "../gameStore";

/**
 * Shared "Change Color" plumbing for the part prop panels (ShapeProps /
 * JointProps / BombProps / CannonProps / TextProps): a local hex-swatch ref +
 * opacity percentage kept in sync with the selected part, and an apply that
 * dispatches the already-wired setColour command for the whole selection.
 * TextPart has no opacity field — pass withOpacity: false to always dispatch
 * opacity 1 (setColour ignores opacity for text).
 */
export function useColourField(options: { withOpacity?: boolean } = {}) {
	const withOpacity = options.withOpacity ?? true;
	const game = useGameStore();
	const sel = computed(() => game.edit.selectedPart);
	const ids = computed(() => game.edit.selection);

	const localColour = ref("#000000");
	const opacity = ref(100);
	watch(
		sel,
		() => {
			localColour.value =
				"#" +
				[sel.value?.red ?? 0, sel.value?.green ?? 0, sel.value?.blue ?? 0]
					.map((c) => Math.round(c).toString(16).padStart(2, "0"))
					.join("");
			if (withOpacity) opacity.value = Math.round((sel.value?.opacity ?? 1) * 100);
		},
		{ immediate: true },
	);

	function applyColour(): void {
		if (ids.value.length === 0) return;
		const hex = localColour.value.replace("#", "");
		const r = parseInt(hex.slice(0, 2), 16);
		const g = parseInt(hex.slice(2, 4), 16);
		const b = parseInt(hex.slice(4, 6), 16);
		game.dispatch({ type: "setColour", partIds: ids.value, r, g, b, opacity: withOpacity ? opacity.value / 100 : 1 });
	}

	return { localColour, opacity, applyColour };
}
