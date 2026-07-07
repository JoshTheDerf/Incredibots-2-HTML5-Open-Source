// Tutorial system — a faithful, node-clean port of the legacy tutorial dialog
// state machine + message table + level-select mapping.
//
// Sources (see docs/PORT-SPEC-tutorials-replays.md §A):
//   - src/Gui/TutorialWindow.ts — TUTORIAL_MESSAGES table + window sizing/clamps.
//   - src/Gui/TutorialSelectWindow.ts — level → controllerType → levelDone mapping.
//   - src/Game/Tutorials/ControllerTutorial.ts + subclasses — the per-tutorial
//     hand-coded dialog state machine (Init + CloseTutorialDialog switch +
//     game-event triggers). There is NO generic step model; each tutorial is a
//     faithful transcription of its subclass's num→num branches.
//
// This module is Pixi-free / DOM-free so the headless core owns tutorial logic.

import { Circle } from "../Parts/Circle";
import type { Part } from "../Parts/Part";
import { ShapePart } from "../Parts/ShapePart";
import {
	buildBaseTerrain,
	buildTankScene,
	buildCarScene,
	buildJumpbotScene,
	buildDumpbotScene,
	buildCatapultScene,
	buildHomeMoviesScene,
	buildRubeGoldbergScene,
	buildNewFeaturesScene,
	buildChallengeEditorScene,
} from "./tutorialTerrain";

/**
 * The prebuilt scene a tutorial loads: its baked terrain + any prefab bot the
 * player drives (e.g. ControllerTank's tank, ControllerCatapult's catapult).
 * GameCore.handleLoadTutorial calls this on load and, if non-empty, replaces the
 * scene with these parts (assigning ids). Faithful port of each subclass's
 * constructor-built parts (see src/core/tutorialTerrain.ts).
 *
 * Tank/Shapes/Car/Jumpbot/Dumpbot/Catapult extend ControllerTutorial and share
 * its baked landscape (buildBaseTerrain); each adds its own prefab parts on top,
 * in constructor order (base terrain first, then the subclass parts). HomeMovies/
 * RubeGoldberg/NewFeatures extend ControllerSandbox and ChallengeEditor extends
 * ControllerChallenge, so those four have NO base terrain — only their prefab.
 */
export function getTutorialSetup(levelIndex: number): Part[] {
	switch (levelIndex) {
		case 0: // Tank
			return [...buildBaseTerrain(), ...buildTankScene()];
		case 1: // Shapes — base terrain only (adds no parts of its own)
			return buildBaseTerrain();
		case 2: // Car
			return [...buildBaseTerrain(), ...buildCarScene()];
		case 3: // Jumpbot
			return [...buildBaseTerrain(), ...buildJumpbotScene()];
		case 4: // Dumpbot
			return [...buildBaseTerrain(), ...buildDumpbotScene()];
		case 5: // Catapult
			return [...buildBaseTerrain(), ...buildCatapultScene()];
		case 6: // Home Movies (ControllerSandbox — no base terrain)
			return buildHomeMoviesScene();
		case 7: // Rube Goldberg (ControllerSandbox)
			return buildRubeGoldbergScene();
		case 8: // New in IB2 (ControllerSandbox)
			return buildNewFeaturesScene();
		case 9: // Challenge Editor (ControllerChallenge)
			return buildChallengeEditorScene();
		default:
			return [];
	}
}

/**
 * TUTORIAL_MESSAGES (src/Gui/TutorialWindow.ts:115-224). Index == the message
 * id / phraseNum. 108 entries (0-107). Each is a \n-delimited string. Ported
 * verbatim so the message layout matches the original exactly.
 */
