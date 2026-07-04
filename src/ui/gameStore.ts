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
import { getEngine2Backend, registerEngine2Backend } from "../Parts/partGlobals";
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

	// --- Engine 2 (Box2D v3) async wasm preload ------------------------------
	// Engine 2 is a WASM backend that lives OUTSIDE the node-clean core
	// (src/enginebox2d3). GameCore.handlePlay is synchronous, but the wasm load is
	// async, so we resolve the tension by PRELOADING here (§C2): when the user
	// selects engine 2, ensureEngine2() dynamically imports the adapter (its own
	// lazy chunk — engines 0/1 users never download it), awaits the wasm, builds
	// the Box2D3Backend, and REGISTERS it into partGlobals so it's already
	// available SYNCHRONOUSLY at play time. On failure the selection is reverted by
	// the caller and a notice is shown; play then still falls back to engine 1.
	const ENGINE2_LOADING_NOTICE = "Loading the Box2D 3 (beta) physics engine…";
	const engine2Status = ref<"idle" | "loading" | "ready" | "error">(
		getEngine2Backend() ? "ready" : "idle",
	);

	/**
	 * Ensure the engine-2 (Box2D v3) WASM backend is loaded and registered.
	 * Idempotent + memoized (loadBox2D3 itself memoizes the module). Resolves true
	 * when the backend is ready, false on load/instantiate failure (with a notice).
	 */
	async function ensureEngine2(): Promise<boolean> {
		if (getEngine2Backend()) {
			engine2Status.value = "ready";
			return true;
		}
		engine2Status.value = "loading";
		notice.value = ENGINE2_LOADING_NOTICE;
		try {
			const [{ loadBox2D3, BOX2D3_WASM_VERSION }, { Box2D3Backend }] = await Promise.all([
				import("../enginebox2d3/loadBox2D3"),
				import("../enginebox2d3/Box2D3Backend"),
			]);
			const module = await loadBox2D3();
			const backend = new Box2D3Backend(module);
			// Box2D3Backend's handle types are structurally distinct from engine-0's,
			// but handles are opaque by the PhysicsBackend contract — register under
			// the seam's type (same cast GameCore uses for engine 1).
			registerEngine2Backend(backend as never, BOX2D3_WASM_VERSION);
			engine2Status.value = "ready";
			// Clear the loading notice only if it's still ours (don't stomp a newer one).
			if (notice.value === ENGINE2_LOADING_NOTICE) notice.value = null;
			return true;
		} catch (err) {
			console.error("[gameStore] Box2D 3 (beta) physics failed to load:", err);
			engine2Status.value = "error";
			notice.value = "Box2D 3 (beta) physics failed to load. Staying on the IB3 (2.1a) engine.";
			return false;
		}
	}

	const sim = computed<Readonly<SimState>>(() => state.value.sim);
	const camera = computed<Readonly<CameraState>>(() => state.value.camera);
	const edit = computed<Readonly<EditState>>(() => state.value.edit);
	// Tutorial + replay read-models (null tutorial for non-tutorial sessions).
	const tutorial = computed(() => state.value.tutorial);
	const replay = computed(() => state.value.replay);
	// Raw live Part instances — the renderer reads this directly each frame.
	const parts = computed<readonly Part[]>(() => state.value.parts);
	// Live physical-shape count for the StatusBar (Jaybit DropDownMenu
	// shapeCounter). Delegates to the core's single predicate (getShapeCount;
	// informational only — the legacy 750-shape play limit is removed) instead
	// of reimplementing it; reading state.value recomputes on every core notify.
	const shapeCount = computed(() => {
		void state.value;
		return core.getShapeCount();
	});
	// Plain-data challenge read-model (null for a plain sandbox). The Vue panels
	// read this for the condition/restriction editors + the score.
	const challenge = computed(() => state.value.challenge);
	// In-progress condition stage-picking draft (null when not picking). The
	// ConditionsPanel reads it to hide itself + show the pick hint; GameCanvas
	// reads `conditionDraft.awaiting` to gate its picking gesture.
	const conditionDraft = computed(() => state.value.conditionDraft);
	// In-progress joint/thruster creation gesture (null when idle). GameCanvas reads
	// `phase` to drive the prismatic axis-preview + the >2-overlap disambiguation
	// cycle. See GameState.jointGesture.
	const jointGesture = computed(() => state.value.jointGesture);

	/**
	 * The live legacy `Challenge` domain object for the renderer to feed straight
	 * into Draw.DrawWorld's `challenge` param (condition-zone drawing). Not part
	 * of the reactive snapshot — call it each frame from the render loop.
	 */
	function liveChallenge() {
		return core.getLiveChallenge();
	}

	/**
	 * Live transient fracture fragments (superset/prototype). Like liveChallenge,
	 * these are read each render frame OUTSIDE the reactive snapshot and appended
	 * after state.parts in the DrawWorld call, so shatter fragments render with
	 * their inherited material without polluting the edit model.
	 */
	function liveFragments() {
		return core.getSimFragments();
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
	function exportRobot(name = "", desc = "", expo?: number): Promise<string> {
		return core.exportRobot(name, desc, expo);
	}

	function importRobot(str: string): Promise<void> {
		return core.importRobot(str);
	}

	/**
	 * Tutorial milestone: the user copied the exported robot code (ExportPanel's
	 * "Copy to Clipboard" — ControllerHomeMovies.copyButton -> 45 "copied").
	 * Deliberately NOT fired by exportRobot itself, which re-encodes on every
	 * name/desc keystroke.
	 */
	function notifyCodeCopied(): void {
		core.notifyCodeCopied();
	}

	/**
	 * Import And Insert (ControllerGame.importAndInsertButton): decode a robot code
	 * and APPEND its parts to the current robot instead of replacing. Undoable.
	 */
	function importRobotInsert(str: string): Promise<void> {
		return core.importRobotInsert(str);
	}

	// --- File (byte) import passthroughs ---------------------------------------
	// "Load from File": the UI reads bytes from a file input and hands them to the
	// core, which sniffs raw-blob vs pasted "eN" text-code files itself and stays
	// node-clean. (Save-to-File derives its bytes from the displayed export CODE via
	// codeToFileBytes — file === base64-decode(code) — so no export-file passthrough
	// is needed here.)
	function importRobotFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		return core.importRobotFile(bytes);
	}
	function importRobotFileInsert(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		return core.importRobotFileInsert(bytes);
	}
	function importChallengeFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		return core.importChallengeFile(bytes);
	}
	function importReplayFile(bytes: ArrayBuffer | Uint8Array): Promise<void> {
		return core.importReplayFile(bytes);
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
	function exportReplayString(meta?: import("../core").ReplayMeta): Promise<string | null> {
		return core.exportReplayString(meta);
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

	/**
	 * Decode a challenge EXPORT STRING (Database.ExportChallenge output) and make it
	 * the live challenge session. The string-import counterpart of
	 * loadBuiltInChallengeBlob (which takes raw .dat bytes). async. Editing-phase only.
	 */
	function importChallenge(str: string): Promise<void> {
		return core.importChallenge(str);
	}

	/**
	 * Encode the live challenge session to the legacy export string, or null when
	 * no challenge is active. async (compression). Mirrors exportReplayString.
	 */
	function exportChallengeString(name = "", desc = "", expo?: number): Promise<string | null> {
		return core.exportChallengeString(name, desc, expo);
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
	 * Enter the editor. When `fresh` is true (Sandbox Mode / Advanced Sandbox from
	 * the menu) we start a completely clean sandbox via `newSandbox` — a full
	 * fresh-controller reset that clears any prior challenge/tutorial/replay session,
	 * undo history, running sim, and restores the default environment. (Plain
	 * `newRobot` only drops the robot within the current session, which let the
	 * previous mode's content stick when re-entering the sandbox from the menu.)
	 */
	function goToEditor(fresh = false): void {
		if (fresh) dispatch({ type: "newSandbox" });
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
		// Fresh-controller reset first (clear any prior challenge/tutorial/sandbox
		// session + history + running sim), then start a clean authoring challenge on
		// top of the default sandbox — so the challenge editor never opens with the
		// previous mode's parts or a lingering tutorial dialog.
		dispatch({ type: "newSandbox" });
		dispatch({ type: "newChallenge" });
		appMode.value = "challengeEditor";
	}

	return {
		state,
		sim,
		camera,
		edit,
		parts,
		shapeCount,
		challenge,
		conditionDraft,
		jointGesture,
		tutorial,
		replay,
		liveChallenge,
		liveFragments,
		dispatch,
		exportRobot,
		notifyCodeCopied,
		importRobot,
		importRobotInsert,
		importRobotFile,
		importRobotFileInsert,
		importChallengeFile,
		importReplayFile,
		exportReplay,
		exportReplayString,
		importReplay,
		loadBuiltInChallengeBlob,
		importChallenge,
		exportChallengeString,
		appMode,
		goToEditor,
		goToMenu,
		goToChallengeEditor,
		notice,
		dismissNotice,
		engine2Status,
		ensureEngine2,
	};
});
