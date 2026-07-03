<script setup lang="ts">
// Port of PartEditWindow's Fixed-Joint panel. Fixed joints carry no motor /
// material / colour — the legacy fixed-joint page (AdvancedPropertiesWindow
// jointAdv) exposes only the trigger list, which now lives in the "Advanced"
// pop-up window opened from PartInspectorFull (m_advancedButton_FJ). A non-empty
// triggerList makes the joint a breakable "triggered" joint
// (FixedJoint.IsTriggered). Delete / Cut / Copy / Paste live in the shared
// PartInspectorFull top-action row, so this panel is just an explainer.
</script>

<template>
	<div class="fixed-joint-props">
		<p class="hint">
			A fixed joint welds two shapes together. Use the <b>Advanced</b> button below
			to add trigger names that make it a breakable joint a trigger can destroy.
		</p>
	</div>
</template>

<style scoped>
.fixed-joint-props {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 4px 8px 10px;
}

.hint {
	font-size: 11px;
	color: var(--ib-muted);
	line-height: 1.4;
	margin: 0;
}
</style>