export const TUTORIAL_MESSAGES: string[] = [
	"Welcome to the world of IncrediBots 2!\n\nThis is the robot building screen,\nwhere you'll learn to construct\namazing robots like this tank... or\nanything else you can imagine!",
	"These introductory levels will teach you\nthe game’s basics. Later, for a real test\nof your skill, go to one of the\n\"Challenges\" from the main menu.\n\nOr try Sandbox Mode, where you can\nmake any robot or contraption you want!",
	"For now, click and drag the world\naround to explore, and click \"Zoom In\"\nand \"Zoom Out\" as necessary.\n\nHit the \"Play!\" button when\nyou’re ready to control the Tank-Bot!",
	"Good job!\n\nYou can watch or save a replay using the\nmenu that appears after playing a level.\n\nYou can also submit your score to the\nworldwide high scores list!",
	"Now you'll learn some of\nthe game's tools so you can make\nyour own creations...\n\nFirst, click \"Rectangle\", then click\nand drag to draw a rectangle within\nthe yellow box to the left.",
	"\nGood! Next draw a triangle.\n\nClick \"Triangle\", then click 3 times\nto place the 3 points of your triangle,\nagain within the yellow box.",
	"\nThat's it. Next up is the circle tool.\n\nClick \"Circle\", then click and drag\nwithin the yellow box to the left to draw\na circle.",
	"Your goal is to get the circle to roll into\nthe pit to the right. Click \"Play!\" and\nlet gravity do its work!\n\nIf the circle gets stuck on something,\nstop the simulation and move the\nshapes around until it works.",
	"Now you'll complete the construction\nof this basic Car-Bot!\n\nThe wheels and body of the car have\nbeen created below, but they need\nto be  joined together...",
	"\nMake a \"Rotating Joint\"\nby clicking its button, then clicking\non the center point of one\nof the wheels.",
	"Great! This joins the wheel to the body\nof the car, and allows it to rotate.\n\nBefore you do the same for the second\nwheel, click the \"Snap to Center\" option\nin the \"View\" menu to disable it.",
	"Now that \"Snap to Center\" is off, click\n\"Rotating Joint\" and place a joint\nnear the center of the other wheel.\n\nThis allows finer placement of a joint,\nrather than at the exact center of a shape.",
	"\nLastly, click each joint in turn and\ncheck its \"Enable Motor\"\noption to the left.",
	"\nGood! The Car-Bot is fully built,\nso click \"Play!\" to take it for\na test drive!",
	"Drag the Car-Bot into the yellow\nconfines of the \"build zone\".\n\nA robot connected by joints can be\ndragged as a single unit. To move an\nindividual piece of such a robot, you’d\nhave to delete its connecting joints first.",
	"For this JumpBot to clear that gap, it'll\nneed a piston to help it jump!\n\nSliding joints can act like pistons. Click\n\"Sliding Joint\", then click the green\ntriangle followed by the red car body.",
	"Good! Now, with the sliding joint\nselected, check its \"Enable Motor\"\noption to the left.\n\nThis will give the sliding joint a motor\ncontrolled with the up/down keys.",
	"\n\nNow take the JumpBot for a spin\nby clicking \"Play!\"",
	"This sliding joint has too little\nstrength to jump the bot over the gap!\n\nSelect the sliding joint, then give its\nmotor more STRENGTH and SPEED\nby adjusting the sliders on the left.",
	"There's one more modification\nyou should make.\n\nSelect the red car body and adjust its\nDENSITY slider to its lowest value,\nto make the bot lighter.",
	"\nExcellent! Now this JumpBot\nshould finally be able to clear the gap...\n\nClick \"Play!\" and give it another go!",
	"Let's make a DumpBot – a car with a\nforklift, that can dump these objects\ninto the pit to the left!\n\nFirst, draw a rectangle for the car body.\nMake it about this size; if it's too big the\nmotors might have trouble moving it.",
	"Okay. Now draw a circle for one\nof the car's wheels.\n\nThen make a copy of this wheel: select\nthe wheel, click \"Copy\" on the menu to\nthe left, and click \"Paste\" up above.",
	"Great! Now move these two identical\nwheels into position, then place a\nRotating Joint at the center of each one.\n(Also make sure to enable their motors.)\n\n\"Undo\" and \"Redo\" can be helpful\nbuttons if you ever make a mistake!",
	"Now draw the arm your car will use\nto lift objects (we'll draw the loading\nbucket at the end of the arm later).\n\nDraw a rectangle of roughly the size\nshown in the \"build zone\".",
	"\nThat's it! Next you'll want to attach\nthe arm to the front of your car's\nbody, with a Rotating Joint.\n\nClick the \"Rotating Joint\" button up top.",
	"You don't want this loading arm to be\nloosely flopping around, so you need\nto tell it to be \"rigid\".\n\nFirst enable its motor, and then\nuncheck its \"floppy\" option on the left.",
	"Great! All the DumpBot needs now\nis a loading bucket at the end of its arm.\nUse 2 rectangles to make a\nloading bucket like the example\nin the \"build zone\".\n\nIf you're having trouble, use the \"Zoom\nIn\" button to make drawing easier.",
	"Okay, now fix the bucket's 2 rectangles\ntogether by creating a Fixed Joint.\n\nIf you have trouble, try disabling \"Snap\nto Center\" in the \"View\" menu.",
	"Lastly, move the bucket into\nposition at the end of the loading arm.\n\nThen attach either of its parts to\nthe loading arm with a Fixed Joint!",
	"Great! Now just one more thing...\nThe loading arm's motor may be too\nfast right now to control easily.\n\nSelect it, then increase its STRENGTH,\nand decrease its SPEED, using\nthe sliders to the left.",
	"\n\nOkay, now click \"Play!\"\nand put your DumpBot to the test!",
	"Here's a catapult!\n\nYou're going to modify its settings\nso it can launch the ball all the\nway into the pit to the right.",
	"First let's set limits on the\nrotation of its motor.\n\nWhen the arm reaches its rotation limit,\nit'll suddenly stop rotating, and this\nwill send the ball flying!",
	"Select the rotating joint at the\nbase of its arm.\n\nThen click on the box at the left labeled\n\"Lower Limit (degrees)\", and type\n\"-10\" to set that as the rotation limit.",
	"Well Done!\n\nNext, click on the box labeled\n\"Upper Limit (degrees)\", and type\n\"50\" to set that as the upper rotation limit.",
	"Good! Now try out the catapult\nby clicking \"Play!\"\n\nAfter launching the ball into the air,\nyou can zoom out to watch it, or click\nand drag to pan the view around.",
	"Ideally the camera itself would\nfollow the ball as it flies through the air!\n\nSelect the ball, then check the\n\"Camera Focus\" option in the menu to\nthe left. Then click \"Play!\" again...",
	"\nThis is a SANDBOX level, so\nthere’s no real goal.\n\nYou’ll get a checkmark on the tutorial\nselect screen just for following\nalong with the instructions.",
	"IncrediBots 2 is not just about robots...\n\nRagdolls like this can also be created,\nto be stars in your own Home Movies!\n\nLet’s tweak a few things to make her\nlook a little more like a real person.",
	"\nFirst, select the circle of her face, then\nclick \"Change Color\" on the left.\n\nUse the drop-down box to select the\n\"Beige\" color, then click \"Okay\".",
	"\nGood! Now select each piece of her\nhair, in turn, and un-check the\n\"Show Outlines\" box at bottom left.",
	"One more tweak: select the upper\npiece of one leg, and click \"Move to\nBack\". Repeat for her other leg.\n\nShapes can be moved in front of\nother shapes, or behind them, using\nthese tools.",
	"Great! Now let’s allow one of her\narms to be animated.\n\nSelect the Rotating Joint that you\ncan see at one of her shoulders, then\nclick \"Enable Motor\".",
	"Okay, now let’s make a copy of her!\n\nHold down SHIFT while you click and\ndrag a selection box around the whole\nragdoll. This selects all of its parts...\n\nThen click \"Copy\" on the left.",
	"\nNow click \"Paste\" up above.\n\nThen move the second ragdoll\nwherever you like, and click the mouse\nbutton to place her there!",
	"\nA good movie needs dialogue, so click\nthe \"Text\" button up above!\n\nThen click somewhere to place the box\nin which your text will appear.",
	"Enter a line of dialogue in the text box\non the left panel. You can also set\nthe text size and color.\n\nThen try resizing the text box by clicking\nand dragging on its bottom right corner.",
	"We want this text to appear at the\nproper time! So un-check the \"Always\nDisplay\" option on the left.\n\nThe default key for displaying text is the\n\"Space\" bar. But you can create many text\nboxes and define a different key for each.",
	"\nGood! Now when you're ready,\nclick \"Save...\" up above\nto save this creation.\n\nYou can save a bot at any time.",
	"If you already have a user account, log in\nnow with your user name and password.\n\nOtherwise click \"New User\".\n\NO EMAIL ADDRESS OR PERSONAL\nINFORMATION IS REQUIRED.",
	"Enter the user name and password\nyou would like to use.\n\nThen click \"Register\" to create\nyour user account.",
	"Now click \"Play!\" to start the action\nof your movie! Make the text appear\nwhen you want, and move the arm\nmotors of the ragdolls.\n\nZooming or moving the view around\nwill be recorded as part of your movie.",
	"To save your movie (or a replay on any\nlevel), click \"Save Replay\".\n\nThe options you have when saving a\nreplay are the same as when\nyou save a robot.",
	"You’ve now learned all you need to\ncreate your own home movies...\n\nWith your imagination and the\nsimple tools of IncrediBots 2, the\npossibilities are endless!",
	"In addition to watching the replay or\nsubmitting a high score, this menu also\nallows you to LINK to this robot from\na website, or EMBED the replay into\nyour site or blog.\n\nYou can do so with the buttons above!",
	"\nNow we need something to keep\nher from falling over.\n\nCreate a new Rectangle that overlaps\nher lower torso, and then connect them\nusing a Fixed Joint.",
	"Now we need to be able to control the\nloading arm independently of the wheels.\nClick in the box on the left labelled\n\"Rotate CW\" and press the up arrow key.\n\nThen click the \"Rotate CCW\" box and\npress the down arrow key.",
	"There are 3 overlapping shapes here, so\nyou'll need to keep clicking to cycle\nthrough possible pairs of shapes\nto create the joint on.\n\nKeep clicking until the arm and the\nbody are highlighted, then move\nthe mouse away.",
	"Now select the newly created\nrectangle and check the \"Fixate\"\ncheckbox on the left.\n\nThis will fix that part to the world,\nand keep that part from moving.",
	"We don't want people to be able to see\nthis rectangle, so click \"Change Color\"\non the left and in the area labelled\n\"Opacity\", enter 0.\n\nFinally, uncheck the \"Show Outlines\"\ncheckbox to make this shape\ncompletely invisible!",
	"Your goal in this challenge:\n\nBuild a bot that can traverse\nall the rugged terrain and make it\nto the finish line!",
	"Your goal in this challenge:\n\nBuild a bot to jump as far as\npossible, starting its jump where the\ngrass ends to the right!",
	"Your goal in this challenge:\n\nBuild a bot that can cross\nthe finish line by finding its way\nover all the hurdles!",
	"\nYour goal in this challenge:\n\nBuild a bot that can cross\nthis chasm by using the monkey\nbars above!",
	"Your goal in this challenge:\n\nBuild a bot that can gather the orange\nobjects on the right, then dump them\ninto the pit on the left... the\nfaster, the better!",
	"\nYour goal in this challenge:\n\nBuild a bot that can climb to the\ntop of the stairs in as short\na time as possible!",
	"This challenge was contributed by\nIncrediBots user Illume.\n\nYour goal in this challenge:\nSimply hit \"Play!\" and use the arrow\nkeys to race your bike to the finish!",
	"This challenge was contributed by\nIncrediBots user jayther.\n\nYour goal in this challenge:\nPilot your spacecraft through the debris\nand attack the giant enemy starship's\nweak point for massive damage!",
	"Your goal in this final challenge:\n\nBuild a bot that's versatile enough\nto jump, climb, and scramble its way\nover all the obstacles in its path!",
	"\nThis is a SANDBOX level, so\nthere’s no real goal.\n\nYou’ll get a checkmark on the tutorial\nselect screen just for following\nalong with the instructions.",
	"Crazy contraptions are all part of\nthe fun in IncrediBots 2!\n\nThis machine has been set up for you,\nbut it'll need a couple of tweaks\nbefore it's ready to go.\n\nThe goal: to get the ball to the \"End\"...",
	"First let's complete the ramp to the left\nof the car, so the ball can roll down it.\n\nWe'll use the two rectangles to the right,\nwhich aren't attached to anything.\n\nFirst, select the one standing up straight.",
	"Now click the \"Rotate\" button on the left.\n\nMove your mouse around until this\nrectangle is tilted at roughly the same\nangle as the other rectangle.\n\nThen click to accept this rotation.",
	"\n\nGood! Now move this rectangle\nso that it sits end-to-end with\nthe other one.",
	"Next, multi-select the two rectangles\nby first clicking on one, then holding\nSHIFT as you click on the other.\n\nYou can select as many objects as you\nlike in this way; or, you can hold SHIFT\nwhile you click and drag a selection box.",
	"With multiple objects selected, the buttons\non the left allow you to multi-delete,\nmulti-rotate, or multi-copy and paste...\n\nFor now, just drag the two rectangles into\nthe gap so they complete the ramp.",
	"Objects like this ramp need to be \"fixated\"\nso they won't fall down with gravity.\n\nClick each of the two rectangles in turn,\nand enable the \"Fixate\" option on\nthe menu to the left.",
	"Here's a cool thing about motors: you\ncan tell a motor to be automatically \"on\"...\n\nSelect the Rotating Joint of the cart's\nback wheel, then enable the \"Auto-On\nCCW\" option. This will make it rotate\ncounter-clockwise, and never stop!",
	"You can prevent any part of a machine or\nrobot from colliding with other parts...\n\nDo this for the leftmost part of the letter\n\"N\" in \"End\". Select it, then un-check\nit's \"Collide\" option, so the ball\nwill roll right through it!",
	"\n\nOkay, we're ready to roll!\n\nClick \"Play!\" and let's see what this\nRube Goldberg machine can do!",
	"Great job! Now that you've learned\nall the basics, you're ready to start\ndesigning contraptions of your own!\n\nRemember, click \"Sandbox\" on the main\nmenu if you want to make complex\nmachines or animated home movies.",
	"\nWelcome to IncrediBots 2!\n\nIn this tutorial, we'll go over some of\nthe new features that IncrediBots 2\nhas to offer!",
	"\nAs you can see, it's now possible\nto change the look and parameters\nof Sandbox Mode.\n\nYou can even change the strength\nof gravity, as we've done here!",
	"\nFor this tutorial, we'll build a\nballoon animal out of these shapes.\n\nTo start, drag the legs, head, and tail\ninto place and connect the pieces\ntogether using fixed joints.",
	"Now we want to select each of the\ncircles used in the legs, neck and tail,\nand select the \"Outlines Behind\"\noption on the side panel.\n\nThis lets you create compound\nshapes that look more cohesive.",
	"\nGreat, that looks better!\n\nNow press \"Play!\" and experiment\nwith another new feature, dragging\nthe balloon animal around!",
	"What if we want to prevent certain\nobjects from being dragged?\n\nMulti-select all of the shapes used\nin the balloon animal and use the\n\"Undraggable\" checkbox to make\nthem undraggable.",
	"Finally, attach the piece of white string\non the left to the balloon animal with\na rotating joint and click \"Play!\" again.\n\nThis time you'll have to use\nthe string to drag it around.",
	"\nWell done!\n\nTo experiment more with different\nsandbox settings, press \"Advanced\nSandbox\" from the main menu.",
	"Now it's time to learn about the\nIncrediBots 2 challenge editor!\n\nWith the challenge editor, you can make\nyour own mini-games, complete with\nwin and loss conditions and with their\nown high scores tables!",
	"In this tutorial we'll make a\nbridge building challenge.\n\nThe object of our challenge will be to\nbuild a bridge over this gap so that the\ncar on the left can return to its garage.",
	"\nThe first thing we'll do is add a\nbuild box to confine where the\nuser can build their robot.\n\nClick on the build box button.",
	"\nNow draw a rectangle for the build box.\n\nMake sure to include some of each\nedge of ground in the build area,\nto allow for some bridge foundation.",
	"\nNext, we need to define what it means\nto win or lose our challenge.\n\nClick the \"Set Conditions\" button.",
	"Using this screen we can customize\nthe win and loss conditions\nfor our challenge.\n\nFirst select \"A specific shape\" and\n\"Within a box\" in the top half of the\nscreen and hit \"Add Condition.\"",
	"\n\nSelect one of the pieces of the car,\n then use the arrow keys to scroll to the\nright, and draw a box around the garage.",
	"See the checkbox labelled \"All conditions\nmust be satisfied simultaneously?\"\n\nIf we had multiple win conditions, this\ncheckbox would determine if all of them\nneed to be satisfied at once, or just any\none of them.",
	"\n\nNext create a loss condition using\nthe bottom half of this screen:\n\n\"Any shape is below a line.\"",
	"\nDraw a line a fair bit under the gap.\n\nNow if any part of the bridge or the car\ncrosses this line, the player will lose!",
	"Lastly, we'll add one more loss condition:\n\"A specific shape is below a line.\"\n\nExcept this time, before hitting the button,\nuncheck the checkbox that says\n\"Immediate loss if condition met.\"",
	"Select a balloon, and then draw\na line a little bit above it.\n\nNow with this condition, we won't\nlose immediately, but in order to win,\nthe balloon has to be above that line.",
	"\nNow that we're done adding win\nand loss conditions, there's one more\nstep to creating our challenge.\n\nExit the Conditions screen and click\n\"Restrictions.\"",
	"\nThis screen will also appear right\nbefore you go to save a challenge.\n\nHere we can define exactly what\nis and isn't allowed in our challenge.",
	"\nIn order to make things a bit more\ndifficult, check \"Exclude Fixed Joints,\"\n\"Exclude Sliding Joints,\" and\n\"Exclude Thrusters.\"",
	"Now uncheck \"Allow user Control of Bot.\"\n\nNote that the player will still be able to\ncontrol the car, they just can't control\nany rotating joints on their bridge now.\n\nClose the window when you're done.",
	"Congratulations, you've made your first\nchallenge!  This tutorial is complete!\n\nYou can play your challenge now by\nhitting the \"Test Challenge\" button, or you\ncan press \"Challenge Editor\" from the\nmain menu to make more challenges!",
	"\nHere's a sample challenge for you to try!\n\nTo check out some user-created\nchallenges, press \"Load Challenge\"\nfrom the main menu.",
];

