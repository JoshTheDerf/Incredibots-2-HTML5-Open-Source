// Tutorial command handlers — load / advance / close a tutorial session.
//
// Extracted from GameCore's "Tutorial command handlers" section. The
// cross-cutting notification glue (notifyTutorial + the dialog/state
// projection) stays on GameCore (every subsystem fires milestones through
// it); this module owns the session lifecycle commands. See
// docs/PORT-SPEC-tutorials-replays.md §A and src/core/tutorials.ts.

import type { CoreInternals } from "./coreInternals";
import { buildTerrainParts, computeBounds } from "./sandboxEnvironment";
import { resetSessionForLoad } from "./simRuntime";
import { createTutorialMachine, getTutorialSetup, tutorialLevel } from "./tutorials";

// The fixed Flash stage the legacy per-tutorial camera offsets were authored for
// (Draw.m_screenWidth/Height :44-45). Used to convert a tutorial's legacy
// m_drawXOff/m_drawYOff into the responsive-canvas camera.offset convention.
const LEGACY_STAGE_WIDTH = 800;
const LEGACY_STAGE_HEIGHT = 600;

/**
 * loadTutorial: build the tutorial's session and show its first dialog. Sets
 * the per-tutorial default sandbox settings + initial camera, creates the
 * hand-coded machine, and runs Init() (ControllerTutorial subclass Init ->
 * ShowTutorialDialog). Editing-phase only. If the level's machine isn't ported
 * yet, activates the session with no dialog (framework still usable).
 */
export function handleLoadTutorial(core: CoreInternals, levelIndex: number): void {
	// Fully reset the previous session first — the legacy game `new`-ed a fresh
	// ControllerTutorial per level, so no prior parts/challenge/history survive.
	// This also drops any running sim (the user may have played the previous mode
	// then returned to the menu), replacing the old phase-guard early-return that
	// silently left the stale scene in place.
	resetSessionForLoad(core);
	const level = tutorialLevel(levelIndex);
	core.tutorialMachine = createTutorialMachine(levelIndex);
	core.tutorialWonFired = false;

	// Apply the per-tutorial default sandbox settings + initial camera.
	if (level) {
		const s = level.settings;
		const sandbox = {
			...core.state.sandbox,
			gravity: s.gravity,
			size: s.size,
			terrainType: s.terrainType,
			terrainTheme: s.terrainTheme,
			background: s.background,
		};
		sandbox.bounds = computeBounds(sandbox);
		core.state = { ...core.state, sandbox };
	}
	if (core.tutorialMachine) {
		const cam = core.tutorialMachine.initialCamera;
		// The tutorial subclasses set draw.m_drawXOff/m_drawYOff directly, in the
		// legacy `screen = world*scale - m_drawOff` convention on the fixed 800x600
		// Flash stage (Draw.m_screenWidth/Height). The responsive canvas projects
		// `screen = canvas/2 + world*scale - camera.offset`, and GameCanvas derives
		// the legacy draw offset back out as `m_drawXOff = camera.offsetX - w/2`.
		// So a legacy m_drawXOff renders identically iff camera.offsetX ==
		// m_drawXOff + (stage width)/2. Convert with the authored stage half-size
		// (400, 300) so Tank (1520,-300) and Catapult (-1880,-220) — and every
		// other tutorial's framing — land on-screen exactly as the original did.
		core.state = {
			...core.state,
			camera: {
				...core.state.camera,
				offsetX: cam.drawXOff + LEGACY_STAGE_WIDTH / 2,
				offsetY: cam.drawYOff + LEGACY_STAGE_HEIGHT / 2,
			},
		};
	}

	// Load the tutorial's prebuilt scene (baked terrain + prefab bot). Tutorials
	// 0-9 supply a scene; the rest return []. Either way the parts graph is
	// REPLACED wholesale (never appended to the previous session's scene): a
	// scene-less tutorial gets a clean sandbox terrain built from its own
	// settings, so no stale parts from the prior mode can persist.
	const setupParts = getTutorialSetup(levelIndex);
	const parts = setupParts.length > 0 ? setupParts : buildTerrainParts(core.state.sandbox);
	for (const p of parts) p.id = ++core.nextId;
	core.state = {
		...core.state,
		parts,
		edit: { ...core.state.edit, selection: [], selectedPart: null },
	};

	// Init() -> first dialog.
	const first = core.tutorialMachine ? core.tutorialMachine.init() : null;
	core.applyTutorialDialog(first ?? { kind: "dismiss" });
}

/**
 * advanceTutorial(messageId): mirrors TutorialWindow.closeWindow ->
 * cont.CloseTutorialDialog(num). Runs the machine's close(num) switch and
 * applies the resulting dialog action.
 */
export function handleAdvanceTutorial(core: CoreInternals, messageId: number): void {
	if (!core.tutorialMachine) return;
	const action = core.tutorialMachine.close(messageId);
	core.applyTutorialDialog(action);
}

/** closeTutorial: end the tutorial session (dismiss dialog + clear machine). */
export function handleCloseTutorial(core: CoreInternals): void {
	core.tutorialMachine = null;
	core.state = { ...core.state, tutorial: null };
	core.markChanged();
}
