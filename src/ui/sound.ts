// UI-layer sound service — the audio the game core intentionally does NOT own.
//
// The headless core (src/core) stays pixi-free/node-clean: it EMITS plain string
// sound events (GameCore.onSound) and this service, living in the UI layer, maps
// them to the actual @pixi/sound playback. This mirrors the legacy split where
// the sound triggers lived in the Controller/Gui layer (ControllerGame.PlayShape
// Sound/PlayJointSound, the win/lose plays, GuiButton roll/click), never in the
// Part/physics classes.
//
// Faithful sound set (the only SFX the original actually has — Resource.ts:11-25):
//   shape-create (random of 5), joint-create (random of 5), win, lose, intro
//   music, and GUI rollover/click. There are NO collision/cannon/motor sounds.
//
// Loading mirrors Resource.LazySound (Resource.ts:152-204): @pixi/sound is
// dynamically imported on first playback so it never loads at module-init and
// never enters a core bundle. Assets are imported as URL modules (Vite
// fingerprints them), exactly as skyRenderer imports its PNGs.

import cRoll from "../../resource/roll_01.mp3";
import cClick from "../../resource/click_02.mp3";
import cShape1 from "../../resource/create_shape_1.mp3";
import cShape2 from "../../resource/create_shape_2.mp3";
import cShape3 from "../../resource/create_shape_3.mp3";
import cShape4 from "../../resource/create_shape_4.mp3";
import cShape5 from "../../resource/create_shape_5.mp3";
import cJoint1 from "../../resource/create_joint_1.mp3";
import cJoint2 from "../../resource/create_joint_2.mp3";
import cJoint3 from "../../resource/create_joint_3.mp3";
import cJoint4 from "../../resource/create_joint_4.mp3";
import cJoint5 from "../../resource/create_joint_5.mp3";
import cIntro from "../../resource/Incredibots_Intro.mp3";
import cWin from "../../resource/Incredibots_Win_r1.mp3";
import cLose from "../../resource/Incredibots_Lose_r2.mp3";

import { ref } from "vue";

// A minimal Sound handle we care about — matches the @pixi/sound surface used.
interface PixiSoundLike {
	play: (opts?: unknown) => unknown;
	stop: () => void;
	volume: number;
	loop: boolean;
}

/**
 * Deferred @pixi/sound wrapper (a UI-local port of Resource.LazySound): the pixi
 * package is dynamically imported the first time a clip actually plays, so the
 * audio stack (and its document/Audio use) never loads until the user triggers
 * sound. Fire-and-forget playback — callers never await.
 */
class LazyClip {
	private real: PixiSoundLike | null = null;
	private loadPromise: Promise<PixiSoundLike> | null = null;
	constructor(private readonly src: string, private readonly loop = false) {}

	private load(): Promise<PixiSoundLike> {
		if (!this.loadPromise) {
			this.loadPromise = import("@pixi/sound").then((mod) => {
				const s = mod.Sound.from(this.src) as unknown as PixiSoundLike;
				s.loop = this.loop;
				this.real = s;
				return s;
			});
		}
		return this.loadPromise;
	}

	play(): void {
		if (this.real) {
			this.real.play();
			return;
		}
		void this.load().then((s) => s.play());
	}

	stop(): void {
		if (this.real) this.real.stop();
		else void this.load().then((s) => s.stop());
	}
}

// The core's plain sound-event union (mirrored here; GameCore emits these).
export type CoreSoundEvent = "shapeCreated" | "jointCreated" | "won" | "lost";
// UI-only sounds that never originate in the core (GuiButton roll/click).
export type UiSoundEvent = "rollover" | "click";
export type SoundEvent = CoreSoundEvent | UiSoundEvent;

const shapeClips = [cShape1, cShape2, cShape3, cShape4, cShape5].map((s) => new LazyClip(s));
const jointClips = [cJoint1, cJoint2, cJoint3, cJoint4, cJoint5].map((s) => new LazyClip(s));
const rollClip = new LazyClip(cRoll);
const clickClip = new LazyClip(cClick);
const winClip = new LazyClip(cWin);
const loseClip = new LazyClip(cLose);
const introClip = new LazyClip(cIntro, /* loop */ true);

/**
 * The single sound service. `enabled` gates all playback (the legacy
 * Main.enableSound flag). Defaults OFF — the original main menu opens with sound
 * disabled and offers an "Enable Sound" toggle (ControllerMainMenu).
 */
class SoundService {
	// Vue-reactive so UI that reflects the on/off state (the MainMenu toggle AND
	// the editor MenuBar item) updates live and stays consistent across both.
	// Defaults OFF — see class doc / legacy Main.enableSound.
	private readonly _enabled = ref(false);

	get enabled(): boolean {
		return this._enabled.value;
	}
	setEnabled(v: boolean): void {
		this._enabled.value = v;
		if (!v) introClip.stop();
	}

	/** Play a one-shot SFX for a core or UI event. Random-of-5 for create sounds
	 *  (ControllerGame.PlayShapeSound :469 / PlayJointSound :486). */
	play(event: SoundEvent): void {
		if (!this._enabled.value) return;
		switch (event) {
			case "shapeCreated":
				shapeClips[Math.floor(Math.random() * shapeClips.length)].play();
				return;
			case "jointCreated":
				jointClips[Math.floor(Math.random() * jointClips.length)].play();
				return;
			case "won":
				winClip.play();
				return;
			case "lost":
				loseClip.play();
				return;
			case "rollover":
				rollClip.play();
				return;
			case "click":
				clickClip.play();
				return;
		}
	}

	/** Main-menu intro track (ControllerMainMenu.ts:112-116). Looped; no-op when
	 *  sound is disabled. */
	playIntro(): void {
		if (!this._enabled.value) return;
		introClip.play();
	}
	stopIntro(): void {
		introClip.stop();
	}
}

export const soundService = new SoundService();
