// Pinia adapter over the headless GameCore.
//
// This store holds no authoritative state of its own — it instantiates a
// GameCore, subscribes to it, and mirrors the current state snapshot into a
// reactive ref so Vue components re-render on change. Components dispatch
// Commands through `dispatch`; they never mutate state directly. See
// docs/CONTRACT.md.

import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { GameCore } from "../core/GameCore";
import type { Command, EditState, SimState, CameraState } from "../core";
import type { Part } from "../Parts/Part";

const core = new GameCore();

export const useGameStore = defineStore("game", () => {
	const state = shallowRef(core.getState());

	core.subscribe((next) => {
		state.value = next;
	});

	const sim = computed<Readonly<SimState>>(() => state.value.sim);
	const camera = computed<Readonly<CameraState>>(() => state.value.camera);
	const edit = computed<Readonly<EditState>>(() => state.value.edit);
	// Tutorial + replay read-models (null tutorial for non-tutorial sessions).
	const tutorial = computed(() => state.value.tutorial);
	const replay = computed(() => state.value.replay);
	// Raw live Part instances — the renderer reads this directly each frame.
	const parts = computed<readonly Part[]>(() => state.value.parts);
	// Plain-data challenge read-model (null for a plain sandbox). The Vue panels
	// read this for the condition/restriction editors + the score.
	const challenge = computed(() => state.value.challenge);

	/**
	 * The live legacy `Challenge` domain object for the renderer to feed straight
	 * into Draw.DrawWorld's `challenge` param (condition-zone drawing). Not part
	 * of the reactive snapshot — call it each frame from the render loop.
	 */
	function liveChallenge() {
		return core.getLiveChallenge();
	}

	// Safe dispatch wrapper: many commands (play/pause/createShape/etc.) are
	// not yet migrated into GameCore and THROW "not yet migrated" there. The
	// UI frame needs to be clickable well before those handlers land, so we
	// swallow the error and warn instead of letting it crash the app.
	// `setTool`, `select`, and `clearSelection` are implemented in GameCore
	// and always take effect for real.
	function dispatch(command: Command): void {
		try {
			core.dispatch(command);
		} catch (err) {
			console.warn(`[gameStore] dispatch("${command.type}") failed:`, err);
		}
	}

	// Robot import/export passthroughs. Export returns the encoded string
	// (not a dispatched Command — dispatch returns void); import replaces the
	// parts graph and is undoable. Both are async (ByteArray compression is).
	function exportRobot(): Promise<string> {
		return core.exportRobot();
	}

	function importRobot(str: string): Promise<void> {
		return core.importRobot(str);
	}

	/**
	 * Finalize the current replay recording into serializable ReplayData (or null
	 * when nothing was recorded). A pure read — not a dispatched Command.
	 */
	function exportReplay() {
		return core.exportReplay();
	}

	/**
	 * Encode the current replay recording (+ its robot) to the legacy-compatible
	 * export string, or null when nothing was recorded. async (compression).
	 */
	function exportReplayString(): Promise<string | null> {
		return core.exportReplayString();
	}

	/** Decode a legacy replay export string and start playing it back. async. */
	function importReplay(str: string): Promise<void> {
		return core.importReplay(str);
	}

	// --- UI-only application mode (menu vs editor) ---------------------------
	// This is deliberately NOT part of GameCore/GameState: the headless core
	// knows only about robots/sim/edit, not about which screen the shell shows.
	// The original app had a ControllerMainMenu that swapped in the editor
	// controller; here that top-level screen switch lives purely in the Vue
	// layer. Defaults to the main menu (matches the original boot flow).
	type AppMode = "menu" | "editor";
	const appMode = ref<AppMode>("menu");

	/**
	 * Enter the editor. When `fresh` is true (Build a Robot / Sandbox from the
	 * menu) we also start a clean robot via the real `newRobot` command — the
	 * safe dispatch wrapper warns instead of crashing if it isn't migrated yet.
	 */
	function goToEditor(fresh = false): void {
		if (fresh) dispatch({ type: "newRobot" });
		appMode.value = "editor";
	}

	/** Return to the main menu screen. */
	function goToMenu(): void {
		appMode.value = "menu";
	}

	return {
		state,
		sim,
		camera,
		edit,
		parts,
		challenge,
		tutorial,
		replay,
		liveChallenge,
		dispatch,
		exportRobot,
		importRobot,
		exportReplay,
		exportReplayString,
		importReplay,
		appMode,
		goToEditor,
		goToMenu,
	};
});
