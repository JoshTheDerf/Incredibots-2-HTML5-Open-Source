import { Text, TextStyle } from "pixi.js";
import { ControllerGame, GuiButton, GuiWindow, Main } from "../imports";

export class TutorialWindow extends GuiWindow
{
	private cont:ControllerGame;
	private msgArea:Text;
	private msgArea2:Text;
	private msgArea3:Text;
	private num:number;
	private initX:number;
	private initY:number;

	constructor(contr:ControllerGame, x:number, y:number, id:number, moreButton:boolean = false)
	{
		super(x, y, 248, (id == 25 ? 185 : (id == 1 || id == 4 || id == 14 || id == 21 || id == 23 || id == 27 || id == 30 || id == 44 || id == 48 || id == 50 || id == 52 || id == 53 || id == 56 || id == 57 || id == 58 || id == 60 || (id > 70 && id < 82)) ? 180 : 170));
		const big = (id == 1 || id == 4 || id == 14 || id == 21 || id == 23 || id == 27 || id == 30 || id == 44 || id == 48 || id == 50 || id == 52 || id == 53 || id == 56 || id == 57 || id == 58 || id == 60 || (id > 70 && id < 82)) ? 180 : 170
		if (id >= 70 && x < 100) {
			if (x < 50) x = 50;
		} else if (x < 100) {
			x = 100;
		}
		if (x > 500) x = 520;
		if (y < 120) y = 120;
		if (y > 380) y = 380;
		this.initX = x;
		this.initY = y;
		this.cont = contr;
		this.num = id;

		var msg:string = this.TUTORIAL_MESSAGES[id];
		var numAreas:number = 1;
		while (msg.search("\n\n") != -1) {
			numAreas++;
			msg = msg.substr(msg.search("\n\n") + 2);
		}

		msg = this.TUTORIAL_MESSAGES[id];

		this.msgArea = new Text('');
		this.msgArea.anchor.set(0.5, 0.5);
		this.msgArea.x = 10 + (228 / 2);
		this.msgArea.y = 16;
		this.msgArea.text = (numAreas == 1 ? msg : msg.substr(0, msg.search("\n\n")));
		var format:TextStyle = new TextStyle();
		format.fontSize = 12;
		format.align = 'center';
		format.fontFamily = Main.GLOBAL_FONT;
		format.leading = 2;
		format.fill = 0x242930;
		format.wordWrap = true;
		format.wordWrapWidth = 228;
		this.msgArea.style = format;
		this.addChild(this.msgArea);

		msg = msg.substr(msg.search("\n\n") + 2);

		if (numAreas > 1) {
			this.msgArea2 = new Text('');
			this.msgArea2.anchor.set(0.5, 0);
			this.msgArea2.x = 10 + (228 / 2);
			var numLines:number = 1;
			var tempMsg:string = this.msgArea.text;
			while (tempMsg.search("\r") != -1) {
				numLines++;
				tempMsg = tempMsg.substr(tempMsg.search("\r") + 2);
			}
			this.msgArea2.y = this.msgArea.y + 10 + (numLines * 16);
			this.msgArea2.text = (numAreas == 2 ? msg : msg.substr(0, msg.search("\n\n")));
			format = new TextStyle();
			format.fontSize = 12;
			format.align = 'center';
			format.fontFamily = Main.GLOBAL_FONT;
			format.leading = 2;
			format.fill = 0x242930;
			this.msgArea2.style = format;
			this.addChild(this.msgArea2);
		}

		msg = msg.substr(msg.search("\n\n") + 2);

		if (numAreas > 2) {
			this.msgArea3 = new Text('');
			this.msgArea3.anchor.set(0.5, 0);
			this.msgArea3.x = 10 + (228 / 2);
			numLines = 1;
			tempMsg = this.msgArea2.text;
			while (tempMsg.search("\r") != -1) {
				numLines++;
				tempMsg = tempMsg.substr(tempMsg.search("\r") + 2);
			}
			this.msgArea3.y = this.msgArea2.y + 10 + (numLines * 16);
			this.msgArea3.text = msg;
			format = new TextStyle();
			format.fontSize = 12;
			format.align = 'center';
			format.fontFamily = Main.GLOBAL_FONT;
			format.leading = 2;
			format.fill = 0x242930;
			this.msgArea3.style = format;
			this.addChild(this.msgArea3);
		}

		var b:GuiButton = new GuiButton((moreButton ? "More..." : "OK"), 89, (id == 25 ? 140 : (big ? 135 : 125)), 70, 40, () => this.closeWindow(), GuiButton.PURPLE);
		this.addChild(b);
	}

	public ResetPosition():void {
		this.x = this.initX;
		this.y = this.initY;
	}

	public closeWindow(e:MouseEvent):void {
		this.cont.CloseTutorialDialog(this.num);
	}

	private TUTORIAL_MESSAGES:Array<string> =  [
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
		"\nHere's a sample challenge for you to try!\n\nTo check out some user-created\nchallenges, press \"Load Challenge\"\nfrom the main menu."
	];
}
