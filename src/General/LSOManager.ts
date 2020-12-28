import { Util } from "./Util";

interface IncredibotsSharedObject {
	data: {
		levelCheckmarks: number,
		robotsRated: Array<any>,
		replaysRated: Array<any>,
		challengesRated: Array<any>,
		readTerms2: boolean
	}
}

export class LSOManager {
	private static obj:IncredibotsSharedObject = {
		data: {
			levelCheckmarks: 0,
			robotsRated: [],
			replaysRated: [],
			challengesRated: [],
			readTerms2: false
		}
	};

	public static Init():void {
		LSOManager.obj = localStorage.Incredibots ? JSON.parse(localStorage.Incredibots) : LSOManager.obj

		if (!LSOManager.obj.data.hasOwnProperty("levelCheckmarks")) {
			LSOManager.obj.data.levelCheckmarks = 0;
			LSOManager.flush(LSOManager.obj);
		}
		if (!LSOManager.obj.data.hasOwnProperty("robotsRated")) {
			LSOManager.obj.data.robotsRated = new Array();
			LSOManager.flush(LSOManager.obj);
		}
		if (!LSOManager.obj.data.hasOwnProperty("replaysRated")) {
			LSOManager.obj.data.replaysRated = new Array();
			LSOManager.flush(LSOManager.obj);
		}
		if (!LSOManager.obj.data.hasOwnProperty("challengesRated")) {
			LSOManager.obj.data.challengesRated = new Array();
			LSOManager.flush(LSOManager.obj);
		}
		if (!LSOManager.obj.data.hasOwnProperty("readTerms2")) {
			LSOManager.obj.data.readTerms2 = false;
		}
		LSOManager.flush(LSOManager.obj);
	}

	public static IsLevelDone(level:number):Boolean {
		return ((LSOManager.obj.data.levelCheckmarks & (0x00000001 << level)) != 0);
	}

	public static IsAnythingDone():Boolean {
		return (LSOManager.obj.data.levelCheckmarks != 0);
	}

	public static SetLevelDone(level:number):void {
		LSOManager.obj.data.levelCheckmarks |= (0x00000001 << level);
		LSOManager.flush(LSOManager.obj);
	}

	public static HasRatedRobot(robotID:String):Boolean {
		return Util.ObjectInArray(robotID, LSOManager.obj.data.robotsRated);
	}

	public static HasRatedReplay(replayID:String):Boolean {
		return Util.ObjectInArray(replayID, LSOManager.obj.data.replaysRated);
	}

	public static HasRatedChallenge(challengeID:String):Boolean {
		return Util.ObjectInArray(challengeID, LSOManager.obj.data.challengesRated);
	}

	public static SetRobotRated(robotID:String):void {
		LSOManager.obj.data.robotsRated.push(robotID);
		LSOManager.flush(LSOManager.obj);
	}

	public static SetReplayRated(replayID:String):void {
		LSOManager.obj.data.replaysRated.push(replayID);
		LSOManager.flush(LSOManager.obj);
	}

	public static SetChallengeRated(challengeID:String):void {
		LSOManager.obj.data.challengesRated.push(challengeID);
		LSOManager.flush(LSOManager.obj);
	}

	public static HasReadTerms():Boolean {
		return LSOManager.obj.data.readTerms2;
	}

	public static SetTermsRead():void {
		LSOManager.obj.data.readTerms2 = true;
		LSOManager.flush(LSOManager.obj);
	}

	public static flush(obj) {
		localStorage.Incredibots = JSON.stringify(obj)
	}
}
