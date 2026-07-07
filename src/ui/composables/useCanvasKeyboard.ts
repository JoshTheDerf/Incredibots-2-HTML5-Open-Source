// Keyboard handling for the game canvas, extracted from GameCanvas.vue
// (behavior-preserving). Two jobs:
//   • live keyboard control while the sim runs — a faithful port of the legacy
//     key path (Input.keyPress/keyRelease -> ControllerGame.keyPress -> keyInput,
//     :1885-1888 / :1868-1883): keydown feeds keyInput(key, up=false), keyup
//     feeds keyInput(key, up=true);
//   • editing-phase hotkeys — the legacy bare-key editor shortcuts plus modern
//     Ctrl/Cmd combos, all fired from a SINGLE keydown path (no keyup hotkeys),
//     and the held-arrow set drawFrame reads for the per-frame camera pan.
//
// The returned handlers are attached to `window` by GameCanvas (like the legacy
// global Input listeners) so the robot is drivable without the canvas having to
// hold focus; the handlers no-op unless the relevant phase is active.

import type { ModifierState } from "./modifierState";
import type { useGameStore } from "../gameStore";

type GameStore = ReturnType<typeof useGameStore>;

/**
 * The pointer composable's in-progress polygon draft, as the keyboard sees it:
 * Enter commits the ring, Escape cancels it, and any vertices placed suppress
 * the editor shortcut table (bare keys keep their per-step meaning mid-draw).
 */
export interface PolygonDraftControl {
	active(): boolean;
	commit(): void;
	cancel(): void;
}

