import { Controller } from "./Controller"
import { ControllerGameGlobals } from "./Globals/ControllerGameGlobals"
import { ControllerChallenge } from "./ControllerChallenge"
import { ControllerMainMenu } from "./ControllerMainMenu"
import { ControllerSandbox } from "./ControllerSandbox"
import { ControllerClimb } from "./Challenges/ControllerClimb"
import { ControllerMonkeyBars } from "./Challenges/ControllerMonkeyBars"
import { ControllerRace } from "./Challenges/ControllerRace"
import { ControllerSpaceship } from "./Challenges/ControllerSpaceship"
import { ControllerCar } from "./Tutorials/ControllerCar"
import { ControllerCatapult } from "./Tutorials/ControllerCatapult"
import { ControllerChallengeEditor } from "./Tutorials/ControllerChallengeEditor"
import { ControllerDumpbot } from "./Tutorials/ControllerDumpbot"
import { ControllerHomeMovies } from "./Tutorials/ControllerHomeMovies"
import { ControllerJumpbot } from "./Tutorials/ControllerJumpbot"
import { ControllerNewFeatures } from "./Tutorials/ControllerNewFeatures"
import { ControllerRubeGoldberg } from "./Tutorials/ControllerRubeGoldberg"
import { ControllerShapes } from "./Tutorials/ControllerShapes"
import { ControllerTank } from "./Tutorials/ControllerTank"
import { SandboxSettings } from "./SandboxSettings"
import type { Main } from "../Main"

// Leaf module that owns all controller instantiation. This is imported ONLY by
// src/index.ts (never by Main) so that the controller subclasses do not become
// part of Main's module-load graph, which previously caused TDZ cycles.
//
// The sentinel type numbers below mirror the branching that used to live in
// Main.update(). Negative sentinels correspond to the first-frame / reset cases
// that are not reachable via Main.nextControllerType from the rest of the app:
//   -1  reset back to the main menu (level select)      -> new ControllerMainMenu(true)
//   -4  initial main menu on first frame                -> new ControllerMainMenu()
//   -5  first-frame ControllerSandbox with default load settings
export function createController(type: number, main: Main): Controller {
	switch (type) {
		// First-frame ControllerSandbox used for replay / robot / challenge deep links.
		case -5:
			ControllerGameGlobals.settings = new SandboxSettings(15.0, 0, 0, 0, 0);
			return new ControllerSandbox();
		// Initial main menu (first frame).
		case -4:
			return new ControllerMainMenu();
		// Reset back to the main menu (level select).
		case -1:
			return new ControllerMainMenu(true);
		case 10:
			return new ControllerTank();
		case 11:
			return new ControllerShapes();
		case 12:
			return new ControllerCar();
		case 13:
			return new ControllerJumpbot();
		case 14:
			return new ControllerDumpbot();
		case 15:
			return new ControllerCatapult();
		case 16:
			return new ControllerHomeMovies();
		case 17:
			return new ControllerRubeGoldberg();
		case 18:
			return new ControllerNewFeatures();
		case 19:
			return new ControllerChallengeEditor();
		case 1:
			return new ControllerChallenge();
		case 2:
			return new ControllerMonkeyBars();
		case 3:
			return new ControllerClimb();
		case 4:
			return new ControllerRace(main.preloadedBots.cRace);
		case 5:
			return new ControllerSpaceship(main.preloadedBots.cSpaceship);
		default:
			return new ControllerSandbox();
	}
}
