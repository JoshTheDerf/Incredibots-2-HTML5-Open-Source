<script setup lang="ts">
// On-screen key controls — the key mobile feature.
//
// Robots in IncrediBots are driven by keyboard keys that individual parts bind
// (a rotating joint spins on its motorCW/CCW keys, thrusters fire on their
// thrustKey, etc.). Touch users have no keyboard, so this pad scans the CURRENT
// robot's parts for the keys they actually bind and surfaces one finger-sized
// button per unique key. Pressing a button dispatches the exact same
// `keyInput` command the physical keyboard path uses
// (Command.ts: { type: "keyInput"; key; up }), so no core changes are needed.
//
// Visible ONLY on mobile AND while the sim is running (game.sim.phase ===
// "running") — during editing there is nothing to drive. Positioned as a
// bottom gamepad cluster overlaying the canvas, semi-transparent so it stays
// out of the way.
import { computed } from "vue";
import { useGameStore } from "../gameStore";
import { keyCodeToLabel } from "../keyLabel";

const game = useGameStore();

// A control = one unique keyCode plus a short human hint of what it does. We
// dedupe by keyCode across all parts (two joints sharing ArrowLeft -> one
// button) and keep the first action hint we see for that key.
interface Control {
	key: number;
	label: string; // e.g. "◀"
	hint: string; // e.g. "motor"
}

// Structural view of the subclass fields we read off live Part instances. The
// exported base `Part` type doesn't declare subclass fields, so we read them
// through this loose shape (field names verified against src/Parts/*).
interface PartKeys {
	type?: string;
	enableMotor?: boolean;
	motorCWKey?: number;
	motorCCWKey?: number;
	autoCW?: boolean;
	autoCCW?: boolean;
	enablePiston?: boolean;
	pistonUpKey?: number;
	pistonDownKey?: number;
	autoOscillate?: boolean;
	thrustKey?: number;
	fireKey?: number;
	displayKey?: number;
}

const controls = computed<Control[]>(() => {
	const seen = new Map<number, Control>();
	const add = (key: number | undefined, hint: string): void => {
		if (key == null || seen.has(key)) return;
		seen.set(key, { key, label: keyCodeToLabel(key), hint });
	};

	for (const raw of game.parts) {
		const p = raw as unknown as PartKeys;
		switch (p.type) {
			case "RevoluteJoint":
				// Only a motor-enabled joint reacts to its keys (KeyInput sets the
				// down flags but Update only uses them when enableMotor). Auto-spin
				// joints don't need a manual key, so skip a direction that is auto.
				if (p.enableMotor) {
					if (!p.autoCW) add(p.motorCWKey, "spin ▶");
					if (!p.autoCCW) add(p.motorCCWKey, "spin ◀");
				}
				break;
			case "PrismaticJoint":
				if (p.enablePiston && !p.autoOscillate) {
					add(p.pistonUpKey, "extend");
					add(p.pistonDownKey, "retract");
				}
				break;
			case "Thrusters":
				// Thrusters have no enable flag — they always respond to thrustKey
				// (Thrusters.KeyInput). autoOn thrusters still let the key toggle.
				add(p.thrustKey, "thrust");
				break;
			case "Cannon":
				add(p.fireKey, "fire");
				break;
			case "TextPart":
				add(p.displayKey, "text");
				break;
		}
	}

	// Stable order: arrows first (37-40), then the rest by keyCode, so the pad
	// layout doesn't jump around between renders.
	return [...seen.values()].sort((a, b) => {
		const arrowA = a.key >= 37 && a.key <= 40 ? 0 : 1;
		const arrowB = b.key >= 37 && b.key <= 40 ? 0 : 1;
		return arrowA - arrowB || a.key - b.key;
	});
});

// Press / release dispatch the same keyInput command as the keyboard path.
// pointerdown = down, pointerup/leave/cancel = up (so a finger sliding off the
// button still releases the key). preventDefault on pointerdown stops the
// synthetic mouse/scroll/selection the browser would otherwise fire.
function press(control: Control, ev: PointerEvent): void {
	ev.preventDefault();
	game.dispatch({ type: "keyInput", key: control.key, up: false });
}

function release(control: Control): void {
	game.dispatch({ type: "keyInput", key: control.key, up: true });
}
</script>

<template>
	<div v-if="controls.length" class="mobile-control-pad" aria-label="Robot controls">
		<button
			v-for="c in controls"
			:key="c.key"
			type="button"
			class="pad-btn"
			@pointerdown="press(c, $event)"
			@pointerup="release(c)"
			@pointerleave="release(c)"
			@pointercancel="release(c)"
			@contextmenu.prevent
		>
			<span class="pad-key">{{ c.label }}</span>
			<span class="pad-hint">{{ c.hint }}</span>
		</button>
	</div>
</template>

<style scoped>
/* Gamepad cluster pinned to the bottom-right, overlaying the canvas. Buttons
   wrap right-to-left so the newest keys sit near the thumb. Semi-transparent so
   the play area stays visible behind it. */
.mobile-control-pad {
	position: absolute;
	right: 10px;
	bottom: 14px;
	z-index: 25;
	display: flex;
	flex-wrap: wrap-reverse;
	flex-direction: row-reverse;
	gap: 10px;
	max-width: 60vw;
	justify-content: flex-start;
	/* The buttons capture their own touches; the gaps shouldn't block canvas
	   panning behind the cluster. */
	pointer-events: none;
}

.pad-btn {
	/* Finger-sized tap target (>= 44px). */
	min-width: 56px;
	min-height: 56px;
	padding: 4px 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2px;
	border: 2px solid rgba(183, 170, 227, 0.7);
	border-radius: 12px;
	background: rgba(36, 41, 48, 0.62);
	color: #fdf9ea;
	font-family: Arial, Helvetica, sans-serif;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
	pointer-events: auto;
	/* Kill the browser's touch gestures on the control itself so a press drives
	   the robot instead of scrolling / zooming / selecting. */
	touch-action: none;
	-webkit-user-select: none;
	user-select: none;
	-webkit-tap-highlight-color: transparent;
	cursor: pointer;
}

.pad-btn:active {
	background: rgba(67, 54, 111, 0.85);
	border-color: #fdf9ea;
}

.pad-key {
	font-size: 20px;
	font-weight: bold;
	line-height: 1;
}

.pad-hint {
	font-size: 10px;
	opacity: 0.85;
	line-height: 1;
	white-space: nowrap;
}
</style>