export function useCanvasKeyboard(deps: {
	game: GameStore;
	mods: ModifierState;
	polygonDraft: PolygonDraftControl;
}) {
	const { game, mods, polygonDraft } = deps;

	// While the sim runs, held/pressed keys drive the robot: revolute/prismatic
	// motors, thrusters, cannons, text displays. The core forwards each to every
	// part's KeyInput (which sets the per-part control flags its per-step Update
	// reads) and records only text/cannon keys. Keys held down repeat browser
	// keydown events, but the part flags are idempotent (isKeyDown = !up), so
	// repeats are harmless. We track the pressed set so a browser key-repeat only
	// fires one keydown per physical press.
	const pressedKeys = new Set<number>();

	// Arrow keys currently held for editing-phase camera pan (Ctrl = fast). Applied
	// per ticker frame in drawFrame so pan speed is frame-based like the legacy
	// per-frame m_drawXOff step (ControllerGame.as:6795-6835).
	const heldArrows = new Set<number>();

	// True when the event originates from a text field, so global editor hotkeys
	// don't hijack typing (legacy gated on m_sidePanel.EnteringInput(), :1890).
	function isTypingTarget(event: KeyboardEvent): boolean {
		const t = event.target as HTMLElement | null;
		if (!t) return false;
		const tag = t.tagName;
		return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
	}

	/** Clear held-key state when the window loses focus (no keyup fires otherwise). */
	function onWindowBlur(): void {
		heldArrows.clear();
		// Keys held at blur never get a keyup — release each into the core first
		// (like onKeyUp would) so a held motor key doesn't drive forever. The core
		// no-ops these while editing; only a live sim (running/paused) needs them.
		if (game.sim.phase !== "editing") {
			for (const key of pressedKeys) game.dispatch({ type: "keyInput", key, up: true });
		}
		pressedKeys.clear();
		mods.reset();
	}

	/**
	 * Editor keyboard shortcuts — a faithful port of the legacy ControllerGame
	 * keyPress editor bindings (:1890-1926), which used BARE keys (no modifier),
	 * plus the modern Ctrl/Cmd combos users now expect. Returns true if the event
	 * was handled. Only called while editing, not typing, and not mid-polygon-draw.
	 *
	 * Legacy bare keys: 1-7 tools, R rotate, X/C/V cut/copy/paste, Del/Backspace
	 * delete, Y redo, Z undo, +/- zoom, P play.
	 */
	function handleEditorShortcut(event: KeyboardEvent): boolean {
		const mod = event.ctrlKey || event.metaKey;
		const code = event.keyCode;
		const selection = () => [...game.edit.selection];

		// Modern Ctrl/Cmd combos first (so Ctrl+Z isn't caught by the bare-Z case).
		if (mod) {
			switch (code) {
				case 90: // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
					game.dispatch({ type: event.shiftKey ? "redo" : "undo" });
					return true;
				case 89: // Ctrl/Cmd+Y = redo
					game.dispatch({ type: "redo" });
					return true;
				case 88: // Ctrl/Cmd+X = cut
					game.dispatch({ type: "cutParts", partIds: selection() });
					return true;
				case 67: // Ctrl/Cmd+C = copy
					game.dispatch({ type: "copyParts", partIds: selection() });
					return true;
				case 86: // Ctrl/Cmd+V = paste
					game.dispatch({ type: "pasteParts" });
					return true;
				default:
					return false; // leave other Ctrl/Cmd combos to the browser
			}
		}
		// Legacy BARE-key shortcuts (no modifier). Skip if Alt is held.
		if (event.altKey) return false;
		switch (code) {
			case 90: // Z = undo
				game.dispatch({ type: "undo" });
				return true;
			case 89: // Y = redo
				game.dispatch({ type: "redo" });
				return true;
			case 88: // X = cut
				game.dispatch({ type: "cutParts", partIds: selection() });
				return true;
			case 67: // C = copy
				game.dispatch({ type: "copyParts", partIds: selection() });
				return true;
			case 86: // V = paste
				game.dispatch({ type: "pasteParts" });
				return true;
			case 8: // Backspace
			case 46: // Delete
				if (game.edit.selection.length > 0) game.dispatch({ type: "deleteParts", partIds: selection() });
				return true;
			case 49: // 1 = circle
				game.dispatch({ type: "setTool", tool: "newCircle" });
				return true;
			case 50: // 2 = rectangle
				game.dispatch({ type: "setTool", tool: "newRect" });
				return true;
			case 51: // 3 = triangle
				game.dispatch({ type: "setTool", tool: "newTriangle" });
				return true;
			case 52: // 4 = fixed joint
				game.dispatch({ type: "setTool", tool: "newFixedJoint" });
				return true;
			case 53: // 5 = rotating joint
				game.dispatch({ type: "setTool", tool: "newRevoluteJoint" });
				return true;
			case 54: // 6 = sliding joint
				game.dispatch({ type: "setTool", tool: "newPrismaticJoint" });
				return true;
			case 55: // 7 = text
				game.dispatch({ type: "setTool", tool: "newText" });
				return true;
			case 82: // R = rotate tool
				game.dispatch({ type: "setTool", tool: "rotate" });
				return true;
			case 107: // numpad +
			case 187: // = / +
				game.dispatch({ type: "zoomIn" });
				return true;
			case 109: // numpad -
			case 189: // - / _
				game.dispatch({ type: "zoomOut" });
				return true;
			case 80: // P = play
				game.dispatch({ type: "play" });
				return true;
			default:
				return false;
		}
	}

	function onKeyDown(event: KeyboardEvent): void {
		mods.update(event);
		// Polygon multi-click gesture: Enter (13) commits the ring, Escape (27)
		// cancels it. Handled here (not App's Escape cascade, which owns modals /
		// condition-pick / joint gestures — none active during a polygon draw) since
		// the in-progress vertices live in the pointer composable. Only while editing
		// with vertices placed; skip while typing in a form field.
		if (game.sim.phase === "editing" && polygonDraft.active() && !isTypingTarget(event)) {
			if (event.keyCode === 13) {
				polygonDraft.commit();
				event.preventDefault();
				return;
			}
			if (event.keyCode === 27) {
				polygonDraft.cancel();
				event.preventDefault();
				return;
			}
		}
		const arrowKey = event.keyCode;
		// Editing-phase fast camera pan (Ctrl = 3x): track held arrows; drawFrame does
		// the per-frame pan (ControllerGame.as:6795-6835). preventDefault so the arrows
		// don't scroll the page. Skipped while typing in a form field.
		if (
			game.sim.phase === "editing" &&
			!isTypingTarget(event) &&
			(arrowKey === 37 || arrowKey === 38 || arrowKey === 39 || arrowKey === 40)
		) {
			heldArrows.add(arrowKey);
			event.preventDefault();
			return;
		}
		// Editor keyboard shortcuts (legacy ControllerGame.keyPress :1890-1926):
		// undo/redo, tool selection, cut/copy/paste, delete, zoom, rotate, play —
		// only while editing, not typing in a field, and not mid-polygon-draw.
		if (game.sim.phase === "editing" && !isTypingTarget(event) && !polygonDraft.active()) {
			if (handleEditorShortcut(event)) {
				event.preventDefault();
				return;
			}
		}
		if (game.sim.phase !== "running") return;
		// keyCode is the code space the legacy parts compare against (motorCWKey etc.).
		const key = event.keyCode;
		if (pressedKeys.has(key)) return; // ignore auto-repeat
		pressedKeys.add(key);
		game.dispatch({ type: "keyInput", key, up: false });
		// Arrow keys / space would otherwise scroll the page while driving.
		if (key === 37 || key === 38 || key === 39 || key === 40 || key === 32) event.preventDefault();
	}

	function onKeyUp(event: KeyboardEvent): void {
		mods.update(event);
		const key = event.keyCode;
		heldArrows.delete(key);
		const wasPressed = pressedKeys.delete(key);
		// Forward the release to the core whenever the PRESS was forwarded (not only
		// while 'running'), so a motor key released while PAUSED still clears the
		// part's held control flag instead of driving forever on resume. The core
		// applies a paused key-up as a flag-clear only (GameCore.handleKeyInput).
		// Editor shortcuts fire on keyDOWN (handleEditorShortcut) — nothing here.
		if (wasPressed || game.sim.phase === "running") {
			game.dispatch({ type: "keyInput", key, up: true });
		}
	}

	return { heldArrows, onKeyDown, onKeyUp, onWindowBlur };
}
