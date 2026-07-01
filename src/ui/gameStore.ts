// Pinia adapter over the headless GameCore.
//
// This store holds no authoritative state of its own — it instantiates a
// GameCore, subscribes to it, and mirrors the current state snapshot into a
// reactive ref so Vue components re-render on change. Components dispatch
// Commands through `dispatch`; they never mutate state directly. See
// docs/CONTRACT.md.

import { computed, shallowRef } from "vue";
import { defineStore } from "pinia";
import { GameCore } from "../core/GameCore";
import type { Command, EditState, SimState, CameraState } from "../core";

const core = new GameCore();

export const useGameStore = defineStore("game", () => {
	const state = shallowRef(core.getState());

	core.subscribe((next) => {
		state.value = next;
	});

	const sim = computed<Readonly<SimState>>(() => state.value.sim);
	const camera = computed<Readonly<CameraState>>(() => state.value.camera);
	const edit = computed<Readonly<EditState>>(() => state.value.edit);

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

	return { state, sim, camera, edit, dispatch };
});
