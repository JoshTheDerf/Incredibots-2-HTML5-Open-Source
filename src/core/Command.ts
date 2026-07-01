// Core⇄view contract — COMMANDS
//
// Every mutation of game state flows through a Command. This mirrors the
// existing src/Actions/* undo/redo pattern (each editing Command will produce
// an Action pushed onto the undo stack), but gives the UI a single, serializable
// entry point that does not depend on ControllerGame or Pixi.
//
// The Vue + Nuxt UI layer dispatches these; the renderer never mutates — it only
// reads state. See docs/CONTRACT.md.

export type ToolMode =
	| "select"
	| "newCircle"
	| "newRect"
	| "newTriangle"
	| "newFixedJoint"
	| "newRevoluteJoint"
	| "newPrismaticJoint"
	| "newText"
	| "newThrusters"
	| "newCannon"
	| "rotate"
	| "resize";

export type ShapeKind = "circle" | "rect" | "triangle" | "cannon";

/**
 * Discriminated union of everything the UI can ask the core to do.
 * Keep every payload plain-serializable (no class instances, no Pixi types) so
 * the contract can later be sent across a Web Worker boundary unchanged.
 */
export type Command =
	// --- simulation control ---
	| { type: "play" }
	| { type: "pause" }
	| { type: "reset" }
	| { type: "step"; frames?: number }
	// --- editing (each produces an undoable Action) ---
	| { type: "setTool"; tool: ToolMode }
	// Create a shape from the ORIGINAL click-drag gesture (ControllerGame.mouseClick
	// NEW_CIRCLE/NEW_RECT/NEW_TRIANGLE, :2190/:2217/:2282). Per kind:
	//   circle   — (x1,y1) is the CENTRE (press), radius = dist to (x2,y2) release  (:2196-2204)
	//   rect     — (x1,y1)..(x2,y2) are opposite corners (press..release)           (:2228-2232)
	//   triangle — (x1,y1)..(x2,y2) is the BASE edge (first press-drag-release, the
	//              base length clamped to Triangle's range :2295-2316) and (x3,y3)
	//              is the APEX (a second click, validated :2352-2360). x3/y3 are
	//              REQUIRED for triangle and ignored otherwise — matching the
	//              original's 3-click gesture faithfully.
	// GameCore clamps each dimension to the Part's legal size range and rejects a
	// degenerate (zero-length base / collinear apex) gesture. cannon is not created
	// via this command.
	| { type: "createShape"; kind: ShapeKind; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number }
	| { type: "createText"; x: number; y: number; text: string }
	// Attach a Thrusters / Cannon at the click point. createThrusters snaps onto
	// the single shape under (x,y) (ControllerGame.MaybeCreateThrusters :6797);
	// createCannon places a free-standing Cannon ShapePart (NEW_CANNON flow :2251).
	| { type: "createThrusters"; x: number; y: number }
	| { type: "createCannon"; x: number; y: number }
	// Create a joint at the click point, attaching the two overlapping shapes
	// under (x,y). Mirrors ControllerGame.MaybeCreateJoint (:6736) /
	// MaybeStart/FinishCreatingPrismaticJoint (:6849/:6889). SIMPLIFICATION: the
	// single-click form takes the top two overlapping shapes — the original's
	// >2-overlap disambiguation click-cycle is collapsed. Needs ≥2 overlapping shapes.
	| { type: "createJoint"; kind: "fixed" | "revolute" | "prismatic"; x: number; y: number }
	| { type: "deleteParts"; partIds: number[] }
	| { type: "moveParts"; partIds: number[]; dx: number; dy: number }
	| { type: "rotateParts"; partIds: number[]; angle: number }
	| { type: "resizeParts"; partIds: number[]; scaleFactor: number }
	| { type: "setColour"; partIds: number[]; r: number; g: number; b: number; opacity: number }
	// --- per-property part edits (ported from ControllerGame + src/Actions/*) ---
	// Shape (ShapePart: Circle/Rectangle/Triangle/Cannon). Values are absolute
	// (the legacy sliders set the field directly; the Action only recorded a
	// delta for undo — see ControllerGame.densitySlider/strengthSlider).
	| { type: "setDensity"; partIds: number[]; value: number }
	| { type: "setCollide"; partIds: number[]; value: boolean }
	| { type: "setCameraFocus"; partIds: number[]; value: boolean }
	| { type: "setFixate"; partIds: number[]; value: boolean }
	| { type: "setOutline"; partIds: number[]; value: boolean }
	| { type: "setOutlineBehind"; partIds: number[]; value: boolean }
	| { type: "setUndragable"; partIds: number[]; value: boolean }
	// Joint (RevoluteJoint / PrismaticJoint). `which` selects which of the two
	// control keys / auto flags a joint carries (cw/ccw for revolute, up/down &
	// oscillate for prismatic). Limits are in DEGREES; use null for "None"
	// (stored as ∓Number.MAX_VALUE on the part — see minLimitText/maxLimitText).
	| { type: "setJointMotor"; partIds: number[]; value: boolean }
	| { type: "setJointStrength"; partIds: number[]; value: number }
	| { type: "setJointSpeed"; partIds: number[]; value: number }
	| { type: "setJointLimits"; partIds: number[]; lower: number | null; upper: number | null }
	| { type: "setJointControlKey"; partIds: number[]; which: "cw" | "ccw" | "up" | "down"; key: number }
	| { type: "setJointAutoOn"; partIds: number[]; which: "cw" | "ccw" | "oscillate"; value: boolean }
	| { type: "setJointStiff"; partIds: number[]; value: boolean }
	| { type: "setJointInitialLength"; partIds: number[]; value: number }
	// Thruster
	| { type: "setThrusterStrength"; partIds: number[]; value: number }
	| { type: "setThrusterKey"; partIds: number[]; key: number }
	| { type: "setThrusterAutoOn"; partIds: number[]; value: boolean }
	// Cannon
	| { type: "setCannonStrength"; partIds: number[]; value: number }
	| { type: "setCannonFireKey"; partIds: number[]; key: number }
	// Text
	| { type: "setTextContent"; partIds: number[]; text: string }
	| { type: "setTextSize"; partIds: number[]; value: number }
	| { type: "setTextDisplayKey"; partIds: number[]; key: number }
	| { type: "setTextAlwaysVisible"; partIds: number[]; value: boolean }
	| { type: "setTextScaleWithZoom"; partIds: number[]; value: boolean }
	// --- sandbox environment (ported from AdvancedSandboxWindow Apply flow) ---
	// Mirrors AdvancedSandboxWindow.okButtonPressed + ControllerSandbox.
	// RefreshSandboxSettings (ControllerSandbox.ts:570-678): store the new
	// settings, and while editing rebuild the isSandbox terrain bodies + world
	// bounds from the new terrainType/size WITHOUT touching robot parts or the
	// sim. Gravity is applied at the NEXT play (world creation), not live —
	// GetGravity() is read at world-creation time (spec §4). Enum axes match
	// SandboxSettings.* (size 0-2, terrainType 0-2, terrainTheme 0-6,
	// background 0-6, R/G/B 0-255).
	| {
			type: "setSandboxSettings";
			gravity: number;
			size: number;
			terrainType: number;
			terrainTheme: number;
			background: number;
			backgroundR: number;
			backgroundG: number;
			backgroundB: number;
	  }
	// --- selection (view state, but routed through the core so it stays authoritative) ---
	| { type: "select"; partIds: number[]; additive?: boolean }
	| { type: "clearSelection" }
	// --- undo/redo ---
	| { type: "undo" }
	| { type: "redo" }
	// --- persistence (ByteArray under the hood; no network) ---
	| { type: "loadRobot"; data: Uint8Array }
	| { type: "newRobot" };

export type CommandType = Command["type"];
