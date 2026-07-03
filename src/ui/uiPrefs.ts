// UI-local view preferences (NOT part of GameCore/GameState).
//
// These are the two Jaybit View-menu toggles that gate purely presentational /
// gesture behaviour, so they live in the Vue layer rather than the headless core:
//   - highlightPartsForJoint — "Highlight Parts for Joint" (Jaybit
//     ControllerGame.jointVisualization, default true, :120). When on, selecting
//     a joint nudges the fill-alpha of the two shapes it connects.
//   - triangleSnapping — "Triangle Snapping" (Jaybit ControllerGame.triangleSnapping,
//     default true, :122). When on, Shift while placing a triangle's apex snaps
//     the perpendicular height to the common 30-60-90 / 45-45-90 heights.
//
// Persisted in localStorage so the choice survives reloads. A module-level
// reactive singleton (shared across every component that calls useUiPrefs()).

import { ref, watch } from "vue";

const STORAGE_KEY = "ib2.uiPrefs.v1";

interface Persisted {
	highlightPartsForJoint: boolean;
	triangleSnapping: boolean;
}

function load(): Partial<Persisted> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw) as Partial<Persisted>;
	} catch {
		// localStorage unavailable / corrupt — fall back to defaults.
	}
	return {};
}

const initial = load();

// Jaybit ground-truth defaults (ControllerGame.as:120 / :122).
const highlightPartsForJoint = ref<boolean>(initial.highlightPartsForJoint ?? true);
const triangleSnapping = ref<boolean>(initial.triangleSnapping ?? true);

watch([highlightPartsForJoint, triangleSnapping], () => {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				highlightPartsForJoint: highlightPartsForJoint.value,
				triangleSnapping: triangleSnapping.value,
			}),
		);
	} catch {
		// Ignore write failures (private mode / quota).
	}
});

export function useUiPrefs() {
	return {
		highlightPartsForJoint,
		triangleSnapping,
		toggleHighlightPartsForJoint(): void {
			highlightPartsForJoint.value = !highlightPartsForJoint.value;
		},
		toggleTriangleSnapping(): void {
			triangleSnapping.value = !triangleSnapping.value;
		},
	};
}
