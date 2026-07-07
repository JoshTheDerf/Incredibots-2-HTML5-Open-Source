// Camera / view + sandbox-settings operations.
//
// Extracted from GameCore: zoom (menu + pinch), centre-on-selection, the
// editor pan with its sandbox-bounds clamp, and the Advanced Sandbox settings
// apply (terrain rebuild). Free functions over the CoreInternals seam;
// GameCore's command switch delegates here.

import type { Command } from "./Command";
import type { CoreInternals } from "./coreInternals";
import { currentXY } from "./geometryEdit";
import { buildTerrainParts, computeBounds, defaultWaterHeight } from "./sandboxEnvironment";

// Zoom factor + clamps, ported from ControllerGame.Zoom (:6705) and
// ControllerGameGlobals MIN/MAX_ZOOM_VAL (:33-34). Zoom in multiplies the scale
// by 4/3, out by 3/4, clamped to [12, 75]; the view centre is held fixed.
export const ZOOM_IN_FACTOR = 4.0 / 3.0;
export const ZOOM_OUT_FACTOR = 3.0 / 4.0;
const MIN_ZOOM_VAL = 12;
const MAX_ZOOM_VAL = 75;

/**
 * Adjust camera.scale by `factor` (4/3 zoom-in, 3/4 zoom-out — ControllerGame
 * .Zoom :6705), clamped to [MIN_ZOOM_VAL, MAX_ZOOM_VAL]. Keeps the view centre
 * fixed: in the responsive-canvas convention screen = canvas/2 + world*scale -
 * offset, so the world point at the view centre is offset/scale; holding it
 * fixed while scaling means offset scales by the same ratio (matching Zoom's
 * centerX/Y = (drawXOff)/scale round-trip, ControllerGame.ts:6706-6716).
 */
export function handleZoom(core: CoreInternals, factor: number): void {
	const oldScale = core.state.camera.scale;
	let newScale = oldScale * factor;
	if (newScale > MAX_ZOOM_VAL) newScale = MAX_ZOOM_VAL;
	if (newScale < MIN_ZOOM_VAL) newScale = MIN_ZOOM_VAL;
	if (newScale === oldScale) return;
	const ratio = newScale / oldScale;
	core.state = {
		...core.state,
		camera: {
			scale: newScale,
			offsetX: core.state.camera.offsetX * ratio,
			offsetY: core.state.camera.offsetY * ratio,
		},
	};
	core.markChanged();
}

/**
 * zoomCamera — pinch-zoom ABOUT a focal screen point (GameCanvas two-finger
 * gesture). Multiply camera.scale by `scaleFactor`, clamp to [MIN_ZOOM_VAL,
 * MAX_ZOOM_VAL], and adjust camera.offset so the WORLD point under the focal
 * screen point (focusX,focusY) stays under it after the zoom.
 *
 * From the transform `screen = view/2 + world*scale - offset` (so
 * `world = (screen - view/2 + offset)/scale`, matching sceneRenderer's
 * screenToWorld):
 *   worldUnderFocus = (focusX - viewW/2 + offsetX) / oldScale
 *   offsetX' = viewW/2 + worldUnderFocus*newScale - focusX      (and same for Y)
 * i.e. solve the transform for offset holding worldUnderFocus + focus fixed.
 * The CLAMPED newScale is used in the offset math so there's no focal drift at
 * the zoom limits. Unlike panCamera we do NOT bounds-clamp the offset — the
 * focal-point invariant must be exact.
 */
