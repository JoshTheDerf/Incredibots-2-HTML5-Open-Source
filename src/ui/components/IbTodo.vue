<script setup lang="ts">
// Visual flag for UI that is ported but not yet wired to the game logic
// (no GameCore command exists yet, or it reads placeholder data). Keeps
// unwired controls obvious at a glance. Usage: <IbTodo /> or <IbTodo label="no command" />.
withDefaults(defineProps<{ label?: string }>(), { label: "not wired" });
</script>

<template>
	<span class="ib-todo-badge" title="This control is not yet connected to game logic">
		⚠ {{ label }}
	</span>
</template>