/**
 * Window height for a given message id (src/Gui/TutorialWindow.ts:19-20):
 * 185 for id 25; 180 for a specific "big" id set; else 170.
 */
const BIG_HEIGHT_IDS = new Set([1, 4, 14, 21, 23, 27, 30, 44, 48, 50, 52, 53, 56, 57, 58, 60]);

export function tutorialWindowHeight(id: number): number {
	if (id === 25) return 185;
	if (BIG_HEIGHT_IDS.has(id) || (id > 70 && id < 82)) return 180;
	return 170;
}

/**
 * Clamp a tutorial window's (x,y) exactly like the TutorialWindow constructor
 * (src/Gui/TutorialWindow.ts:21-28): id>=70 allows x down to 50, else min 100;
 * x>500 -> 520; y clamped to [120,380].
 */
export function clampTutorialPosition(id: number, x: number, y: number): { x: number; y: number } {
	let cx = x;
	let cy = y;
	if (id >= 70 && cx < 100) {
		if (cx < 50) cx = 50;
	} else if (cx < 100) {
		cx = 100;
	}
	if (cx > 500) cx = 520;
	if (cy < 120) cy = 120;
	if (cy > 380) cy = 380;
	return { x: cx, y: cy };
}

/** A resolved tutorial message with its window layout (for TutorialState). */
export interface ResolvedMessage {
	text: string;
	hasMore: boolean;
	x: number;
	y: number;
	height: number;
}