export function handleZoomCamera(core: CoreInternals, scaleFactor: number, focusX: number, focusY: number, viewW: number, viewH: number): void {
	const cam = core.state.camera;
	const oldScale = cam.scale;
	let newScale = oldScale * scaleFactor;
	if (newScale > MAX_ZOOM_VAL) newScale = MAX_ZOOM_VAL;
	if (newScale < MIN_ZOOM_VAL) newScale = MIN_ZOOM_VAL;
	if (newScale === oldScale) return;
	const worldUnderFocusX = (focusX - viewW / 2 + cam.offsetX) / oldScale;
	const worldUnderFocusY = (focusY - viewH / 2 + cam.offsetY) / oldScale;
	const offsetX = viewW / 2 + worldUnderFocusX * newScale - focusX;
	const offsetY = viewH / 2 + worldUnderFocusY * newScale - focusY;
	core.state = {
		...core.state,
		camera: { scale: newScale, offsetX, offsetY },
	};
	core.markChanged();
}

/**
 * centerOnSelection — ControllerGame.CenterOnSelected (:2542-2564). Centre the
 * camera on the selection's bounding-box centroid. The legacy pins the selection
 * centre at ZOOM_FOCUS in its own draw-offset units; in the port's camera model
 * (screen = canvas/2 + world*scale - offset) pinning the centroid to the canvas
 * centre means offset = centroid*scale — the same convention handleCamera uses
 * to follow the focus part. No-op when the selection is empty.
 */
export function handleCenterOnSelection(core: CoreInternals): void {
	const selection = core.state.edit.selection;
	if (selection.length === 0) return;
	let minX = Number.MAX_VALUE;
	let minY = Number.MAX_VALUE;
	let maxX = -Number.MAX_VALUE;
	let maxY = -Number.MAX_VALUE;
	let found = false;
	for (const id of selection) {
		const p = core.findPart(id);
		if (!p) continue;
		const { x, y } = currentXY(p);
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
		found = true;
	}
	if (!found) return;
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const scale = core.state.camera.scale;
	core.state = {
		...core.state,
		camera: { ...core.state.camera, offsetX: centerX * scale, offsetY: centerY * scale },
	};
	core.markChanged();
}

/**
 * panCamera — drag the editor view over empty world space with the Select tool
 * (ControllerGame MouseDrag "dragging the world around" :1834-1835 + the
 * boundary clamp :1846-1863). `dx`/`dy` are screen-pixel mouse deltas.
 *
 * Port camera model: screen = viewW/2 + world*scale - offset, so the world
 * coordinate at a screen pixel `sx` is (sx - viewW/2 + offsetX)/scale. The
 * legacy subtracts the screen-space mouse delta from the draw offset
 * (m_drawXOff -= dScreen); here m_drawXOff = offset - viewW/2, so we subtract
 * the delta from offset directly.
 *
 * Then clamp exactly as the legacy: compute the visible world edges and, if an
 * edge crosses a sandbox bound, push the offset back so the edge sits on the
 * bound. Faithful to GetMinX/MaxX/MinY/MaxY — the legacy's getters return
 * ±MAX_VALUE (an effective no-op), but the port has real sandbox bounds
 * (computeBounds ← ControllerSandbox.GetMinX/MaxX :680-714), so this clamp
 * actually confines the view to the sandbox.
 */
export function handlePanCamera(core: CoreInternals, dx: number, dy: number, viewW: number, viewH: number): void {
	const { scale } = core.state.camera;
	let offsetX = core.state.camera.offsetX - dx;
	let offsetY = core.state.camera.offsetY - dy;
	const { minX, maxX, minY, maxY } = core.state.sandbox.bounds;
	const worldAt = (screen: number, view: number, off: number): number => (screen - view / 2 + off) / scale;

	// X clamp (:1855-1862): if the left edge is past minX, push right; else if
	// the right edge is past maxX, push left.
	const minWorldX = worldAt(0, viewW, offsetX);
	const maxWorldX = worldAt(viewW, viewW, offsetX);
	if (minWorldX < minX) {
		offsetX += (minX - minWorldX) * scale;
	} else if (maxWorldX > maxX) {
		offsetX -= (maxWorldX - maxX) * scale;
	}

	// Y clamp (:1847-1853): if the top edge is past minY, push down; else if the
	// bottom edge is past maxY, push up.
	const minWorldY = worldAt(0, viewH, offsetY);
	const maxWorldY = worldAt(viewH, viewH, offsetY);
	if (minWorldY < minY) {
		offsetY += (minY - minWorldY) * scale;
	} else if (maxWorldY > maxY) {
		offsetY -= (maxWorldY - maxY) * scale;
	}

	if (offsetX === core.state.camera.offsetX && offsetY === core.state.camera.offsetY) return;
	core.state = { ...core.state, camera: { ...core.state.camera, offsetX, offsetY } };
	core.markChanged();
}

