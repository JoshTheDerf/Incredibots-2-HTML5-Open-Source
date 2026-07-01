<script setup lang="ts">
// Presentational glossy-pill button reusing the real legacy textures via a
// nine-patch border-image (see ib-theme.css `.ib-btn`). Purely visual — all
// click/dispatch wiring stays in the parent via the native click event.
import { computed } from "vue";
import { ibBtnVars, type ButtonFamily } from "../assets";

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
</script>

<template>
	<button
		type="button"
		class="ib-btn"
		:class="{ 'is-pressed': pressed, 'ib-btn--play': play }"
		:style="styleVars"
		:disabled="disabled"
	>
		<slot>{{ label }}</slot>
	</button>
</template>
