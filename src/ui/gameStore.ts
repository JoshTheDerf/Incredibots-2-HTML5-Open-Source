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
import { soundService } from "./sound";

const core = new GameCore();

export const useGameStore = defineStore("game", () => {
	const state = shallowRef(core.getState());

	core.subscribe((next) => {
		state.value = next;
	});
	// Core emits game sound events (shapeCreated/jointCreated/won/lost); the UI
	// sound service plays them (gated by its own enabled flag). See src/ui/sound.ts.
	core.onSound((e) => soundService.play(e));
	// Core emits user-facing messages (e.g. the play-refuse dialogs); mirror the
	// latest into `notice` for the UI to show. dismissNotice() clears it.
	const notice = ref<string | null>(null);
	core.onMessage((m) => {
		notice.value = m;
	});

	/** Clear the current notice (dialog dismissed / OK). */
	function dismissNotice(): void {
		notice.value = null;
	}

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
	// In-progress condition stage-picking draft (null when not picking). The
	// ConditionsPanel reads it to hide itself + show the pick hint; GameCanvas
	// reads `conditionDraft.awaiting` to gate its picking gesture.
	const conditionDraft = computed(() => state.value.conditionDraft);

	/**
	 * The live legacy `Challenge` domain object for the renderer to feed straight
	 * into Draw.DrawWorld's `challenge` param (condition-zone drawing). Not part
	 * of the reactive snapshot — call it each frame from the render loop.
	 */
	function liveChallenge() {
		return core.getLiveChallenge();
	}

	// Defensive dispatch wrapper: a handler throw must NOT crash the whole app
	// (the UI frame stays usable), but it must be LOUD so broken commands are
	// visible — previously a silent console.warn masked real bugs like the
	// un-migrated newRobot throw (Bug 4). We log at console.error and re-throw on
	// the next tick, surfacing the error in the console / dev overlay without
	// unwinding the caller's click handler.
	function dispatch(command: Command): void {
		try {
			core.dispatch(command);
		} catch (err) {
			console.error(`[gameStore] dispatch("${command.type}") failed:`, err);
			setTimeout(() => {
				throw err;
			}, 0);
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

	// Load a blob-backed built-in challenge (Race / Spaceship) from its raw .dat
	// bytes. A dispatch command can't carry the ArrayBuffer, so this is a direct
	// passthrough to GameCore.loadBuiltInChallengeBlob (the MainMenu picker fetches
	// the .dat and calls this).
	function loadBuiltInChallengeBlob(name: "race" | "spaceship", blob: ArrayBuffer | Uint8Array): Promise<void> {
		return core.loadBuiltInChallengeBlob(name, blob);
	}

	// --- UI-only application mode (menu vs editor) ---------------------------
	// This is deliberately NOT part of GameCore/GameState: the headless core
	// knows only about robots/sim/edit, not about which screen the shell shows.
	// The original app had a ControllerMainMenu that swapped in the editor
	// controller; here that top-level screen switch lives purely in the Vue
	// layer. Defaults to the main menu (matches the original boot flow).
	// "challengeEditor" is the sandbox editor with challenge commands active (the
	// author builds the challenge's win/loss conditions + build areas). A later
	// agent wires the App shell + menus to it.
	type AppMode = "menu" | "editor" | "challengeEditor";
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

	/**
	 * Enter the challenge editor: start a fresh challenge (`newChallenge` seeds the
	 * challenge session with default conditions/build areas) then switch to the
	 * challengeEditor screen. The challenge editor is the sandbox editor with the
	 * challenge commands active; a later agent wires the App shell + menus to it.
	 */
	function goToChallengeEditor(): void {
		dispatch({ type: "newChallenge" });
		appMode.value = "challengeEditor";
	}

	return {
		state,
		sim,
		camera,
		edit,
		parts,
		challenge,
		conditionDraft,
		tutorial,
		replay,
		liveChallenge,
		dispatch,
		exportRobot,
		importRobot,
		exportReplay,
		exportReplayString,
		importReplay,
		loadBuiltInChallengeBlob,
		appMode,
		goToEditor,
		goToMenu,
		goToChallengeEditor,
		notice,
		dismissNotice,
	};
});
