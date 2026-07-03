// UI-local view preferences (NOT part of GameCore/GameState).
//
// These are editor toggles that gate purely presentational / gesture behaviour,
// so they live in the Vue layer rather than the headless core:
//   - highlightPartsForJoint — "Highlight Parts for Joint" (Jaybit
//     ControllerGame.jointVisualization, default true, :120). When on, selecting
//     a joint nudges the fill-alpha of the two shapes it connects.
//   - triangleSnapping — "Triangle Snapping" (Jaybit ControllerGame.triangleSnapping,
//     default true, :122). When on, Shift while placing a triangle's apex snaps
//     the perpendicular height to the common 30-60-90 / 45-45-90 heights.
//   - gridEnabled — IB3 grid visibility (ib3 SandboxControl.as:69 creates the
//     GridControl hidden; GameControl.gridButton :4235-4241 toggles it).
//   - gridSnap — snap editing gestures to the grid while it is shown (ib3
//     GameControl.snapToGrid :269, default true; see src/ui/snapping.ts SnapToGrid).
//   - gridSpacing — grid cell size in world units (ib3 GridControl.as:46-47,
//     gridSpacingX = gridSpacingY = 2; IB3 shipped no UI to change it, we expose
//     a small preset list in the View menu).
//
// Persisted in localStorage so the choice survives reloads. A module-level
// reactive singleton (shared across every component that calls useUiPrefs()).

import { ref, watch } from "vue";

const STORAGE_KEY = "ib2.uiPrefs.v1";

interface Persisted {
	highlightPartsForJoint: boolean;
	triangleSnapping: boolean;
	gridEnabled: boolean;
	gridSnap: boolean;
	gridSpacing: number;
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
// IB3 ground-truth defaults: grid hidden on startup (SandboxControl.as:69),
// snapToGrid true (GameControl.as:269), spacing 2 (GridControl.as:46-47).
const gridEnabled = ref<boolean>(initial.gridEnabled ?? false);
const gridSnap = ref<boolean>(initial.gridSnap ?? true);
const gridSpacing = ref<number>(
	typeof initial.gridSpacing === "number" && initial.gridSpacing > 0 ? initial.gridSpacing : 2,
);

watch([highlightPartsForJoint, triangleSnapping, gridEnabled, gridSnap, gridSpacing], () => {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				highlightPartsForJoint: highlightPartsForJoint.value,
				triangleSnapping: triangleSnapping.value,
				gridEnabled: gridEnabled.value,
				gridSnap: gridSnap.value,
				gridSpacing: gridSpacing.value,
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
		gridEnabled,
		gridSnap,
		gridSpacing,
		toggleHighlightPartsForJoint(): void {
			highlightPartsForJoint.value = !highlightPartsForJoint.value;
		},
		toggleTriangleSnapping(): void {
			triangleSnapping.value = !triangleSnapping.value;
		},
		toggleGridEnabled(): void {
			gridEnabled.value = !gridEnabled.value;
		},
		toggleGridSnap(): void {
			gridSnap.value = !gridSnap.value;
		},
		setGridSpacing(spacing: number): void {
			if (spacing > 0 && isFinite(spacing)) gridSpacing.value = spacing;
		},
	};
}