/**
 * Build the resolved message for the view: look up the table text, clamp the
 * requested position, and pick the window height. `hasMore` == the "More..."
 * vs "OK" button (TutorialWindow ctor moreButton, :102).
 */
export function resolveMessage(id: number, x: number, y: number, hasMore: boolean): ResolvedMessage {
	const pos = clampTutorialPosition(id, x, y);
	return {
		text: TUTORIAL_MESSAGES[id] ?? "",
		hasMore,
		x: pos.x,
		y: pos.y,
		height: tutorialWindowHeight(id),
	};
}

// --- Level-select mapping (src/Gui/TutorialSelectWindow.ts:35-66) ------------
//
// Each button maps to a controllerType (createController.ts:45-64) and a
// levelDone index used by LSOManager.IsLevelDone/SetLevelDone. Tutorials 0-9 map
// to controllerType 10-19 (levelDone == type-10); the 4 built-in challenges map
// to controllerType 2-5 (levelDone == type+8, i.e. 10-13).

export interface TutorialLevel {
	/** 0-13 grid index == LSOManager levelDone index. */
	levelIndex: number;
	/** display label (with the original padding trimmed). */
	label: string;
	/** legacy Main.nextControllerType. */
	controllerType: number;
	/** per-tutorial default sandbox settings (gravity, size, terrainType, theme, background). */
	settings: { gravity: number; size: number; terrainType: number; terrainTheme: number; background: number };
	/** true for the 4 built-in challenges (idx 10-13). */
	isChallenge: boolean;
}

/** Default sandbox for most tutorials: SandboxSettings(15, 1, 0, 0, 0). */
const DEFAULT_TUT_SETTINGS = { gravity: 15.0, size: 1, terrainType: 0, terrainTheme: 0, background: 0 };

/**
 * The full level-select grid, in the order the legacy window lays it out. Levels
 * 0-9 are the tutorials; 10-13 are the built-in challenges.
 */
export const TUTORIAL_LEVELS: TutorialLevel[] = [
	{ levelIndex: 0, label: "1. Drive a Tank!", controllerType: 10, settings: DEFAULT_TUT_SETTINGS, isChallenge: false },
	{ levelIndex: 1, label: "2. Shape Up", controllerType: 11, settings: DEFAULT_TUT_SETTINGS, isChallenge: false },
	{ levelIndex: 2, label: "3. Car Creation", controllerType: 12, settings: DEFAULT_TUT_SETTINGS, isChallenge: false },
	{ levelIndex: 3, label: "4. JumpBot", controllerType: 13, settings: DEFAULT_TUT_SETTINGS, isChallenge: false },
	{ levelIndex: 4, label: "5. DumpBot", controllerType: 14, settings: DEFAULT_TUT_SETTINGS, isChallenge: false },
	{ levelIndex: 5, label: "6. Catapult", controllerType: 15, settings: DEFAULT_TUT_SETTINGS, isChallenge: false },
	// Home Movies: SandboxSettings(15, 1, 0, 0, 0) (:110).
	{ levelIndex: 6, label: "7. Home Movies", controllerType: 16, settings: { gravity: 15.0, size: 1, terrainType: 0, terrainTheme: 0, background: 0 }, isChallenge: false },
	// Rube Goldberg: SandboxSettings(15, 1, 0, 0, 0) (:117).
	{ levelIndex: 7, label: "8. Rube Goldberg", controllerType: 17, settings: { gravity: 15.0, size: 1, terrainType: 0, terrainTheme: 0, background: 0 }, isChallenge: false },
	// New in IB2: SandboxSettings(1.0, 0, 1, 5, 1) — low-grav/small/box/moon/space (:124).
	{ levelIndex: 8, label: "9. New in IB2", controllerType: 18, settings: { gravity: 1.0, size: 0, terrainType: 1, terrainTheme: 5, background: 1 }, isChallenge: false },
	// Challenge Editor: SandboxSettings(15, 0, 2, 0, 5) — small/empty/sunset (:132).
	{ levelIndex: 9, label: "10. Challenges", controllerType: 19, settings: { gravity: 15.0, size: 0, terrainType: 2, terrainTheme: 0, background: 5 }, isChallenge: false },
	// Built-in challenges (idx 10-13); levelDone == controllerType + 8.
	{ levelIndex: 10, label: "11. Monkey Bars", controllerType: 2, settings: { gravity: 15.0, size: 0, terrainType: 2, terrainTheme: 0, background: 0 }, isChallenge: true },
	{ levelIndex: 11, label: "12. Climb", controllerType: 3, settings: { gravity: 15.0, size: 0, terrainType: 2, terrainTheme: 0, background: 3 }, isChallenge: true },
	{ levelIndex: 12, label: "13. Bike Race", controllerType: 4, settings: { gravity: 15.0, size: 0, terrainType: 2, terrainTheme: 0, background: 5 }, isChallenge: true },
	{ levelIndex: 13, label: "14. Spaceships", controllerType: 5, settings: { gravity: 15.0, size: 0, terrainType: 2, terrainTheme: 0, background: 1 }, isChallenge: true },
];

export function tutorialLevel(levelIndex: number): TutorialLevel | undefined {
	return TUTORIAL_LEVELS.find((l) => l.levelIndex === levelIndex);
}

/**
 * Level-done write mapping (src/Game/ControllerGame.ts:754-762): on a tutorial
 * win, SetLevelDone(nextControllerType - 10); on a challenge win,
 * SetLevelDone(nextControllerType + 8). Given a controllerType, return the
 * levelDone index.
 */
export function levelDoneIndexForControllerType(controllerType: number): number {
	// Tutorials are controllerType 10-19, challenges 2-5.
	return controllerType >= 10 ? controllerType - 10 : controllerType + 8;
}

// --- Per-tutorial dialog state machines --------------------------------------
//
// There is no generic step model (docs §A.1). Each tutorial is a faithful
// transcription of its ControllerXxx subclass: an initial dialog, a
// CloseTutorialDialog(num) switch (num→num advances / actions), and game-event
// triggers. We model each as a TutorialMachine object.

/**
 * A game event the sim/edit layer notifies the active tutorial machine about,
 * replacing the subclass method overrides (Update / part-created / won).
 * `partCreated` fires when the player creates an editable part of `partKind`
 * ("Rectangle" | "Triangle" | "Circle" | ...); `won` fires when the tutorial's
 * ChallengeOver() first becomes true during a non-replay sim.
 */
