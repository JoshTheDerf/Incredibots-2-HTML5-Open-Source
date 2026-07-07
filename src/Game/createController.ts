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
			return new ControllerSandbox() as Controller;
		// Initial main menu (first frame).
		case -4:
			return new ControllerMainMenu() as Controller;
		// Reset back to the main menu (level select).
		case -1:
			return new ControllerMainMenu(true) as Controller;
		case 10:
			return new ControllerTank() as Controller;
		case 11:
			return new ControllerShapes() as Controller;
		case 12:
			return new ControllerCar() as Controller;
		case 13:
			return new ControllerJumpbot() as Controller;
		case 14:
			return new ControllerDumpbot() as Controller;
		case 15:
			return new ControllerCatapult() as Controller;
		case 16:
			return new ControllerHomeMovies() as Controller;
		case 17:
			return new ControllerRubeGoldberg() as Controller;
		case 18:
			return new ControllerNewFeatures() as Controller;
		case 19:
			return new ControllerChallengeEditor() as Controller;
		case 1:
			return new ControllerChallenge() as Controller;
		case 2:
			return new ControllerMonkeyBars() as Controller;
		case 3:
			return new ControllerClimb() as Controller;
		case 4:
			return new ControllerRace(main.preloadedBots.cRace) as Controller;
		case 5:
			return new ControllerSpaceship(main.preloadedBots.cSpaceship) as Controller;
		default:
			return new ControllerSandbox() as Controller;
	}
}