/**
 * setSandboxSettings: faithful port of AdvancedSandboxWindow's Apply +
 * ControllerSandbox.RefreshSandboxSettings (ControllerSandbox.ts:570-678).
 *
 * Store the new settings on state.sandbox, then (editing phase only, which is
 * the only phase this reaches — see the sim guard) REBUILD the isSandbox
 * terrain bodies from the new terrainType/size and recompute the world bounds.
 * Robot parts (isSandbox false) are untouched; the sim/world are NOT reset.
 * Gravity is stored but applied only at the next play (createWorld reads
 * state.sandbox.gravity), matching the legacy deferred behaviour (spec §4).
 *
 * Not registered as "mutating" for undo — the legacy Apply is a sandbox-config
 * operation outside the robot-edit undo history, and it drops/rebuilds the
 * terrain wholesale (RefreshSandboxSettings clears groundParts, :571-573).
 */
export function handleSetSandboxSettings(core: CoreInternals, command: Extract<Command, { type: "setSandboxSettings" }>): void {
	const next = {
		gravity: command.gravity,
		size: command.size,
		terrainType: command.terrainType,
		terrainTheme: command.terrainTheme,
		background: command.background,
		backgroundR: command.backgroundR,
		backgroundG: command.backgroundG,
		backgroundB: command.backgroundB,
		// Ground style is preserved from the current design (the terrain-shape
		// panel doesn't change it); an IB3-imported design keeps IB3 ground when
		// its size/shape is edited.
		bounds: computeBounds({
			size: command.size,
			terrainType: command.terrainType,
			groundStyle: core.state.sandbox.groundStyle,
		}),
		// Water settings: replaced when the command carries them (P6 water
		// panel), preserved otherwise so pre-water callers are unaffected.
		water: command.water ?? core.state.sandbox.water,
		// Physics engine: replaced when the command carries it (engine selector),
		// preserved otherwise. Like gravity, it takes effect at the NEXT play
		// (the backend is chosen at world creation — see applyPlayBackend).
		physicsEngine: command.physicsEngine ?? core.state.sandbox.physicsEngine,
		groundStyle: core.state.sandbox.groundStyle,
		// IB3 superset physics (horizontal gravity + restitution mode): replaced
		// when the command carries them, preserved otherwise. Take effect next play.
		gravityX: command.gravityX ?? core.state.sandbox.gravityX,
		restitutionType: command.restitutionType ?? core.state.sandbox.restitutionType,
	};
	// If water is OFF, reseed its (latent, default) surface to the NEW ground's
	// top so a later enable doesn't flood the terrain (defaultWaterHeight). An
	// ENABLED water config is the user's — leave its height untouched.
	if (!next.water.enabled) {
		next.water = { ...next.water, height: defaultWaterHeight(next) };
	}

	// Drop the current terrain bodies (isSandbox) and rebuild from the new
	// settings, keeping robot parts in place. Preserve robot-part ordering.
	const robotParts = core.state.parts.filter((p) => !(p as { isSandbox?: boolean }).isSandbox);
	const terrainParts = buildTerrainParts(next);
	for (const p of terrainParts) p.id = ++core.nextId;

	core.state = {
		...core.state,
		sandbox: next,
		// Terrain first so it draws behind robot parts, matching BuildGround
		// which pushes ground into allParts before the robot exists.
		parts: [...terrainParts, ...robotParts],
	};
	core.markChanged();
}
