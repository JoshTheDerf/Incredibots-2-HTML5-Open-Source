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
import { keyCodeToLabel } from "../keyLabels";
import IbButton from "./IbButton.vue";

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
		<div v-for="c in controls" :key="c.key" class="pad-item">
			<!-- Reuse the standard IbButton pill so the pad matches every other
			     button. pointerdown/up drive keyInput (press-and-hold); the key glyph
			     is the button label so the player sees WHICH keyboard key it maps to. -->
			<IbButton
				family="blue"
				class="pad-btn"
				:title="`${c.label} — ${c.hint}`"
				:aria-label="`${c.hint} (key ${c.label})`"
				@pointerdown="press(c, $event)"
				@pointerup="release(c)"
				@pointerleave="release(c)"
				@pointercancel="release(c)"
				@contextmenu.prevent
			>
				{{ c.label }}
			</IbButton>
			<span class="pad-hint">{{ c.hint }}</span>
		</div>
	</div>
</template>

<style scoped>
/* Gamepad cluster in the bottom-right, overlaying the canvas. Raised off the
   bottom edge so it clears the mobile browser chrome (it was previously flush to
   the bottom and got cut off). Semi-transparent gaps so the play area stays
   visible; the buttons themselves capture their own touches. */
.mobile-control-pad {
	position: absolute;
	right: 12px;
	bottom: 72px;
	z-index: 25;
	display: flex;
	flex-wrap: wrap-reverse;
	flex-direction: row-reverse;
	align-items: flex-end;
	gap: 10px;
	max-width: 62vw;
	justify-content: flex-start;
	pointer-events: none;
}

/* One control = the standard IbButton pill (matching every other button) + a
   small action caption underneath. */
.pad-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	pointer-events: auto;
	-webkit-user-select: none;
	user-select: none;
}

/* Size the IbButton to a finger-sized square and show the key glyph large; the
   pill's own texture/colour supplies the styling (consistent with the toolbar). */
.pad-btn {
	min-width: 54px;
	min-height: 54px;
	font-size: 22px;
	font-weight: bold;
	touch-action: none;
	-webkit-tap-highlight-color: transparent;
}

/* Action caption ("thrust", "spin →", ...) — a legible chip under each key. */
.pad-hint {
	font-size: 10px;
	line-height: 1;
	color: #fdf9ea;
	background: rgba(36, 41, 48, 0.72);
	padding: 2px 5px;
	border-radius: 6px;
	white-space: nowrap;
}
</style>
