<script setup lang="ts">
// Gallery of all ported PIXI→Vue panels, for visual review. Standalone entry
// (ui-gallery.html); not part of the editor shell. Panels that still need
// GameCore wiring are marked in-component with the orange <IbTodo/> flag.
import PartInspectorFull from "./components/panels/PartInspectorFull.vue";
import ShapeProps from "./components/panels/ShapeProps.vue";
import JointProps from "./components/panels/JointProps.vue";
import ThrusterProps from "./components/panels/ThrusterProps.vue";
import CannonProps from "./components/panels/CannonProps.vue";
import TextProps from "./components/panels/TextProps.vue";
import ColorPickerPanel from "./components/panels/ColorPickerPanel.vue";
import SandboxSettingsPanel from "./components/panels/SandboxSettingsPanel.vue";
import ConditionsPanel from "./components/panels/ConditionsPanel.vue";
import RestrictionsPanel from "./components/panels/RestrictionsPanel.vue";
import ScorePanel from "./components/panels/ScorePanel.vue";
import TutorialPanel from "./components/panels/TutorialPanel.vue";
import TutorialSelectPanel from "./components/panels/TutorialSelectPanel.vue";
import ImportPanel from "./components/panels/ImportPanel.vue";
import ExportPanel from "./components/panels/ExportPanel.vue";
import PostReplayPanel from "./components/panels/PostReplayPanel.vue";
import LoadingPanel from "./components/panels/LoadingPanel.vue";
import IbDialog from "./components/panels/IbDialog.vue";

const entries = [
	{ title: "Part Inspector (full)", comp: PartInspectorFull },
	{ title: "Shape properties", comp: ShapeProps },
	{ title: "Joint properties", comp: JointProps },
	{ title: "Thruster properties", comp: ThrusterProps },
	{ title: "Cannon properties", comp: CannonProps },
	{ title: "Text properties", comp: TextProps },
	{ title: "Colour picker", comp: ColorPickerPanel },
	{ title: "Advanced sandbox", comp: SandboxSettingsPanel },
	{ title: "Conditions (challenge)", comp: ConditionsPanel },
	{ title: "Restrictions (challenge)", comp: RestrictionsPanel },
	{ title: "Score / results", comp: ScorePanel },
	{ title: "Tutorial message", comp: TutorialPanel },
	{ title: "Tutorial / level select", comp: TutorialSelectPanel },
	{ title: "Import robot", comp: ImportPanel },
	{ title: "Export robot", comp: ExportPanel },
	{ title: "Post-replay", comp: PostReplayPanel },
	{ title: "Load / loading", comp: LoadingPanel },
	{ title: "Generic dialog (IbDialog)", comp: IbDialog },
];
</script>

<template>
	<UApp>
		<div class="gallery">
			<h1 class="gallery-title">IncrediBots 2 — ported UI panels</h1>
			<p class="gallery-note">
				Every panel below is a Vue port of the original PIXI window. Controls with an
				orange <span class="ib-todo-badge">⚠ not wired</span> flag still need a GameCore command.
			</p>
			<div class="gallery-grid">
				<section v-for="e in entries" :key="e.title" class="gallery-cell">
					<header class="cell-title">{{ e.title }}</header>
					<div class="cell-body">
						<component :is="e.comp" />
					</div>
				</section>
			</div>
		</div>
	</UApp>
</template>

<style scoped>
.gallery {
	min-height: 100vh;
	background: var(--ib-page-bg, #686d77);
	font-family: Arial, sans-serif;
	padding: 24px;
	box-sizing: border-box;
}
.gallery-title {
	color: #fff;
	font-size: 22px;
	margin: 0 0 4px;
}
.gallery-note {
	color: #e6e6ee;
	font-size: 13px;
	margin: 0 0 20px;
	display: flex;
	align-items: center;
	gap: 6px;
}
.gallery-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	gap: 24px;
	align-items: start;
}
.gallery-cell {
	background: rgba(0, 0, 0, 0.15);
	border-radius: 6px;
	padding: 10px;
}
.cell-title {
	color: #fff;
	font-size: 12px;
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	opacity: 0.75;
	margin-bottom: 8px;
}
.cell-body {
	display: flex;
	justify-content: center;
}
</style>