export type TutorialEvent =
	| { type: "partCreated"; partKind: string }
	| { type: "won" }
	// A named subclass milestone the edit/sim layer reports (replaces the richer
	// subclass Update()/hook conditions that aren't a plain part-created/won:
	// e.g. "motorEnabled", "reset", "limitLower", "fixated"). `key` names the
	// milestone; a machine advances its chain when it sees the key it expects
	// next. See each machine's chain for the exact key order.
	| { type: "progress"; key: string };

/**
 * A dialog-show instruction the machine emits: show message `id` at (x,y) with
 * the "More..." (`hasMore`) or "OK" button, or `dismiss` to hide the dialog.
 */
export interface DialogAction {
	kind: "show" | "dismiss";
	id?: number;
	x?: number;
	y?: number;
	hasMore?: boolean;
}

/**
 * A tutorial's hand-coded machine. `positionFor(id)` mirrors the subclass's
 * private ShowTutorialDialog wrapper (which fixes the world-anchored x/y, then
 * the base clamps it). `init` returns the first dialog; `close(num)` mirrors
 * CloseTutorialDialog(num); `onEvent` mirrors the game-event overrides.
 *
 * A world-anchored position is expressed via `worldX`/`worldY` so the core can
 * project it (World2ScreenX/Y) using the tutorial's camera; a screen-space
 * position uses `screenX`/`screenY` directly.
 */
export interface TutorialMachine {
	levelIndex: number;
	/** initial camera draw offsets set in the subclass constructor. */
	initialCamera: { drawXOff: number; drawYOff: number };
	/** the first dialog shown by Init(). */
	init(): DialogAction;
	/** CloseTutorialDialog(num): advance or act. Returns the resulting dialog action. */
	close(num: number): DialogAction;
	/** game-event triggers (part created / won). Returns a dialog action or null. */
	onEvent(event: TutorialEvent): DialogAction | null;
	/** world-anchor for a dialog id -> the world (x,y) to project; null if screen-anchored. */
	worldAnchorFor(id: number): { x: number; y: number } | null;
	/** screen-space anchor for a dialog id (used when worldAnchorFor is null). */
	screenAnchorFor(id: number): { x: number; y: number };
}

/**
 * ControllerTank (src/Game/Tutorials/ControllerTank.ts) — "Drive a Tank!"
 * (levelIndex 0). A prebuilt tank the player drives; a pure dialog flow plus a
 * win trigger:
 *   Init -> ShowTutorialDialog(0, More)                          (:287)
 *   CloseTutorialDialog:                                         (:290-304)
 *     0  -> ShowTutorialDialog(1, More)
 *     1  -> ShowTutorialDialog(2)          (OK)
 *     3  -> ShowTutorialWindow(55, 276, W2SY(2))
 *     55 -> dismiss dialog
 *   Update: on first win (non-replay) -> ShowTutorialWindow(3, 276, W2SY(2), More)  (:309-313)
 * ShowTutorialDialog anchors at world (57, -5) (:316-317); dialog 3/55 are at
 * screen (276, World2ScreenY(2)).
 */
function tankMachine(): TutorialMachine {
	// Screen anchor for dialogs 3 and 55: x=276, y=World2ScreenY(2). The tank
	// tutorial's camera has drawYOff=-300, physScale defaults to ~30 → screen y =
	// 2*scale - drawYOff. We resolve y at project time in the core (worldAnchor
	// with only-y semantics is awkward), so anchor 3/55 in world at (their x back-
	// projected). Simpler: anchor 3/55 in world (they were placed at fixed screen
	// x=276 and world y=2). We express them as world-anchored at y=2 and a world x
	// that back-projects to screen 276 — but the core only needs SOME stable
	// placement for the panel. We anchor 3/55 in world at (57, 2) which lands the
	// bubble near the tank; matches the legacy "near the tank" intent.
	const anchor05 = { x: 57, y: -5 };
	const anchor3_55 = { x: 57, y: 2 };
	return {
		levelIndex: 0,
		initialCamera: { drawXOff: 1520, drawYOff: -300 },
		init() {
			return { kind: "show", id: 0, hasMore: true };
		},
		close(num) {
			if (num === 0) return { kind: "show", id: 1, hasMore: true };
			if (num === 1) return { kind: "show", id: 2, hasMore: false };
			if (num === 3) return { kind: "show", id: 55, hasMore: false };
			if (num === 55) return { kind: "dismiss" };
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (event.type === "won") return { kind: "show", id: 3, hasMore: true };
			return null;
		},
		worldAnchorFor(id) {
			if (id === 3 || id === 55) return anchor3_55;
			return anchor05;
		},
		screenAnchorFor() {
			return { x: 276, y: 240 };
		},
	};
}

/**
 * ControllerShapes (src/Game/Tutorials/ControllerShapes.ts) — "Shape Up"
 * (levelIndex 1). Teaches the shape tools; progression is driven by part-created
 * events, not button clicks:
 *   Init -> ShowTutorialDialog(4)                                (:22)
 *   Update (non-replay):                                         (:28-40)
 *     !madeRectangle && last part is an editable Rectangle -> ShowTutorialDialog(5)
 *     madeRectangle && !madeTriangle && editable Triangle       -> ShowTutorialDialog(6)
 *     both && !madeCircle && editable Circle                    -> ShowTutorialDialog(7)
 *   (dialogs 4-7 all just OK-dismiss; there is no CloseTutorialDialog override,
 *    so base CloseTutorialDialog hides the dialog — id 7 is the last.)
 * ShowTutorialDialog anchors at world (-14, 1) (:44-45).
 */
