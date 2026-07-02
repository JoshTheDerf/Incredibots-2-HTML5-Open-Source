<script setup lang="ts">
// Presentational glossy-pill button reusing the real legacy textures via a
// nine-patch border-image (see ib-theme.css `.ib-btn`). Purely visual — all
// click/dispatch wiring stays in the parent via the native click event.
import { computed } from "vue";
import { ibBtnVars, type ButtonFamily } from "../assets";
import { soundService } from "../sound";

const props = withDefaults(
	defineProps<{
		family?: ButtonFamily;
		label?: string;
		pressed?: boolean;
		disabled?: boolean;
		play?: boolean;
	}>(),
	{ family: "purple", label: "", pressed: false, disabled: false, play: false },
);

const styleVars = computed(() => ibBtnVars(props.family));

// GUI rollover/click SFX, faithful to Gui/GuiButton.ts:197 (roll) / :209 (click).
// No-op unless sound is enabled; skipped on disabled buttons. The click sound
// does not consume the event — the parent's native @click still fires.
function onEnter(): void {
	if (!props.disabled) soundService.play("rollover");
}
function onClick(): void {
	if (!props.disabled) soundService.play("click");
}
</script>

<template>
	<button
		type="button"
		class="ib-btn"
		:class="{ 'is-pressed': pressed, 'ib-btn--play': play }"
		:style="styleVars"
		:disabled="disabled"
		@pointerenter="onEnter"
		@click="onClick"
	>
		<slot>{{ label }}</slot>
	</button>
</template>