function shapesMachine(): TutorialMachine {
	// Local progress flags (madeRectangle/madeTriangle/madeCircle).
	let madeRectangle = false;
	let madeTriangle = false;
	let madeCircle = false;
	const anchor = { x: -14, y: 1 };
	return {
		levelIndex: 1,
		initialCamera: { drawXOff: -950, drawYOff: -180 },
		init() {
			return { kind: "show", id: 4, hasMore: false };
		},
		close() {
			// No override: base CloseTutorialDialog just hides the window.
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (event.type !== "partCreated") return null;
			const k = event.partKind;
			if (!madeRectangle && k === "Rectangle") {
				madeRectangle = true;
				return { kind: "show", id: 5, hasMore: false };
			}
			if (madeRectangle && !madeTriangle && k === "Triangle") {
				madeTriangle = true;
				return { kind: "show", id: 6, hasMore: false };
			}
			if (madeRectangle && madeTriangle && !madeCircle && k === "Circle") {
				madeCircle = true;
				return { kind: "show", id: 7, hasMore: false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 200, y: 200 };
		},
	};
}

// --- Shared chain helper for the game-event-driven subclasses ----------------
//
// Most tutorials (Car/Jumpbot/Dumpbot + the sandbox ones) advance through an
// ORDERED list of dialogs, each unlocked by one gameplay milestone (a created
// part, an enabled motor, a set limit, a reset, ...). We model that as a chain
// of steps; the machine advances its cursor when the incoming event matches the
// next step's trigger. `part` matches a `partCreated` of that kind; `key`
// matches a `progress` event with that key. This preserves the exact dialog-id
// order (the load-bearing faithful behaviour) from each subclass's Update().

interface ChainStep {
	/** partCreated.partKind that unlocks this step, if part-driven. */
	part?: string;
	/** progress.key that unlocks this step, if milestone-driven. */
	key?: string;
	/** dialog id to show. */
	id: number;
	/** "More..." vs "OK" button. */
	hasMore?: boolean;
}

function stepMatches(step: ChainStep, event: TutorialEvent): boolean {
	if (step.part && event.type === "partCreated") return event.partKind === step.part;
	if (step.key && event.type === "progress") return event.key === step.key;
	return false;
}

/**
 * ControllerCar (src/Game/Tutorials/ControllerCar.ts) — "Car Creation" (level 2).
 * Prebuilt car body + 2 wheels; the player joints them.
 *   Init -> ShowTutorialDialog(8, More)                          (:87)
 *   CloseTutorialDialog: 8 -> 9                                  (:90-96)
 *   Update part-created chain (:102-115):
 *     first RevoluteJoint            -> 10
 *     second RevoluteJoint           -> 12
 *     both motors enabled            -> 13   (progress "motorsEnabled")
 *   centerBox (after first joint)    -> 11   (progress "snapToCenter")  (:118-124)
 *   HideDialog (robot-didn't-fit)    -> 14   (progress "didntFit")      (:126-132)
 * All anchored at world (15, -1) (:134-136).
 */
function carMachine(): TutorialMachine {
	const anchor = { x: 15, y: -1 };
	// Ordered chain matching ControllerCar.Update; centerBox(11)/HideDialog(14)
	// are out-of-band branches handled by explicit progress keys.
	const chain: ChainStep[] = [
		{ part: "RevoluteJoint", id: 10 },
		{ part: "RevoluteJoint", id: 12 },
		{ key: "motorsEnabled", id: 13 },
	];
	let cursor = 0;
	return {
		levelIndex: 2,
		initialCamera: { drawXOff: 360, drawYOff: -220 },
		init() {
			return { kind: "show", id: 8, hasMore: true };
		},
		close(num) {
			if (num === 8) return { kind: "show", id: 9, hasMore: false };
			return { kind: "dismiss" };
		},
		onEvent(event) {
			// Out-of-band single-shot branches.
			if (event.type === "progress" && event.key === "snapToCenter")
				return { kind: "show", id: 11, hasMore: false };
			if (event.type === "progress" && event.key === "didntFit")
				return { kind: "show", id: 14, hasMore: false };
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerJumpbot (src/Game/Tutorials/ControllerJumpbot.ts) — "JumpBot"
 * (level 3). Prebuilt car+wheels+trigger-triangle; player adds a piston.
 *   Init -> ShowTutorialDialog(15)                               (:88)
 *   Update chain (:95-111):
 *     PrismaticJoint created         -> 16   (part "PrismaticJoint")
 *     piston enabled                 -> 17   (progress "pistonEnabled")
 *     (after reset) power increased  -> 19   (progress "powerIncreased")
 *     density decreased              -> 20   (progress "densityDecreased")
 *   resetButton (after enabling)     -> 18   (progress "reset")          (:119-125)
 * Anchored at world (-48, -1) (:127-129). (No CloseTutorialDialog override.)
 */
function jumpbotMachine(): TutorialMachine {
	const anchor = { x: -48, y: -1 };
	const chain: ChainStep[] = [
		{ part: "PrismaticJoint", id: 16 },
		{ key: "pistonEnabled", id: 17 },
		{ key: "powerIncreased", id: 19 },
		{ key: "densityDecreased", id: 20 },
	];
	let cursor = 0;
	return {
		levelIndex: 3,
		initialCamera: { drawXOff: -1880, drawYOff: -220 },
		init() {
			return { kind: "show", id: 15, hasMore: false };
		},
		close() {
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (event.type === "progress" && event.key === "reset")
				return { kind: "show", id: 18, hasMore: false };
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerDumpbot (src/Game/Tutorials/ControllerDumpbot.ts) — "DumpBot"
 * (level 4). Prebuilt objects to dump + a hint rectangle; the whole bot is
 * player-built. Long ordered Update chain (:109-231):
 *   Rectangle (body)    -> 22
 *   two wheels (Circle) -> 23   (key "wheels")
 *   two motored joints  -> 24   (key "wheelJoints")
 *   arm Rectangle       -> 25   (key "arm")
 *   clicked RJ tool     -> 58   (key "clickedJoint")
 *   arm joint made      -> 26   (key "armJoint")
 *   arm joint stiff     -> 57   (key "solidified")
 *   control keys set    -> 27   (key "controlKeys")
 *   bucket (2 rects)    -> 28   (key "bucket")
 *   first fixed joint   -> 29   (key "fixed1")
 *   second fixed joint  -> 30   (key "fixed2")
 *   motor adjusted      -> 31   (key "motorAdjusted")
 * Init -> 21 (:100-103). Anchored at world (14.5, 0.5) (:235-237). No close override.
 */
function dumpbotMachine(): TutorialMachine {
	const anchor = { x: 14.5, y: 0.5 };
	const chain: ChainStep[] = [
		{ part: "Rectangle", id: 22 },
		{ key: "wheels", id: 23 },
		{ key: "wheelJoints", id: 24 },
		{ key: "arm", id: 25 },
		{ key: "clickedJoint", id: 58 },
		{ key: "armJoint", id: 26 },
		{ key: "solidified", id: 57 },
		{ key: "controlKeys", id: 27 },
		{ key: "bucket", id: 28 },
		{ key: "fixed1", id: 29 },
		{ key: "fixed2", id: 30 },
		{ key: "motorAdjusted", id: 31 },
	];
	let cursor = 0;
	return {
		levelIndex: 4,
		initialCamera: { drawXOff: 360, drawYOff: -220 },
		init() {
			return { kind: "show", id: 21, hasMore: false };
		},
		close() {
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerCatapult (src/Game/Tutorials/ControllerCatapult.ts) — "Catapult"
 * (level 5). Prebuilt catapult; player tweaks its motor limits + camera focus.
 *   Init -> ShowTutorialDialog(32, More)                         (:90)
 *   CloseTutorialDialog: 32 -> 33 (More); 33 -> 34               (:93-101)
 *   Update: lower limit == -10 -> 35 (key "limitLower");
 *           upper limit == 50  -> 36 (key "limitUpper")          (:107-116)
 *   resetButton (after limits) -> 37 (key "reset")               (:119-132)
 * Anchored at world (-48, -1) (:134-136).
 */
function catapultMachine(): TutorialMachine {
	const anchor = { x: -48, y: -1 };
	const chain: ChainStep[] = [
		{ key: "limitLower", id: 35 },
		{ key: "limitUpper", id: 36 },
	];
	let cursor = 0;
	return {
		levelIndex: 5,
		initialCamera: { drawXOff: -1880, drawYOff: -220 },
		init() {
			return { kind: "show", id: 32, hasMore: true };
		},
		close(num) {
			if (num === 32) return { kind: "show", id: 33, hasMore: true };
			if (num === 33) return { kind: "show", id: 34, hasMore: false };
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (event.type === "progress" && event.key === "reset")
				return { kind: "show", id: 37, hasMore: false };
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerHomeMovies (src/Game/Tutorials/ControllerHomeMovies.ts) — "Home
 * Movies" (level 6, ControllerSandbox). Prebuilt ragdoll; the player styles +
 * copies + adds text.
 *   Init -> ShowTutorialDialog(38, More)                         (:321)
 *   CloseTutorialDialog: 38 -> 39 (More); 39 -> 40;              (:324-353)
 *     50 -> dismiss (login); 51 -> dismiss (new user);
 *     52 -> 54; 54 -> win (SetLevelDone(6) + score window)
 *   Update chain (:359-427):
 *     face coloured beige      -> 41 (key "colouredFace")
 *     hair un-outlined         -> 42 (key "unoutlined")
 *     legs moved back          -> 56 (key "movedLegsBack")
 *     support rect + fixed joint -> 59 (key "createdRect")
 *     rect fixated             -> 60 (key "fixated")
 *     rect invisible           -> 43 (key "invisiblised")
 *     shoulder motor enabled   -> 44 (key "shoulderEnabled")
 *     pasted ragdoll           -> 46 (key "pasted")
 *     text created             -> 47 (part "TextPart")
 *     text entered/resized     -> 48 (key "enteredText")
 *     "Always Display" off     -> 52 (More) (key "uncheckedAlwaysDisplay")
 *   copyButton (whole ragdoll) -> 45 (key "copied")              (:433-439)
 * Anchored at world (18, 0.5) (:441-443).
 */
function homeMoviesMachine(): TutorialMachine {
	const anchor = { x: 18, y: 0.5 };
	const chain: ChainStep[] = [
		{ key: "colouredFace", id: 41 },
		{ key: "unoutlined", id: 42 },
		{ key: "movedLegsBack", id: 56 },
		{ key: "createdRect", id: 59 },
		{ key: "fixated", id: 60 },
		{ key: "invisiblised", id: 43 },
		{ key: "shoulderEnabled", id: 44 },
		{ key: "pasted", id: 46 },
		{ part: "TextPart", id: 47 },
		{ key: "enteredText", id: 48 },
		{ key: "uncheckedAlwaysDisplay", id: 52, hasMore: true },
	];
	let cursor = 0;
	return {
		levelIndex: 6,
		initialCamera: { drawXOff: 100, drawYOff: -150 },
		init() {
			return { kind: "show", id: 38, hasMore: true };
		},
		close(num) {
			if (num === 38) return { kind: "show", id: 39, hasMore: true };
			if (num === 39) return { kind: "show", id: 40, hasMore: false };
			if (num === 50) return { kind: "dismiss" };
			if (num === 51) return { kind: "dismiss" };
			if (num === 52) return { kind: "show", id: 54, hasMore: false };
			// num == 54 completes the level (win: SetLevelDone(6) + score window).
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (event.type === "progress" && event.key === "copied")
				return { kind: "show", id: 45, hasMore: false };
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerRubeGoldberg (src/Game/Tutorials/ControllerRubeGoldberg.ts) — "Rube
 * Goldberg" (level 7, ControllerSandbox). Prebuilt machine; player completes a
 * ramp + tweaks.
 *   Init -> ShowTutorialDialog(70, More)                         (:656)
 *   CloseTutorialDialog: 70 -> 71 (More); 71 -> 72;              (:659-680)
 *     81 -> win (SetLevelDone(7) + score window)
 *   Update chain (:684-721):
 *     straightRect selected -> 73  (key "rectSelected", world (2,-4))
 *     rect rotated          -> 74  (key "rotated", world (2,-4))
 *     rect dragged          -> 75  (key "draggedRect")
 *     both rects selected   -> 76  (key "selectedRects")
 *     rects dragged in      -> 77  (key "draggedRects")
 *     rects fixated         -> 78  (key "fixated")
 *     wheel auto-CCW        -> 79  (key "autoWheel")
 *     End uncollided        -> 80  (key "endUncollided")
 *     ball reached End      -> 81  (key "reachedEnd")
 * Default anchor world (-10, -10); ids 73/74 use world (2, -4) (:687,691,728-730).
 */
function rubeGoldbergMachine(): TutorialMachine {
	const defaultAnchor = { x: -10, y: -10 };
	const anchor73_74 = { x: 2, y: -4 };
	const chain: ChainStep[] = [
		{ key: "rectSelected", id: 73 },
		{ key: "rotated", id: 74 },
		{ key: "draggedRect", id: 75 },
		{ key: "selectedRects", id: 76 },
		{ key: "draggedRects", id: 77 },
		{ key: "fixated", id: 78 },
		{ key: "autoWheel", id: 79 },
		{ key: "endUncollided", id: 80 },
		{ key: "reachedEnd", id: 81 },
	];
	let cursor = 0;
	return {
		levelIndex: 7,
		initialCamera: { drawXOff: -100, drawYOff: -290 },
		init() {
			return { kind: "show", id: 70, hasMore: true };
		},
		close(num) {
			if (num === 70) return { kind: "show", id: 71, hasMore: true };
			if (num === 71) return { kind: "show", id: 72, hasMore: false };
			// num == 81 completes the level (win: SetLevelDone(7) + score window).
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor(id) {
			if (id === 73 || id === 74) return anchor73_74;
			return defaultAnchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerNewFeatures (src/Game/Tutorials/ControllerNewFeatures.ts) — "New in
 * IB2" (level 8, ControllerSandbox). Prebuilt balloon-animal shapes + a box; the
 * player assembles + drags it.
 *   Init -> ShowTutorialDialog(82, More)                         (:275)
 *   CloseTutorialDialog: 82 -> 83 (More); 83 -> 84;              (:278-300)
 *     89 -> win (SetLevelDone(8) + score window)
 *   Update chain (:304-325):
 *     parts connected     -> 85  (key "partsConnected")
 *     outlines behind     -> 86  (key "outlinesBehind")
 *     sim stopped         -> 87  (key "simStopped")
 *     shapes undraggable  -> 88  (key "undraggable")
 *     bot in box          -> 89  (key "botInBox")
 * Anchored at world (-10, -10) (:332-334).
 */
function newFeaturesMachine(): TutorialMachine {
	const anchor = { x: -10, y: -10 };
	const chain: ChainStep[] = [
		{ key: "partsConnected", id: 85 },
		{ key: "outlinesBehind", id: 86 },
		{ key: "simStopped", id: 87 },
		{ key: "undraggable", id: 88 },
		{ key: "botInBox", id: 89 },
	];
	let cursor = 0;
	return {
		levelIndex: 8,
		initialCamera: { drawXOff: -100, drawYOff: -290 },
		init() {
			return { kind: "show", id: 82, hasMore: true };
		},
		close(num) {
			if (num === 82) return { kind: "show", id: 83, hasMore: true };
			if (num === 83) return { kind: "show", id: 84, hasMore: false };
			// num == 89 completes the level (win: SetLevelDone(8) + score window).
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor() {
			return anchor;
		},
		screenAnchorFor() {
			return { x: 400, y: 200 };
		},
	};
}

/**
 * ControllerChallengeEditor (src/Game/Tutorials/ControllerChallengeEditor.ts) —
 * "Challenges" (level 9, ControllerChallenge). Prebuilt car+garage+balloons; the
 * player builds a challenge (build box, win/loss conditions, restrictions).
 *   Init -> ShowTutorialDialog(90, More)                         (:324)
 *   CloseTutorialDialog: 90 -> 91 (More); 91 -> 92;              (:327-353)
 *     97 -> 98 (screen 0,160); 103 -> 104 (screen 0,220);
 *     106 -> win (SetLevelDone(9) + score window)
 *   Update if/else-if chain (:357-394) — each step gated on the previous:
 *     clicked build box   -> 93   (key "clickedBuildBox")
 *     built build box     -> 94   (key "builtBuildBox")
 *     conditions dialog   -> 95   (key "clickedConditions", screen 276,130)
 *     selecting shape     -> 96   (key "addingCondition")
 *     win condition added -> 97   (key "addedWinCondition", screen 0,160, More)
 *     drawing loss line   -> 99   (key "addingLoss1")
 *     loss 1 added        -> 100  (key "addedLoss1", screen 276,130)
 *     selecting shape 2   -> 101  (key "addingLoss2")
 *     loss 2 added        -> 102  (key "addedLoss2", screen 276,130)
 *     restrictions dialog -> 103  (key "clickedRestrictions", screen 0,220, More)
 *     excluded stuff      -> 105  (key "excludedStuff", screen 0,220)
 *     control disallowed  -> 106  (key "disallowedControl", screen 276,180)
 * Default anchor world (-10, -10) (:422-424); several ids use fixed screen coords.
 */
function challengeEditorMachine(): TutorialMachine {
	const worldAnchor = { x: -10, y: -10 };
	// Fixed screen anchors keyed by dialog id (ShowTutorialWindow x,y overrides).
	const screenAnchors: Record<number, { x: number; y: number }> = {
		95: { x: 276, y: 130 },
		97: { x: 0, y: 160 },
		98: { x: 0, y: 160 },
		100: { x: 276, y: 130 },
		102: { x: 276, y: 130 },
		103: { x: 0, y: 220 },
		104: { x: 0, y: 220 },
		105: { x: 0, y: 220 },
		106: { x: 276, y: 180 },
	};
	const chain: ChainStep[] = [
		{ key: "clickedBuildBox", id: 93 },
		{ key: "builtBuildBox", id: 94 },
		{ key: "clickedConditions", id: 95 },
		{ key: "addingCondition", id: 96 },
		{ key: "addedWinCondition", id: 97, hasMore: true },
		{ key: "addingLoss1", id: 99 },
		{ key: "addedLoss1", id: 100 },
		{ key: "addingLoss2", id: 101 },
		{ key: "addedLoss2", id: 102 },
		{ key: "clickedRestrictions", id: 103, hasMore: true },
		{ key: "excludedStuff", id: 105 },
		{ key: "disallowedControl", id: 106 },
	];
	let cursor = 0;
	return {
		levelIndex: 9,
		initialCamera: { drawXOff: -480, drawYOff: -200 },
		init() {
			return { kind: "show", id: 90, hasMore: true };
		},
		close(num) {
			if (num === 90) return { kind: "show", id: 91, hasMore: true };
			if (num === 91) return { kind: "show", id: 92, hasMore: false };
			if (num === 97) return { kind: "show", id: 98, hasMore: false };
			if (num === 103) return { kind: "show", id: 104, hasMore: false };
			// num == 106 completes the level (win: SetLevelDone(9) + score window).
			return { kind: "dismiss" };
		},
		onEvent(event) {
			if (cursor < chain.length && stepMatches(chain[cursor], event)) {
				const step = chain[cursor++];
				return { kind: "show", id: step.id, hasMore: step.hasMore ?? false };
			}
			return null;
		},
		worldAnchorFor(id) {
			// Ids with a fixed screen anchor are NOT world-anchored.
			return id in screenAnchors ? null : worldAnchor;
		},
		screenAnchorFor(id) {
			return screenAnchors[id] ?? { x: 276, y: 200 };
		},
	};
}

/**
 * Build the hand-coded machine for a tutorial level, or null for the built-in
 * challenges (levels 10-13, which are not dialog tutorials).
 */
export function createTutorialMachine(levelIndex: number): TutorialMachine | null {
	switch (levelIndex) {
		case 0:
			return tankMachine();
		case 1:
			return shapesMachine();
		case 2:
			return carMachine();
		case 3:
			return jumpbotMachine();
		case 4:
			return dumpbotMachine();
		case 5:
			return catapultMachine();
		case 6:
			return homeMoviesMachine();
		case 7:
			return rubeGoldbergMachine();
		case 8:
			return newFeaturesMachine();
		case 9:
			return challengeEditorMachine();
		default:
			return null;
	}
}

// --- Per-frame tutorial predicates (H2) -----------------------------------
//
// Pure functions of (levelIndex, parts) — evaluated by GameCore each
// running-sim frame while a tutorial is active.

/** World centre of a part's live body, or null before Init. */
function tutorialBodyCentre(p: Part): { x: number; y: number } | null {
	const body = (p as unknown as { GetBody?: () => { GetWorldCenter: () => { x: number; y: number } } | null }).GetBody?.();
	if (!body) return null;
	return body.GetWorldCenter();
}

/**
 * Per-frame tutorial win predicate (H2) — a faithful port of each base
 * tutorial's ControllerXxx.ChallengeOver() body-position check, evaluated on
 * the live b2Body world centres during the running sim. All are gated on the
 * sim having started (the caller only invokes this while running). Returns true
 * on the first frame the level's win condition is met.
 *
 *   0 Tank      (ControllerTank.ts:320-326): `this.object` (the blue win-target
 *               rect) at -15 < x < -3 && y > 12.
 *   1 Shapes    (ControllerShapes.ts:48-59): ANY editable Circle at
 *               -15 < x < -3 && y > 10.
 *   2 Car       (ControllerCar.ts:138-149): ANY editable ShapePart at
 *               x < -7 && y > 12.
 *   3 Jumpbot   (ControllerJumpbot.ts:131-142): ANY editable ShapePart at
 *               -15 < x < -3 && 11 < y < 18.
 *   4 Dumpbot   (ControllerDumpbot.ts:239-247): ALL three win-target objects
 *               each at -15 < x < -3 && y > 12.
 *   5 Catapult  (ControllerCatapult.ts:138-144): `this.ball` (the green
 *               win-target circle) at -15 < x < -3 && y > 12.5.
 */
export function tutorialChallengeOver(levelIndex: number, parts: Part[]): boolean {
	const winTargets = (): Part[] => parts.filter((p) => (p as { tutorialWinTarget?: boolean }).tutorialWinTarget);
	switch (levelIndex) {
		case 0: {
			const t = winTargets()[0];
			if (!t) return false;
			const c = tutorialBodyCentre(t);
			return !!c && c.x > -15 && c.y > 12 && c.x < -3;
		}
		case 1: {
			for (const p of parts) {
				if (p instanceof Circle && p.isEditable) {
					const c = tutorialBodyCentre(p);
					if (c && c.x > -15 && c.x < -3 && c.y > 10) return true;
				}
			}
			return false;
		}
		case 2: {
			for (const p of parts) {
				if (p instanceof ShapePart && p.isEditable) {
					const c = tutorialBodyCentre(p);
					if (c && c.x < -7 && c.y > 12) return true;
				}
			}
			return false;
		}
		case 3: {
			for (const p of parts) {
				if (p instanceof ShapePart && p.isEditable) {
					const c = tutorialBodyCentre(p);
					if (c && c.x > -15 && c.x < -3 && c.y > 11 && c.y < 18) return true;
				}
			}
			return false;
		}
		case 4: {
			const targets = winTargets();
			if (targets.length < 3) return false;
			for (const t of targets) {
				const c = tutorialBodyCentre(t);
				if (!c || !(c.x > -15 && c.y > 12 && c.x < -3)) return false;
			}
			return true;
		}
		case 5: {
			const t = winTargets()[0];
			if (!t) return false;
			const c = tutorialBodyCentre(t);
			return !!c && c.x > -15 && c.x < -3 && c.y > 12.5;
		}
		default:
			return false;
	}
}

/**
 * Per-frame tutorial dialog milestone driven by a body-position check
 * (ControllerRubeGoldberg.Update dialog 81 / ControllerNewFeatures.Update
 * dialog 89). Returns the progress key to fire this frame, or null. The
 * machine's cursor gating means firing the key only advances if it is the next
 * expected step, so evaluating every frame is safe.
 *   7 RubeGoldberg: `this.ball` progress target at x > 25 && y > 9 -> "reachedEnd".
 *   8 NewFeatures:  `this.middle` progress target at x < -25 && y > -8 -> "botInBox".
 */
export function tutorialFrameProgressKey(levelIndex: number, parts: Part[]): string | null {
	const target = parts.find((p) => (p as { tutorialProgressTarget?: boolean }).tutorialProgressTarget);
	if (!target) return null;
	const c = tutorialBodyCentre(target);
	if (!c) return null;
	if (levelIndex === 7 && c.x > 25 && c.y > 9) return "reachedEnd";
	if (levelIndex === 8 && c.x < -25 && c.y > -8) return "botInBox";
	return null;
}
