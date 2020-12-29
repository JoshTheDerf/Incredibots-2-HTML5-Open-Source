import { b2World, b2MouseJoint, b2AABB, b2Body, b2MouseJointDef, b2Vec2, b2Shape } from "@box2d/core";
import { Sprite, Matrix, Circle, Rectangle, Graphics, TextStyle, Text } from "pixi.js";
import { Database } from "../General/Database";
import { Util } from "../General/Util";
import { Main } from "../Main";
import { Part, IllegalOperationError } from "../Parts/Part";
import { Cannon } from "../Parts/Cannon";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import { CameraMovement } from "./CameraMovement";
import { Challenge } from "./Challenge";
import { Controller } from "./Controller";
import { Draw } from "./Draw";
import { Resource } from "./Graphics/Resource";
import { Sky } from "./Graphics/Sky";
import { Replay } from "./Replay";
import { Robot } from "./Robot";
import { ControllerGameGlobals } from './Globals/ControllerGameGlobals'
import { Input } from "../General/Input";
import { Action } from "../Actions/Action";
import { MainEditPanel } from "../Gui/MainEditPanel";
import { DropDownMenu } from "../Gui/DropDownMenu";
import { PartEditWindow } from "../Gui/PartEditWindow";

export class ControllerGame extends Controller {
		//======================
		// Member Data
		//======================
		private replaySplineXs:Array<any>;
		private replaySplineYs:Array<any>;
		private replaySplineAngles:Array<any>;


		public m_world:b2World = null;
		public m_mouseJoint:b2MouseJoint = null;
		public m_iterations:number = 10;
		public m_timeStep:number = 1.0/30;
		public m_physScale:number = ControllerGameGlobals.INIT_PHYS_SCALE;
		// Sprite to draw in to
		public m_canvas:Sprite;
		public m_buildAreas:Array<any> = new Array();
		public m_badBuildAreas:Array<any> = new Array();
		public m_selectedBuildAreas:Array<any> = new Array();
		public m_guiMenu:DropDownMenu;
		public m_guiPanel:MainEditPanel;
		public m_sidePanel:PartEditWindow;
		public m_chooserWindow:SaveLoadWindow = null;
		public m_loginWindow:LoginWindow = null;
		public m_newUserWindow:NewUserWindow = null;
		public m_scoreWindow:ScoreWindow = null;
		public m_progressDialog:DialogWindow = null;
		public m_linkDialog:LinkWindow = null;
		public m_tutorialDialog:TutorialWindow = null;
		public m_postReplayWindow:PostReplayWindow = null;
		public m_rateDialog:RateWindow = null;
		public m_restrictionsDialog:RestrictionsWindow = null;
		public m_conditionsDialog:ConditionsWindow = null;
		public m_sandboxWindow:AdvancedSandboxWindow = null;
		public m_challengeWindow:ChooseChallengeWindow = null;
		public m_reportWindow:ReportWindow = null;
		public m_loadWindow:LoadWindow = null;
		public m_exportDialog:ExportWindow = null;
		public m_importDialog:ImportWindow = null;
		public m_fader:Graphics;

		protected hasPanned:boolean = true;
		protected hasZoomed:boolean = true;
		protected redrawBuildArea:boolean = true;
		protected redrawRobot:boolean = true;

		public paused:boolean = true;
		public simStarted:boolean = false;
		public wonChallenge:boolean = false;
		public canSaveReplay:boolean = true;
		protected autoPanning:boolean = true;
		protected cameraPart:ShapePart = null;


		private initRotatingAngle:number;
		private initDragX:number;
		private initDragY:number;
		protected curAction:number = -1;
		private actionStep:number = 0;
		private firstClickX:number;
		private firstClickY:number;
		private secondClickX:number;
		private secondClickY:number;
		private savedDrawXOff:number;
		private savedDrawYOff:number;
		private mostRecentScaleFactor:number

		public draw:Draw;

		public sSky:Sky;

		public allParts:Array<any>;
		public actions:Array<any>;
		public cameraMovements:Array<any>;
		public keyPresses:Array<any>;
		public syncPoints:Array<any>;

		public frameCounter:number;
		public lastAction:number = -1;
		protected partsFit:boolean = true;
		private draggingTutorial:boolean = false;
		private selectingCondition:boolean = false;
		private delayedSelection:boolean = false;
		public ignoreAClick:boolean = false;
		public backToSaveWindow:boolean = false;
		public clickedReport:boolean = false;
		public clickedSave:boolean = false;
		public clickedSaveReplay:boolean = false;
		public clickedSaveChallenge:boolean = false;
		public clickedSubmitScore:boolean = false;
		private redirectAfterRating:number = 0;
		public saveAfterRestrictions:boolean = false;


		public selectedParts:Array<any> = new Array();
		public selectedBuildArea:b2AABB;
		public rotatingPart:Object = null;
		public rotatingParts:Array<any> = null;
		public draggingPart:Part = null;
		public draggingParts:Array<any> = null;
		public jointPart:ShapePart = null;
		private lastSelectedShape:ShapePart = null;
		private lastSelectedJoint:JointPart = null;
		private lastSelectedText:TextPart = null;
		private lastSelectedThrusters:Thrusters = null;
		public copiedJoint:JointPart = null;
		public copiedThrusters:Thrusters = null;

		protected removedGraphics:Array<any> = new Array();

		protected uneditableText:Text;
		protected rotatingText:Text;
		protected scalingText:Text;
		protected boxText:Text;
		protected horizLineText:Text;
		protected vertLineText:Text;
		protected shapeText:Text;
		private newText:Object;
		private oldText:String = "";

		public potentialJointPart1:ShapePart;
		public potentialJointPart2:ShapePart;
		public candidateJointX:number;
		public candidateJointY:number;
		public candidateJointType:number;
		public candidateJointParts:Array<any>;

		constructor() {
			super()

			this.allParts = new Array();
			ControllerGameGlobals.cannonballs = new Array();
			this.actions = new Array();

			Input.m_currController = this;
			Action.m_controller = this;

			this.m_canvas = new Sprite();
			this.m_guiPanel = new MainEditPanel(this);
			this.m_guiMenu = new DropDownMenu(this);
			this.m_sidePanel = new PartEditWindow(this);

			this.m_fader = new Graphics();
			this.m_fader.beginFill(0, 0.2);
			this.m_fader.lineStyle(0, 0, 0.2);
			this.m_fader.moveTo(0, 0);
			this.m_fader.lineTo(800, 0);
			this.m_fader.lineTo(800, 600);
			this.m_fader.lineTo(0, 600);
			this.m_fader.lineTo(0, 0);
			this.m_fader.endFill();
			this.m_fader.visible = false;

			this.uneditableText = new Text('');
			this.uneditableText.x = 0;
			this.uneditableText.y = 102;
			this.uneditableText.width = 800;
			this.uneditableText.text = "The current robot is uneditable.  Some features, including saving and submitting scores, will be disabled.";
			this.uneditableText.visible = false;
			var format:TextStyle = new TextStyle();
			format.align = 'center';
			format.fontFamily = Main.GLOBAL_FONT;
			format.fontSize = 12;
			this.uneditableText.style = format;

			this.rotatingText = new Text('');
			this.rotatingText.x = 0;
			this.rotatingText.y = 102;
			this.rotatingText.width = 800;
			this.rotatingText.text = "Move the mouse around to rotate the shape, and click when you're done.";
			this.rotatingText.visible = false;
			this.rotatingText.style = format;

			this.scalingText = new Text('');
			this.scalingText.x = 0;
			this.scalingText.y = 102;
			this.scalingText.width = 800;
			this.scalingText.text = "Move the mouse to the right to increase the shape's size, and left to decrease it.";
			this.scalingText.visible = false;
			this.scalingText.style = format;

			this.boxText = new Text('');
			this.boxText.x = 0;
			this.boxText.y = 102;
			this.boxText.width = 800;
			this.boxText.text = "Use the mouse to click and drag a box for the given condition.  You can use the arrow keys to scroll.";
			this.boxText.visible = false;
			this.boxText.style = format;

			this.horizLineText = new Text('');
			this.horizLineText.x = 0;
			this.horizLineText.y = 102;
			this.horizLineText.width = 800;
			this.horizLineText.text = "Use the mouse to draw a horizontal line for the given condition.  You can use the arrow keys to scroll.";
			this.horizLineText.visible = false;
			this.horizLineText.style = format;

			this.vertLineText = new Text('');
			this.vertLineText.x = 0;
			this.vertLineText.y = 102;
			this.vertLineText.width = 800;
			this.vertLineText.text = "Use the mouse to draw a vertical line for the given condition.  You can use the arrow keys to scroll.";
			this.vertLineText.visible = false;
			this.vertLineText.style = format;

			this.shapeText = new Text('');
			this.shapeText.x = 0;
			this.shapeText.y = 102;
			this.shapeText.width = 800;
			this.shapeText.text = "Select a shape for the given condition.  You can use the arrow keys to scroll.";
			this.shapeText.visible = false;
			this.shapeText.style = format;

			// set debug draw
			this.draw = new Draw();
			this.draw.m_sprite = this.m_canvas;
			this.draw.m_drawScale = this.m_physScale;
			this.draw.m_drawYOff = -100;
			if (ControllerGameGlobals.showColours) this.draw.m_fillAlpha = 1.0;
			else this.draw.m_fillAlpha = 0.5;
			this.draw.m_drawFlags = b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit;

			if (ControllerGameGlobals.playingReplay) {
				ControllerGameGlobals.replay.cont = this;
			} else {
				ControllerGameGlobals.viewingUnsavedReplay = false;
			}

			addEventListener(Event.ADDED_TO_STAGE, this.Init);
		}

		public Init(e:Event):void {
			this.addChild(this.m_canvas);
			this.addChild(this.uneditableText);
			this.addChild(this.rotatingText);
			this.addChild(this.scalingText);
			this.addChild(this.boxText);
			this.addChild(this.horizLineText);
			this.addChild(this.vertLineText);
			this.addChild(this.shapeText);
			this.addChild(this.m_guiPanel);
			this.addChild(this.m_sidePanel);
			this.addChild(this.m_guiMenu);
			this.addChild(this.m_fader);
			if (ControllerGameGlobals.playingReplay) {
				this.allParts = this.allParts.concat(ControllerGameGlobals.replayParts);
				for (var i:number = 0; i < this.allParts.length; i++) {
					if (this.allParts[i] instanceof TextPart) {
						var newTextPart:TextPart = new TextPart(this, this.allParts[i].x, this.allParts[i].y, this.allParts[i].w, this.allParts[i].h, this.allParts[i].text);
						newTextPart.alwaysVisible = this.allParts[i].alwaysVisible;
						newTextPart.displayKey = this.allParts[i].displayKey;
						newTextPart.red = this.allParts[i].red;
						newTextPart.green = this.allParts[i].green;
						newTextPart.blue = this.allParts[i].blue;
						newTextPart.size = this.allParts[i].size;
						this.allParts[i] = newTextPart;
					}
				}
			}

			if (ControllerGameGlobals.loadedParts) {
				if (this instanceof ControllerChallenge && ControllerChallenge.playChallengeMode && !ControllerGameGlobals.justLoadedRobotWithChallenge) {
					for (i = 0; i < ControllerGameGlobals.loadedParts.length; i++) {
						ControllerGameGlobals.loadedParts[i].isEditable = false;
					}
				}
				if (ControllerGameGlobals.justLoadedRobotWithChallenge) {
					this.allParts = this.allParts.concat(ControllerChallenge.challenge.allParts);
					for (i = 0; i < this.allParts.length; i++) {
						this.allParts[i].isEditable = false;
					}
				}
				ControllerGameGlobals.justLoadedRobotWithChallenge = false;
				this.allParts = this.allParts.concat(ControllerGameGlobals.loadedParts);
				for (i = 0; i < this.allParts.length; i++) {
					if (this.allParts[i] instanceof TextPart) {
						newTextPart = new TextPart(this, this.allParts[i].x, this.allParts[i].y, this.allParts[i].w, this.allParts[i].h, this.allParts[i].text);
						newTextPart.alwaysVisible = this.allParts[i].alwaysVisible;
						newTextPart.displayKey = this.allParts[i].displayKey;
						newTextPart.red = this.allParts[i].red;
						newTextPart.green = this.allParts[i].green;
						newTextPart.blue = this.allParts[i].blue;
						newTextPart.size = this.allParts[i].size;
						if (!this.allParts[i].isEditable) newTextPart.isEditable = false;
						this.allParts[i] = newTextPart;
					}
				}
				ControllerGameGlobals.loadedParts = null;
				if (ControllerGameGlobals.initX != Number.MAX_VALUE) {
					this.draw.m_drawXOff = ControllerGameGlobals.initX;
					this.draw.m_drawYOff = ControllerGameGlobals.initY;
					this.m_physScale = ControllerGameGlobals.initZoom;
				} else if (!(this instanceof ControllerChallenge)) {
					this.CenterOnLoadedRobot();
				}
			} else if (!ControllerGameGlobals.playingReplay) {
				ControllerGameGlobals.curRobotID = "";
				ControllerGameGlobals.curRobotEditable = true;
				ControllerGameGlobals.curRobotPublic = false;
			}

			ControllerGameGlobals.initX = Number.MAX_VALUE;
			ControllerGameGlobals.initY = Number.MAX_VALUE;
			ControllerGameGlobals.initZoom = Number.MAX_VALUE;

			if (this instanceof ControllerChallenge) {
				ControllerGameGlobals.minDensity = (ControllerChallenge.challenge.minDensity == -Number.MAX_VALUE ? 1 : ControllerChallenge.challenge.minDensity);
				ControllerGameGlobals.maxDensity = (ControllerChallenge.challenge.maxDensity == Number.MAX_VALUE ? 30 : ControllerChallenge.challenge.maxDensity);
				ControllerGameGlobals.maxRJStrength = (ControllerChallenge.challenge.maxRJStrength == Number.MAX_VALUE ? 30 : ControllerChallenge.challenge.maxRJStrength);
				ControllerGameGlobals.maxRJSpeed = (ControllerChallenge.challenge.maxRJSpeed == Number.MAX_VALUE ? 30 : ControllerChallenge.challenge.maxRJSpeed);
				ControllerGameGlobals.maxSJStrength = (ControllerChallenge.challenge.maxSJStrength == Number.MAX_VALUE ? 30 : ControllerChallenge.challenge.maxSJStrength);
				ControllerGameGlobals.maxSJSpeed = (ControllerChallenge.challenge.maxSJSpeed == Number.MAX_VALUE ? 30 : ControllerChallenge.challenge.maxSJSpeed);
				ControllerGameGlobals.maxThrusterStrength = (ControllerChallenge.challenge.maxThrusterStrength == Number.MAX_VALUE ? 30 : ControllerChallenge.challenge.maxThrusterStrength);
			} else {
				ControllerGameGlobals.minDensity = 1;
				ControllerGameGlobals.maxDensity = 30;
				ControllerGameGlobals.maxRJStrength = 30;
				ControllerGameGlobals.maxRJSpeed = 30;
				ControllerGameGlobals.maxSJStrength = 30;
				ControllerGameGlobals.maxSJSpeed = 30;
				ControllerGameGlobals.maxThrusterStrength = 30;
			}

			PrismaticJoint.jbTutorial = false;

			if (Main.inIFrame) {
				ControllerGameGlobals.curRobotEditable = false;
				this.uneditableText.text = "";
			}
		}

		public BuildBuildArea():void {
			for (var i:number = 0; i < this.m_buildAreas.length; i++) {
				this.removeChild(this.m_buildAreas[i]);
				this.removeChild(this.m_badBuildAreas[i]);
				this.removeChild(this.m_selectedBuildAreas[i]);
			}
			this.m_buildAreas = new Array();
			this.m_badBuildAreas = new Array();
			this.m_selectedBuildAreas = new Array();

			var childIndex:number = this.sSky.lastCloudIndex + 1;
			for (i = 0; i < this.NumBuildingAreas(); i++) {
				var m_buildArea:Sprite = new Sprite();
				m_buildArea.graphics.lineStyle(6, 0xDEB05D);
				var m:Matrix = new Matrix();
				m.createGradientBox(700, 550, Math.PI / 2);
				m_buildArea.graphics.beginGradientFill(GradientType.LINEAR, [0xFF8F17, 0xFFC150], [0.15, 0.15], [0, 255], m);
				m_buildArea.graphics.drawRect(0, 0, 700, 550);
				m_buildArea.graphics.endFill();
				this.addChildAt(m_buildArea, childIndex);
				this.m_buildAreas.push(m_buildArea);
				var m_badBuildArea:Sprite = new Sprite();
				m_badBuildArea.graphics.lineStyle(6, 0xDE6A5D);
				m = new Matrix();
				m.createGradientBox(700, 550, Math.PI / 2);
				m_badBuildArea.graphics.beginGradientFill(GradientType.LINEAR, [0xFF4D17, 0xFF8F50], [0.15, 0.15], [0, 255], m);
				m_badBuildArea.graphics.drawRect(0, 0, 700, 550);
				m_badBuildArea.graphics.endFill();
				this.addChildAt(m_badBuildArea, childIndex);
				this.m_badBuildAreas.push(m_badBuildArea);
				var m_selectedBuildArea:Sprite = new Sprite();
				m_selectedBuildArea.graphics.lineStyle(6, 0xFECA5D);
				m = new Matrix();
				m.createGradientBox(700, 550, Math.PI / 2);
				m_selectedBuildArea.graphics.beginGradientFill(GradientType.LINEAR, [0xFF4D17, 0xFF8F50], [0.15, 0.15], [0, 255], m);
				m_selectedBuildArea.graphics.drawRect(0, 0, 700, 550);
				m_selectedBuildArea.graphics.endFill();
				this.addChildAt(m_selectedBuildArea, childIndex);
				this.m_selectedBuildAreas.push(m_selectedBuildArea);
			}
		}

		public PlayShapeSound():void {
			if (Main.enableSound) {
				var soundNum:number = int(Util.RangedRandom(0, 5));
				var sound:Sound = (soundNum == 0 ? ControllerGameGlobals.shapeSound1 : (soundNum == 1 ? ControllerGameGlobals.shapeSound2 : (soundNum == 2 ? ControllerGameGlobals.shapeSound3 : (soundNum == 3 ? ControllerGameGlobals.shapeSound4 : ControllerGameGlobals.shapeSound5))));
				ControllerGameGlobals.channel = sound.play();
				var st:SoundTransform = new SoundTransform(0.7);
				ControllerGameGlobals.channel.soundTransform = st;
			}
		}

		public PlayJointSound():void {
			if (Main.enableSound) {
				var soundNum:number = Math.floor(Util.RangedRandom(0, 5));
				var sound:Sound = (soundNum == 0 ? ControllerGameGlobals.jointSound1 : (soundNum == 1 ? ControllerGameGlobals.jointSound2 : (soundNum == 2 ? ControllerGameGlobals.jointSound3 : (soundNum == 3 ? ControllerGameGlobals.jointSound4 : ControllerGameGlobals.jointSound5))));
				ControllerGameGlobals.channel = sound.play();
				var st:SoundTransform = new SoundTransform(0.7);
				ControllerGameGlobals.channel.soundTransform = st;
			}
		}

		public GetPhysScale():number {
			return this.m_physScale;
		}

		public GetMinX():number {
			return -Number.MAX_VALUE;
		}

		public GetMaxX():number {
			return Number.MAX_VALUE;
		}

		public GetMinY():number {
			return -Number.MAX_VALUE;
		}

		public GetMaxY():number {
			return Number.MAX_VALUE;
		}

		public Update():void {
			// FIXME: Temporarily disabled to prevent circular references to ControllerMainMenu
			// if (ControllerMainMenu.channel) {
			// 	ControllerGameGlobals.introVolume -= 0.005;
			// 	var st:SoundTransform = new SoundTransform(ControllerGameGlobals.introVolume);
			// 	ControllerMainMenu.channel.soundTransform = st;
			// 	if (ControllerGameGlobals.introVolume <= 0) {
			// 		ControllerMainMenu.channel.stop();
			// 		ControllerMainMenu.channel = null;
			// 	}
			// }

			if (!this.m_fader.visible) {
				if (ControllerGameGlobals.showColours) this.draw.m_fillAlpha = 1.0;
				else this.draw.m_fillAlpha = 0.5;

				if (ControllerGameGlobals.playingReplay && !this.simStarted) this.playButton(new MouseEvent(""));

				// update mouse position
				ControllerGameGlobals.mouseXWorldPhys = ((Input.mouseX) + this.draw.m_drawXOff)/this.m_physScale;
				ControllerGameGlobals.mouseYWorldPhys = ((Input.mouseY) + this.draw.m_drawYOff)/this.m_physScale;
				ControllerGameGlobals.prevMouseXWorld = ControllerGameGlobals.mouseXWorld;
				ControllerGameGlobals.prevMouseYWorld = ControllerGameGlobals.mouseYWorld;
				ControllerGameGlobals.mouseXWorld = (Input.mouseX);
				ControllerGameGlobals.mouseYWorld = (Input.mouseY);

				Main.ShowMouse();

				if (!this.paused && this.autoPanning) {
					this.HandleCamera();
				}

				this.MouseDrag();
				this.HandleKey();

				for (var i:number = 0; i < this.allParts.length; i++) {
					if (this.allParts[i] instanceof RevoluteJoint || this.allParts[i] instanceof PrismaticJoint) this.allParts[i].CheckForBreakage(this.m_world);
				}

				this.m_guiMenu.Update();
				this.m_guiPanel.Update(this.curAction);

				this.uneditableText.visible = (!ControllerGameGlobals.curRobotEditable && !ControllerGameGlobals.playingReplay && !this.simStarted);
				this.rotatingText.visible = (this.curAction == ControllerGameGlobals.ROTATE);
				this.scalingText.visible = (this.curAction == ControllerGameGlobals.RESIZING_SHAPES);

				if (this.newText && this.lastSelectedText instanceof TextPart) {
					this.lastSelectedText.text = this.newText.text;
					this.lastSelectedText.m_textField.text = this.newText.text;
					this.newText = null;
				}

				// Update physics
				var physStart:uint = getTimer();
				if (!this.paused) {
					if (!ControllerGameGlobals.playingReplay) {
						if (this.frameCounter % ControllerGameGlobals.REPLAY_SYNC_FRAMES == 0) this.AddSyncPoint();
						this.m_world.Step(1/60, 5);
						this.m_world.Step(1/60, this.m_iterations);
					}
					this.frameCounter++;
					this.m_guiPanel.SetTimer(this.frameCounter);

					if (this.frameCounter >= 9000 || ControllerGameGlobals.cannonballs.length > 500) this.canSaveReplay = false;
				}
			}

			this.draw.m_drawScale = this.m_physScale;
			this.draw.drawColours = ControllerGameGlobals.showColours;
			if (!this.simStarted) {
				for (i = 0; i < this.m_buildAreas.length; i++) {
					var box:b2AABB = this.GetBuildingAreaNumber(i);
					if (this.hasPanned || this.hasZoomed || this.redrawBuildArea) {
						this.m_buildAreas[i].x = this.World2ScreenX(box.lowerBound.x);
						this.m_buildAreas[i].y = this.World2ScreenY(box.lowerBound.y);
						this.m_badBuildAreas[i].x = this.World2ScreenX(box.lowerBound.x);
						this.m_badBuildAreas[i].y = this.World2ScreenY(box.lowerBound.y);
						this.m_selectedBuildAreas[i].x = this.World2ScreenX(box.lowerBound.x);
						this.m_selectedBuildAreas[i].y = this.World2ScreenY(box.lowerBound.y);
					}
					if (this.hasZoomed || this.redrawBuildArea) {
						this.m_buildAreas[i].width = this.World2ScreenX(box.upperBound.x) - this.World2ScreenX(box.lowerBound.x);
						this.m_buildAreas[i].height = this.World2ScreenY(box.upperBound.y) - this.World2ScreenY(box.lowerBound.y);
						this.m_badBuildAreas[i].width = this.World2ScreenX(box.upperBound.x) - this.World2ScreenX(box.lowerBound.x);
						this.m_badBuildAreas[i].height = this.World2ScreenY(box.upperBound.y) - this.World2ScreenY(box.lowerBound.y);
						this.m_selectedBuildAreas[i].width = this.World2ScreenX(box.upperBound.x) - this.World2ScreenX(box.lowerBound.x);
						this.m_selectedBuildAreas[i].height = this.World2ScreenY(box.upperBound.y) - this.World2ScreenY(box.lowerBound.y);
					}
					this.m_selectedBuildAreas[i].visible = (this.m_sidePanel.BuildWindowShowing() && this.selectedBuildArea == ControllerChallenge.challenge.buildAreas[i]);
					this.m_buildAreas[i].visible = (!this.m_selectedBuildAreas[i].visible && this.partsFit);
					this.m_badBuildAreas[i].visible = (!this.m_selectedBuildAreas[i].visible && !this.partsFit);
				}
				this.redrawBuildArea = false;
			} else {
				for (i = 0; i < this.m_buildAreas.length; i++) {
					this.m_buildAreas[i].visible = false;
					this.m_badBuildAreas[i].visible = false;
					this.m_selectedBuildAreas[i].visible = false;
				}
			}
			if (this.hasPanned || this.hasZoomed || !this.paused || this.draggingPart || this.curAction != -1 || this.redrawRobot) {
				this.m_canvas.graphics.clear();
				this.draw.DrawWorld(this.allParts, this.selectedParts, this.m_world, !this.simStarted, false, ControllerGameGlobals.showJoints, ControllerGameGlobals.showOutlines, ((this instanceof ControllerChallenge) ? ControllerChallenge.challenge : null));
				this.redrawRobot = false;
			}
			var snapPart:ShapePart = this.FindPartToSnapTo();
			if (!this.simStarted) {
				if (ControllerGameGlobals.snapToCenter && snapPart && (this.curAction == ControllerGameGlobals.NEW_FIXED_JOINT || this.curAction == ControllerGameGlobals.NEW_REVOLUTE_JOINT || this.curAction == ControllerGameGlobals.NEW_PRISMATIC_JOINT || this.curAction == ControllerGameGlobals.NEW_THRUSTERS)) {
					this.draw.DrawTempShape(this.curAction, this.actionStep, this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY, snapPart.centerX, snapPart.centerY);
				} else if (this.curAction == ControllerGameGlobals.FINALIZING_JOINT && this.candidateJointType == ControllerGameGlobals.NEW_PRISMATIC_JOINT && this.actionStep == 1) {
					this.draw.DrawTempShape(ControllerGameGlobals.NEW_PRISMATIC_JOINT, this.actionStep, this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY, this.candidateJointX, this.candidateJointY);
				} else if (this.curAction == ControllerGameGlobals.FINALIZING_JOINT && this.candidateJointType == ControllerGameGlobals.NEW_THRUSTERS) {
					this.draw.DrawTempShape(ControllerGameGlobals.NEW_THRUSTERS, this.actionStep, this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY, this.candidateJointX, this.candidateJointY);
				} else if (this.curAction == ControllerGameGlobals.FINALIZING_JOINT) {
					this.draw.DrawTempShape(this.curAction, this.actionStep, this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY, this.candidateJointX, this.candidateJointY);
				} else {
					this.draw.DrawTempShape(this.curAction, this.actionStep, this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
				}
			}

			//Main.m_fpsCounter.updatePhys(physStart);

			if (Database.errorOccurred) {
				this.m_progressDialog.StopTimer();
				this.m_progressDialog.SetMessage(Database.lastErrorMsg, true);
				Database.errorOccurred = false;
				if (Database.versionErrorOccurred) {
					Database.versionErrorOccurred = false;
					this.m_progressDialog.ShowOKAndCancelButton(5);
				} else {
					this.m_progressDialog.ShowOKButton();
				}
				this.removeChild(this.m_progressDialog);
				this.addChild(this.m_progressDialog);
				Main.ShowMouse();
			}

			if (!this.paused && this.ChallengeOver()) {
				this.wonChallenge = true;
				this.pauseButton(new MouseEvent(""));
				if (!ControllerGameGlobals.playingReplay || ControllerGameGlobals.viewingUnsavedReplay) {
					this.m_fader.visible = true;
					if (this instanceof ControllerTutorial || this.WonChallenge()) {
						if (this.m_scoreWindow) {
							try {
								this.removeChild(this.m_scoreWindow);
							} catch (type:Error) {

							}
						}
						this.m_scoreWindow = new ScoreWindow(this, this.GetScore());
						if (Main.enableSound) {
							ControllerGameGlobals.musicChannel = ControllerGameGlobals.winSound.play();
							st = new SoundTransform(0.5);
							ControllerGameGlobals.musicChannel.soundTransform = st;
						}
						this.addChild(this.m_scoreWindow);
						if (this instanceof ControllerTutorial) {
							LSOManager.SetLevelDone(Main.nextControllerType - 10);
						} else if (this instanceof ControllerMonkeyBars || this instanceof ControllerClimb || this instanceof ControllerRace || this instanceof ControllerSpaceship) {
							LSOManager.SetLevelDone(Main.nextControllerType + 8);
						}
					} else {
						ControllerGameGlobals.failedChallenge = true;
						this.ShowDialog3("Sorry, you have failed this challenge!");
						this.m_progressDialog.ShowOKButton();
						this.m_progressDialog.StopTimer();
						if (Main.enableSound) {
							ControllerGameGlobals.musicChannel = ControllerGameGlobals.loseSound.play();
							st = new SoundTransform(0.5);
							ControllerGameGlobals.musicChannel.soundTransform = st;
						}
					}
				}
			}
		}

		public MoveCameraForReplay(cameraMovement:Object):void {
			if (cameraMovement.x != Number.POSITIVE_INFINITY) {
				var oldX:number = this.draw.m_drawXOff;
				var oldY:number = this.draw.m_drawYOff;
				this.draw.m_drawXOff = cameraMovement.x;
				this.draw.m_drawYOff = cameraMovement.y;
				this.autoPanning = false;
				if (oldX != this.draw.m_drawXOff || oldY != this.draw.m_drawYOff) this.hasPanned = true;
			}
			var oldScale:number = this.m_physScale;
			this.m_physScale = cameraMovement.scale;
			if (this.m_physScale != oldScale) this.hasZoomed = true;
			if (this.autoPanning) this.HandleCamera();
		}

		public AddSyncPoint():void  {
			if (this.syncPoints.length == 0 || this.frameCounter != this.syncPoints[this.syncPoints.length - 1].frame) {
				var bodiesUsed:Array<any> = new Array();
				var syncPoint:ReplaySyncPoint = new ReplaySyncPoint();
				syncPoint.frame = this.frameCounter;
				for (var i:number = 0; i < this.allParts.length; i++) {
					if (this.allParts[i] instanceof ShapePart && !this.allParts[i].isStatic && !Util.ObjectInArray(this.allParts[i].GetBody(), bodiesUsed)) {
						syncPoint.positions.push(Util.Vector(this.allParts[i].GetBody().GetPosition().x, this.allParts[i].GetBody().GetPosition().y));
						syncPoint.angles.push(this.allParts[i].GetBody().GetAngle());
						bodiesUsed.push(this.allParts[i].GetBody());
					}
				}
				for (i = 0; i < ControllerGameGlobals.cannonballs.length; i++) {
					syncPoint.cannonballPositions.push(Util.Vector(ControllerGameGlobals.cannonballs[i].GetPosition().x, ControllerGameGlobals.cannonballs[i].GetPosition().y));
				}
				this.syncPoints.push(syncPoint);
			}
		}

		private ComputeReplaySplines(type:number):Array<any> {
			// Compute the h and b
			var h:Array<any> = new Array();
			var b:Array<any> = new Array();
			for (var i:number = 0; i < ControllerGameGlobals.replay.syncPoints.length - 1; i++) {
				h.push(ControllerGameGlobals.replay.syncPoints[i + 1].frame - ControllerGameGlobals.replay.syncPoints[i].frame);
				var inner:Array<any> = new Array();
				for (var j:number = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
					if (type == 0) inner.push((ControllerGameGlobals.replay.syncPoints[i + 1].positions[j].x - ControllerGameGlobals.replay.syncPoints[i].positions[j].x) / h[i]);
					else if (type == 1) inner.push((ControllerGameGlobals.replay.syncPoints[i + 1].positions[j].y - ControllerGameGlobals.replay.syncPoints[i].positions[j].y) / h[i]);
					else {
						var deltaAngle:number = ControllerGameGlobals.replay.syncPoints[i + 1].angles[j] - ControllerGameGlobals.replay.syncPoints[i].angles[j];
						if (Math.abs(deltaAngle) > 20) {
							var a1:number = Util.NormalizeAngle(ControllerGameGlobals.replay.syncPoints[i].angles[j]);
							var a2:number = Util.NormalizeAngle(ControllerGameGlobals.replay.syncPoints[i + 1].angles[j]);
							if (Math.abs(a1 - a2) < Math.PI) {
								deltaAngle = a2 - a1;
							} else if (a1 > a2) {
								deltaAngle = a2 + 2 * Math.PI - a1;
							} else {
								deltaAngle = a2 - (a1 + 2 * Math.PI);
							}
						}
						inner.push(deltaAngle / h[i]);
					}
				}
				b.push(inner);
			}

			// Gaussian Elimination
			var u:Array<any> = new Array();
			var v:Array<any> = new Array();
			u.push(0);
			u.push(2 * (h[0] + h[1]));
			inner = new Array();
			for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
				inner.push(0);
			}
			v.push(inner);
			inner = new Array();
			for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
				if (b.length < 2) inner.push(0);
				else inner.push(6 * (b[1][j] - b[0][j]));
			}
			v.push(inner);
			for (i = 2; i < ControllerGameGlobals.replay.syncPoints.length - 1; i++) {
				u.push(2 * (h[i - 1] + h[i]) - h[i - 1] * h[i - 1] / u[i - 1]);
				inner = new Array();
				for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
					inner.push(6 * (b[i][j] - b[i - 1][j]) - h[i - 1] * v[i - 1][j] / u[i - 1]);
				}
				v.push(inner);
			}

			// Back-substitution
			var z:Array<any> = new Array();
			inner = new Array();
			for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
				inner.push(0);
			}
			z[ControllerGameGlobals.replay.syncPoints.length - 1] = inner;
			for (i = ControllerGameGlobals.replay.syncPoints.length - 2; i > 0; i--) {
				inner = new Array();
				for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
					inner.push((v[i][j] - h[i] * z[i + 1][j]) / u[i]);
				}
				z[i] = inner;
			}
			inner = new Array();
			for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
				inner.push(0);
			}
			z[0] = inner;

			var S:Array<any> = new Array();
			var As:Array<any> = new Array();
			var Bs:Array<any> = new Array();
			var Cs:Array<any> = new Array();
			var Ds:Array<any> = new Array();
			for (i = 0; i < ControllerGameGlobals.replay.syncPoints.length - 1; i++) {
				var innerA:Array<any> = new Array();
				var innerB:Array<any> = new Array();
				var innerC:Array<any> = new Array();
				var innerD:Array<any> = new Array();
				for (j = 0; j < ControllerGameGlobals.replay.syncPoints[0].positions.length; j++) {
					innerA.push(type == 0 ? ControllerGameGlobals.replay.syncPoints[i].positions[j].x : (type == 1 ? ControllerGameGlobals.replay.syncPoints[i].positions[j].y : ControllerGameGlobals.replay.syncPoints[i].angles[j]));
					deltaAngle = ControllerGameGlobals.replay.syncPoints[i + 1].angles[j] - ControllerGameGlobals.replay.syncPoints[i].angles[j];
					if (Math.abs(deltaAngle) > 20) {
						a1 = Util.NormalizeAngle(ControllerGameGlobals.replay.syncPoints[i].angles[j]);
						a2 = Util.NormalizeAngle(ControllerGameGlobals.replay.syncPoints[i + 1].angles[j]);
						if (Math.abs(a1 - a2) < Math.PI) {
							deltaAngle = a2 - a1;
						} else if (a1 > a2) {
							deltaAngle = a2 + 2 * Math.PI - a1;
						} else {
							deltaAngle = a2 - (a1 + 2 * Math.PI);
						}
					}
					innerB.push(-h[i] * z[i + 1][j] / 6 - h[i] * z[i][j] / 3 + (type == 0 ? ControllerGameGlobals.replay.syncPoints[i + 1].positions[j].x - innerA[j] : (type == 1 ? ControllerGameGlobals.replay.syncPoints[i + 1].positions[j].y - innerA[j] : deltaAngle)) / h[i]);
					innerC.push(z[i][j] / 2);
					innerD.push((z[i + 1][j] - z[i][j]) / (6 * h[i]));
				}
				As.push(innerA);
				Bs.push(innerB);
				Cs.push(innerC);
				Ds.push(innerD);
			}
			S.push(As);
			S.push(Bs);
			S.push(Cs);
			S.push(Ds);
			return S;
		}

		public SyncReplay(syncPoint:Object):void {
			var bodiesUsed:Array<any> = new Array();
			var curIndex:number = 0;
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i] instanceof ShapePart && !this.allParts[i].isStatic && !Util.ObjectInArray(this.allParts[i].GetBody(), bodiesUsed)) {
					this.allParts[i].GetBody().SetXForm(syncPoint.positions[curIndex], syncPoint.angles[curIndex]);
					curIndex++;
					bodiesUsed.push(this.allParts[i].GetBody());
				}
			}
			for (i = 0; i < ControllerGameGlobals.cannonballs.length; i++) {
				ControllerGameGlobals.cannonballs[i].SetXForm(syncPoint.cannonballPositions[i], 0);
			}
		}

		public SyncReplay2(syncPoint1:Object, syncPoint2:Object):void {
			var syncPointIndex:number = ControllerGameGlobals.replay.syncPoints.indexOf(syncPoint1);
			var bodiesUsed:Array<any> = new Array();
			var curIndex:number = 0;
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i] instanceof ShapePart && !this.allParts[i].isStatic && !Util.ObjectInArray(this.allParts[i].GetBody(), bodiesUsed)) {
					var x:number = this.replaySplineXs[0][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineXs[1][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineXs[2][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * this.replaySplineXs[3][syncPointIndex][curIndex]));
					var y:number = this.replaySplineYs[0][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineYs[1][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineYs[2][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * this.replaySplineYs[3][syncPointIndex][curIndex]));
					var angle:number = this.replaySplineAngles[0][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineAngles[1][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * (this.replaySplineAngles[2][syncPointIndex][curIndex] + (this.frameCounter - syncPoint1.frame) * this.replaySplineAngles[3][syncPointIndex][curIndex]));
					this.allParts[i].GetBody().SetXForm(Util.Vector(x, y), angle);
					curIndex++;
					bodiesUsed.push(this.allParts[i].GetBody());
				}
			}
			for (i = 0; i < ControllerGameGlobals.cannonballs.length; i++) {
				if (syncPoint1.cannonballPositions.length > i) {
					var frameDiff:number = syncPoint2.frame - syncPoint1.frame;
					var newX:number = (syncPoint1.cannonballPositions[i].x * (syncPoint2.frame - this.frameCounter) + syncPoint2.cannonballPositions[i].x * (this.frameCounter - syncPoint1.frame)) / frameDiff;
					var newY:number = (syncPoint1.cannonballPositions[i].y * (syncPoint2.frame - this.frameCounter) + syncPoint2.cannonballPositions[i].y * (this.frameCounter - syncPoint1.frame)) / frameDiff;
					ControllerGameGlobals.cannonballs[i].SetXForm(Util.Vector(newX, newY), 0);
				} else {
					ControllerGameGlobals.cannonballs[i].SetXForm(syncPoint2.cannonballPositions[i], 0);
				}
			}
		}

		public IsPaused():boolean {
			return this.paused;
		}

		public World2ScreenX(x:number):number {
			return x * this.m_physScale - this.draw.m_drawXOff;
		}

		public World2ScreenY(y:number):number {
			return y * this.m_physScale - this.draw.m_drawYOff;
		}

		public Screen2WorldX(x:number):number {
			return (x + this.draw.m_drawXOff) / this.m_physScale;
		}

		public Screen2WorldY(y:number):number {
			return (y + this.draw.m_drawYOff) / this.m_physScale;
		}

		protected ChallengeOver():boolean {
			throw new IllegalOperationError("abstract ControllerGameGlobals.ChallengeOver() called");
		}

		protected WonChallenge():boolean {
			return false;
		}

		protected LostChallenge():boolean {
			return false;
		}

		public GetScore():number {
			throw new IllegalOperationError("abstract ControllerGameGlobals.GetScore() called");
		}

		public ContactAdded(point:b2ContactPoint):void {

		}

		protected GetBuildingArea():b2AABB {
			throw new IllegalOperationError("abstract ControllerGameGlobals.GetBuildingArea() called");
		}

		protected GetBuildingAreaNumber(i:number):b2AABB {
			return this.GetBuildingArea();
		}

		protected NumBuildingAreas():number {
			return 1;
		}

		public GetBoxForConditions():void {
			this.boxText.visible = true;
			this.curAction = ControllerGameGlobals.DRAWING_BOX;
			this.actionStep = 0;
			this.selectingCondition = true;
		}

		public GetHorizontalLineForConditions():void {
			this.horizLineText.visible = true;
			this.curAction = ControllerGameGlobals.DRAWING_HORIZONTAL_LINE;
			this.actionStep = 0;
			this.selectingCondition = true;
		}

		public GetVerticalLineForConditions():void {
			this.vertLineText.visible = true;
			this.curAction = ControllerGameGlobals.DRAWING_VERTICAL_LINE;
			this.actionStep = 0;
			this.selectingCondition = true;
		}

		public GetShapeForConditions():void {
			if (!this.m_conditionsDialog.shape1) this.selectedParts = new Array();
			this.shapeText.visible = true;
			this.curAction = ControllerGameGlobals.SELECTING_SHAPE;
			this.selectingCondition = true;
		}

		protected CheckIfPartsFit():void {
			var partsToCheck:Array<any> = this.allParts.filter(this.PartIsEditable);
			var numAreas:number = this.NumBuildingAreas();

			this.partsFit = true;

			if (this instanceof ControllerSandbox && !(this instanceof ControllerChallenge)) return;
			if (this instanceof ControllerChallenge && !ControllerChallenge.playChallengeMode) return;
			if (numAreas == 0) return;

			// Make sure the parts fit in the allowed building area
			var minX:number;
			var maxX:number;
			var minY:number;
			var maxY:number;
			for (var i:number = 0; i < partsToCheck.length; i++) {
				var partFits:boolean = false;
				for (var j:number = 0; j < numAreas; j++) {
					var buildingArea:b2AABB = this.GetBuildingAreaNumber(j);
					if (partsToCheck[i] instanceof Circle) {
						minX = partsToCheck[i].centerX - partsToCheck[i].radius;
						maxX = partsToCheck[i].centerX + partsToCheck[i].radius;
						minY = partsToCheck[i].centerY - partsToCheck[i].radius;
						maxY = partsToCheck[i].centerY + partsToCheck[i].radius;
					} else if (partsToCheck[i] instanceof Rectangle || partsToCheck[i] instanceof Triangle || partsToCheck[i] instanceof Cannon) {
						var verts:Array<any> = partsToCheck[i].GetVertices();
						minX = Number.MAX_VALUE;
						minY = Number.MAX_VALUE;
						maxX = -Number.MAX_VALUE;
						maxY = -Number.MAX_VALUE;
						for (var k:number = 0; k < verts.length; k++) {
							minX = Math.min(minX, verts[k].x);
							maxX = Math.max(maxX, verts[k].x);
							minY = Math.min(minY, verts[k].y);
							maxY = Math.max(maxY, verts[k].y);
						}
					} else {
						minX = Number.MAX_VALUE;
						minY = Number.MAX_VALUE;
						maxX = -Number.MAX_VALUE;
						maxY = -Number.MAX_VALUE;
					}
					if (minX >= buildingArea.lowerBound.x && minY >= buildingArea.lowerBound.y && maxX < buildingArea.upperBound.x && maxY < buildingArea.upperBound.y) {
						partFits = true;
						break;
					}
				}
				if (!partFits) {
					this.partsFit = false;
					break;
				}
			}
		}

		protected HandleKey():void {
			// keyboard input for motors/pistons
			if (!this.paused) {
				if (ControllerGameGlobals.playingReplay) {
					if (ControllerGameGlobals.replay.Update(this.frameCounter)) {
						this.pauseButton(new MouseEvent(""));
					}
				}
				for (var i:number = 0; i < this.allParts.length; i++) {
					this.allParts[i].Update(this.m_world);
				}
			} else if (!this.simStarted && !this.m_sidePanel.EnteringInput()) {
				if (Input.isKeyDown(37)) {
					this.draw.m_drawXOff -= 10;
					this.hasPanned = true;
				}
				if (Input.isKeyDown(39)) {
					this.draw.m_drawXOff += 10;
					this.hasPanned = true;
				}
				if (Input.isKeyDown(38)) {
					this.draw.m_drawYOff -= 10;
					this.hasPanned = true;
				}
				if (Input.isKeyDown(40)) {
					this.draw.m_drawYOff += 10;
					this.hasPanned = true;
				}
			}
		}

		protected CenterOnLoadedRobot():void {
			var cameraPart:ShapePart = null;
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i] instanceof ShapePart && this.allParts[i].isCameraFocus) cameraPart = this.allParts[i];
			}
			if (!cameraPart) {
				for (i = 0; i < this.allParts.length; i++) {
					this.allParts[i].checkedCollisionGroup = false;
				}
				for (i = 0; i < this.allParts.length; i++) {
					if (this.allParts[i] instanceof ShapePart) this.allParts[i].SetCollisionGroup(-(i + 1));
				}
				cameraPart = this.FindCenterOfRobot();
			}
			if (cameraPart) {
				var oldX:number = this.draw.m_drawXOff;
				var oldY:number = this.draw.m_drawYOff;
				this.draw.m_drawXOff = cameraPart.centerX * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_X;
				this.draw.m_drawYOff = cameraPart.centerY * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_Y;
				if (oldX != this.draw.m_drawXOff || oldY != this.draw.m_drawYOff) this.hasPanned = true;
			}
		}

		protected HandleCamera():void {
			if (this.cameraPart) {
				var oldX:number = this.draw.m_drawXOff;
				var oldY:number = this.draw.m_drawYOff;
				this.draw.m_drawXOff = this.cameraPart.GetBody().GetWorldCenter().x * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_X;
				this.draw.m_drawYOff = this.cameraPart.GetBody().GetWorldCenter().y * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_Y;
				if (isNaN(this.draw.m_drawXOff) || isNaN(this.draw.m_drawYOff)) {
					this.draw.m_drawXOff = oldX;
					this.draw.m_drawYOff = oldY;
				}
				if (oldX != this.draw.m_drawXOff || oldY != this.draw.m_drawYOff) this.hasPanned = true;
			}
		}

		public MouseDrag():void {
			if (!this.simStarted) {
				// mouse press
				if (Input.mouseDown && ControllerGameGlobals.mouseYWorld >= 100 && !this.m_sidePanel.sliderDown && !this.m_guiMenu.MouseOverMenu(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld) && (ControllerGameGlobals.mouseXWorld >= 120 || !this.m_sidePanel.visible) && (ControllerGameGlobals.mouseXWorld >= 230 || ControllerGameGlobals.mouseYWorld >= 340 || !this.m_sidePanel.ColourWindowShowing()) && this.curAction != ControllerGameGlobals.BOX_SELECTING && this.curAction != ControllerGameGlobals.DRAWING_BUILD_BOX && this.curAction != ControllerGameGlobals.DRAWING_BOX && this.curAction != ControllerGameGlobals.DRAWING_HORIZONTAL_LINE && this.curAction != ControllerGameGlobals.DRAWING_VERTICAL_LINE) {
					if (!this.m_tutorialDialog || !this.m_tutorialDialog.MouseOver(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld)) {
						var shapeOrJoint:Part = this.GetPartAtMouse();

						if (!ControllerGameGlobals.wasMouseDown && ControllerGameGlobals.curRobotEditable && shapeOrJoint instanceof ShapePart) {
							var part:ShapePart = (shapeOrJoint as ShapePart);
							// rotation
							if (this.draggingPart == null && (this.curAction == -1 || this.curAction == ControllerGameGlobals.SELECTING_SHAPE)) {
								if (this.MouseOverSelectedPart()) {
									this.delayedSelection = true;
								} else {
									if (!Util.ObjectInArray(part, this.selectedParts)) {
										if (!Input.isKeyDown(16)) {
											this.selectedParts = new Array();
										}
										this.selectedParts.push(part);
									} else if (Input.isKeyDown(16)) {
										this.selectedParts = Util.RemoveFromArray(part, this.selectedParts);
									}
									this.redrawRobot = true;
								}
								this.draggingPart = this.selectedParts[0];
								this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
								this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
								this.draggingParts = new Array();
								for (var i:number = 0; i < this.selectedParts.length; i++) {
									this.draggingParts = Util.RemoveDuplicates(this.draggingParts.concat(this.selectedParts[i].GetAttachedParts()));
								}
								for (i = 0; i < this.draggingParts.length; i++) {
									if (this.draggingParts[i] instanceof ShapePart || this.draggingParts[i] instanceof Thrusters) {
										this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].centerX;
										this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].centerY;
									} else if (this.draggingParts[i] instanceof JointPart) {
										this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].anchorX;
										this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].anchorY;
									} else {
										this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].x;
										this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].y;
									}
								}
							}
						} else if (!ControllerGameGlobals.wasMouseDown && ControllerGameGlobals.curRobotEditable && shapeOrJoint instanceof JointPart && this.draggingPart == null && (this.curAction == -1 || this.curAction == ControllerGameGlobals.SELECTING_SHAPE)) {
							if (this.MouseOverSelectedPart()) {
								this.delayedSelection = true;
							} else {
								if (!Util.ObjectInArray(shapeOrJoint, this.selectedParts)) {
									if (!Input.isKeyDown(16)) {
										this.selectedParts = new Array();
									}
									this.selectedParts.push(shapeOrJoint);
								} else if (Input.isKeyDown(16)) {
									this.selectedParts = Util.RemoveFromArray(shapeOrJoint, this.selectedParts);
								}
								this.redrawRobot = true;
							}
							this.draggingPart = shapeOrJoint;
							this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
							this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
							this.draggingParts = new Array();
							for (i = 0; i < this.selectedParts.length; i++) {
								this.draggingParts = Util.RemoveDuplicates(this.draggingParts.concat(this.selectedParts[i].GetAttachedParts()));
							}
							for (i = 0; i < this.draggingParts.length; i++) {
								if (this.draggingParts[i] instanceof ShapePart || this.draggingParts[i] instanceof Thrusters) {
									this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].centerX;
									this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].centerY;
								} else if (this.draggingParts[i] instanceof JointPart) {
									this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].anchorX;
									this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].anchorY;
								} else {
									this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].x;
									this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].y;
								}
							}
						} else if (!ControllerGameGlobals.wasMouseDown && ControllerGameGlobals.curRobotEditable && shapeOrJoint instanceof TextPart && this.draggingPart == null && (this.curAction == -1 || this.curAction == ControllerGameGlobals.SELECTING_SHAPE)) {
							if (this.MouseOverSelectedPart()) {
								this.delayedSelection = true;
							} else {
								if (!Util.ObjectInArray(shapeOrJoint, this.selectedParts)) {
									if (!Input.isKeyDown(16)) {
										this.selectedParts = new Array();
									}
									this.selectedParts.push(shapeOrJoint);
								} else if (Input.isKeyDown(16)) {
									this.selectedParts = Util.RemoveFromArray(shapeOrJoint, this.selectedParts);
								}
								this.redrawRobot = true;
							}
							this.draggingPart = shapeOrJoint;
							this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
							this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
							if ((shapeOrJoint as TextPart).InsideMoveBox(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys, this.m_physScale, true)) {
								this.curAction = ControllerGameGlobals.RESIZING_TEXT;
							} else {
								this.draggingParts = new Array();
								for (i = 0; i < this.selectedParts.length; i++) {
									this.draggingParts = Util.RemoveDuplicates(this.draggingParts.concat(this.selectedParts[i].GetAttachedParts()));
								}
								for (i = 0; i < this.draggingParts.length; i++) {
									if (this.draggingParts[i] instanceof ShapePart || this.draggingParts[i] instanceof Thrusters) {
										this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].centerX;
										this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].centerY;
									} else if (this.draggingParts[i] instanceof JointPart) {
										this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].anchorX;
										this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].anchorY;
									} else {
										this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].x;
										this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].y;
									}
								}
							}
						} else if (!ControllerGameGlobals.wasMouseDown && ControllerGameGlobals.curRobotEditable && shapeOrJoint instanceof Thrusters && this.draggingPart == null && (this.curAction == -1 || this.curAction == ControllerGameGlobals.SELECTING_SHAPE)) {
							if (this.MouseOverSelectedPart()) {
								this.delayedSelection = true;
							} else {
								if (!Util.ObjectInArray(shapeOrJoint, this.selectedParts)) {
									if (!Input.isKeyDown(16)) {
										this.selectedParts = new Array();
									}
									this.selectedParts.push(shapeOrJoint);
								} else if (Input.isKeyDown(16)) {
									this.selectedParts = Util.RemoveFromArray(shapeOrJoint, this.selectedParts);
								}
								this.redrawRobot = true;
							}
							this.draggingPart = shapeOrJoint;
							this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
							this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
							this.draggingParts = new Array();
							for (i = 0; i < this.selectedParts.length; i++) {
								this.draggingParts = Util.RemoveDuplicates(this.draggingParts.concat(this.selectedParts[i].GetAttachedParts()));
							}
							for (i = 0; i < this.draggingParts.length; i++) {
								if (this.draggingParts[i] instanceof ShapePart || this.draggingParts[i] instanceof Thrusters) {
									this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].centerX;
									this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].centerY;
								} else if (this.draggingParts[i] instanceof JointPart) {
									this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].anchorX;
									this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].anchorY;
								} else {
									this.draggingParts[i].dragXOff = ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].x;
									this.draggingParts[i].dragYOff = ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].y;
								}
							}
						} else if (this.draggingPart == null && this.rotatingPart == null && (this.curAction == -1 || this.curAction == ControllerGameGlobals.SELECTING_SHAPE)) {
							if (Input.isKeyDown(16) && ControllerGameGlobals.curRobotEditable) {
								this.curAction = ControllerGameGlobals.BOX_SELECTING;
								this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
								this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
							} else {
								// dragging the world around
								var oldX:number = this.draw.m_drawXOff;
								var oldY:number = this.draw.m_drawYOff;
								this.draw.m_drawXOff -= (ControllerGameGlobals.mouseXWorld - ControllerGameGlobals.prevMouseXWorld);
								this.draw.m_drawYOff -= (ControllerGameGlobals.mouseYWorld - ControllerGameGlobals.prevMouseYWorld);
								if (oldX != this.draw.m_drawXOff || oldY != this.draw.m_drawYOff) this.hasPanned = true;
							}

							this.selectedParts = new Array();
							this.redrawRobot = true;
						}
					}
				}

				if (Input.mouseDown && !this.m_sidePanel.sliderDown && !this.m_guiMenu.MouseOverMenu(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld) && ControllerGameGlobals.mouseYWorld >= 100 && (ControllerGameGlobals.mouseXWorld >= 120 || !this.m_sidePanel.visible) && (ControllerGameGlobals.mouseXWorld >= 230 || ControllerGameGlobals.mouseYWorld >= 340 || !this.m_sidePanel.ColourWindowShowing()) && this.curAction != ControllerGameGlobals.BOX_SELECTING) {
					if (!this.m_tutorialDialog || !this.m_tutorialDialog.MouseOver(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld)) {
						this.RefreshSidePanel();
					}
				}

				if (!Input.mouseDown) this.draggingTutorial = false;
				if (this.draggingTutorial) {
					this.m_tutorialDialog.x = ControllerGameGlobals.mouseXWorld - this.initDragX;
					this.m_tutorialDialog.y = ControllerGameGlobals.mouseYWorld - this.initDragY;
				}

				// drag a part
				if (this.draggingPart != null && this.curAction != ControllerGameGlobals.RESIZING_TEXT) {
					for (i = 0; i < this.draggingParts.length; i++) {
						this.draggingParts[i].Move(ControllerGameGlobals.mouseXWorldPhys - this.draggingParts[i].dragXOff, ControllerGameGlobals.mouseYWorldPhys - this.draggingParts[i].dragYOff);
					}
					ControllerGameGlobals.curRobotID = "";
				}

				// rotate a part
				if (this.curAction == ControllerGameGlobals.ROTATE && this.rotatingPart != null) {
					var newAngle:number = Math.atan2(ControllerGameGlobals.mouseYWorldPhys - this.rotatingPart.centerY, ControllerGameGlobals.mouseXWorldPhys - this.rotatingPart.centerX);
					for (i = 0; i < this.rotatingParts.length; i++) {
						this.rotatingParts[i].RotateAround(this.rotatingPart.centerX, this.rotatingPart.centerY, newAngle - this.initRotatingAngle);
					}
					ControllerGameGlobals.curRobotID = "";
				}

				if (this.curAction == ControllerGameGlobals.SELECTING_SHAPE && this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart && this.selectedParts[0] != this.m_conditionsDialog.shape1) {
					this.m_conditionsDialog.visible = true;
					this.m_fader.visible = true;
					this.curAction = -1;
					this.m_sidePanel.visible = false;
					this.shapeText.visible = false;
					this.selectingCondition = false;
					this.m_conditionsDialog.FinishSelectingForCondition(this.selectedParts[0]);
				}

				// scale parts?
				if (this.curAction == ControllerGameGlobals.RESIZING_SHAPES) {
					// determine scale factor
					var scaleFactor:number = (ControllerGameGlobals.mouseXWorld - this.firstClickX);
					if (scaleFactor >= 0) {
						scaleFactor /= 75;
						scaleFactor += 1;
					} else {
						scaleFactor /= 25;
						scaleFactor -= 1;
						scaleFactor = -1 / scaleFactor;
					}
					for (i = 0; i < this.draggingParts.length; i++) {
						if (this.draggingParts[i] instanceof Circle) {
							if (this.draggingParts[i].initRadius * scaleFactor > Circle.MAX_RADIUS) scaleFactor = Circle.MAX_RADIUS / this.draggingParts[i].initRadius;
							if (this.draggingParts[i].initRadius * scaleFactor < Circle.MIN_RADIUS) scaleFactor = Circle.MIN_RADIUS / this.draggingParts[i].initRadius;
						} else if (this.draggingParts[i] instanceof Rectangle) {
							if (this.draggingParts[i].initW * scaleFactor > Rectangle.MAX_WIDTH) scaleFactor = Rectangle.MAX_WIDTH / this.draggingParts[i].initW;
							if (this.draggingParts[i].initW * scaleFactor < Rectangle.MIN_WIDTH) scaleFactor = Rectangle.MIN_WIDTH / this.draggingParts[i].initW;
							if (this.draggingParts[i].initH * scaleFactor > Rectangle.MAX_WIDTH) scaleFactor = Rectangle.MAX_WIDTH / this.draggingParts[i].initH;
							if (this.draggingParts[i].initH * scaleFactor < Rectangle.MIN_WIDTH) scaleFactor = Rectangle.MIN_WIDTH / this.draggingParts[i].initH;
						} else if (this.draggingParts[i] instanceof Triangle) {
							var length1:number = Util.GetDist(this.draggingParts[i].initX1, this.draggingParts[i].initY1, this.draggingParts[i].initX2, this.draggingParts[i].initY2);
							if (length1 * scaleFactor > Triangle.MAX_SIDE_LENGTH) scaleFactor = Triangle.MAX_SIDE_LENGTH / length1;
							if (length1 * scaleFactor < Triangle.MIN_SIDE_LENGTH) scaleFactor = Triangle.MIN_SIDE_LENGTH / length1;
							var length2:number = Util.GetDist(this.draggingParts[i].initX1, this.draggingParts[i].initY1, this.draggingParts[i].initX3, this.draggingParts[i].initY3);
							if (length2 * scaleFactor > Triangle.MAX_SIDE_LENGTH) scaleFactor = Triangle.MAX_SIDE_LENGTH / length2;
							if (length2 * scaleFactor < Triangle.MIN_SIDE_LENGTH) scaleFactor = Triangle.MIN_SIDE_LENGTH / length2;
							var length3:number = Util.GetDist(this.draggingParts[i].initX2, this.draggingParts[i].initY2, this.draggingParts[i].initX3, this.draggingParts[i].initY3);
							if (length3 * scaleFactor > Triangle.MAX_SIDE_LENGTH) scaleFactor = Triangle.MAX_SIDE_LENGTH / length3;
							if (length3 * scaleFactor < Triangle.MIN_SIDE_LENGTH) scaleFactor = Triangle.MIN_SIDE_LENGTH / length3;
						} else if (this.draggingParts[i] instanceof Cannon) {
							if (this.draggingParts[i].initW * scaleFactor > Cannon.MAX_WIDTH) scaleFactor = Cannon.MAX_WIDTH / this.draggingParts[i].initW;
							if (this.draggingParts[i].initW * scaleFactor < Cannon.MIN_WIDTH) scaleFactor = Cannon.MIN_WIDTH / this.draggingParts[i].initW;
						}
					}

					// scale the parts
					for (i = 0; i < this.draggingParts.length; i++) {
						if (this.draggingParts[i] instanceof Circle) {
							this.draggingParts[i].radius = this.draggingParts[i].initRadius * scaleFactor;
							this.draggingParts[i].Move(this.initDragX + this.draggingParts[i].dragXOff * scaleFactor, this.initDragY + this.draggingParts[i].dragYOff * scaleFactor);
						} else if (this.draggingParts[i] instanceof Rectangle) {
							this.draggingParts[i].w = this.draggingParts[i].initW * scaleFactor;
							this.draggingParts[i].h = this.draggingParts[i].initH * scaleFactor;
							this.draggingParts[i].Move(this.initDragX + this.draggingParts[i].dragXOff * scaleFactor, this.initDragY + this.draggingParts[i].dragYOff * scaleFactor);
						} else if (this.draggingParts[i] instanceof Triangle) {
							this.draggingParts[i].centerX = this.initDragX + this.draggingParts[i].dragXOff * scaleFactor;
							this.draggingParts[i].centerY = this.initDragY + this.draggingParts[i].dragYOff * scaleFactor;
							this.draggingParts[i].x1 = this.draggingParts[i].centerX + this.draggingParts[i].initX1 * scaleFactor;
							this.draggingParts[i].y1 = this.draggingParts[i].centerY + this.draggingParts[i].initY1 * scaleFactor;
							this.draggingParts[i].x2 = this.draggingParts[i].centerX + this.draggingParts[i].initX2 * scaleFactor;
							this.draggingParts[i].y2 = this.draggingParts[i].centerY + this.draggingParts[i].initY2 * scaleFactor;
							this.draggingParts[i].x3 = this.draggingParts[i].centerX + this.draggingParts[i].initX3 * scaleFactor;
							this.draggingParts[i].y3 = this.draggingParts[i].centerY + this.draggingParts[i].initY3 * scaleFactor;
						} else if (this.draggingParts[i] instanceof Cannon) {
							this.draggingParts[i].w = this.draggingParts[i].initW * scaleFactor;
							this.draggingParts[i].Move(this.initDragX + this.draggingParts[i].dragXOff * scaleFactor, this.initDragY + this.draggingParts[i].dragYOff * scaleFactor);
						} else if (this.draggingParts[i] instanceof JointPart) {
							this.draggingParts[i].Move(this.initDragX + this.draggingParts[i].dragXOff * scaleFactor, this.initDragY + this.draggingParts[i].dragYOff * scaleFactor);
							if (this.draggingParts[i] instanceof PrismaticJoint) {
								this.draggingParts[i].initLength = this.draggingParts[i].initInitLength * scaleFactor;
							}
						} else if (this.draggingParts[i] instanceof TextPart) {
							this.draggingParts[i].w = this.draggingParts[i].initW * scaleFactor;
							this.draggingParts[i].h = this.draggingParts[i].initH * scaleFactor;
							this.draggingParts[i].x = this.initDragX + this.draggingParts[i].dragXOff * scaleFactor - this.draggingParts[i].w / 2;
							this.draggingParts[i].y = this.initDragY + this.draggingParts[i].dragYOff * scaleFactor - this.draggingParts[i].h / 2;
						} else if (this.draggingParts[i] instanceof Thrusters) {
							this.draggingParts[i].Move(this.initDragX + this.draggingParts[i].dragXOff * scaleFactor, this.initDragY + this.draggingParts[i].dragYOff * scaleFactor);
						}
					}
					this.mostRecentScaleFactor = scaleFactor;
				}

				// finalize a joint
				if (this.curAction == ControllerGameGlobals.FINALIZING_JOINT && Util.GetDist(this.candidateJointX, this.candidateJointY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys) > 0.5 * 30 / this.m_physScale) {
					if (this.candidateJointType == ControllerGameGlobals.NEW_REVOLUTE_JOINT) {
						var rjoint:RevoluteJoint = new RevoluteJoint(this.potentialJointPart1, this.potentialJointPart2, this.candidateJointX, this.candidateJointY);
						if (this.copiedJoint instanceof RevoluteJoint) rjoint.SetJointProperties(this.copiedJoint as RevoluteJoint);
						this.allParts.push(rjoint);
						this.AddAction(new CreateAction(rjoint));
						this.m_sidePanel.ShowJointPanel(rjoint);
						this.selectedParts = new Array();
						this.selectedParts.push(rjoint);
						this.curAction = -1;
						this.potentialJointPart1.highlightForJoint = false;
						this.potentialJointPart2.highlightForJoint = false;
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayJointSound();
					} else if (this.candidateJointType == ControllerGameGlobals.NEW_FIXED_JOINT) {
						var fjoint:JointPart = new FixedJoint(this.potentialJointPart1, this.potentialJointPart2, this.candidateJointX, this.candidateJointY);
						this.allParts.push(fjoint);
						this.AddAction(new CreateAction(fjoint));
						this.m_sidePanel.ShowJointPanel(fjoint);
						this.selectedParts = new Array();
						this.selectedParts.push(fjoint);
						this.curAction = -1;
						this.potentialJointPart1.highlightForJoint = false;
						this.potentialJointPart2.highlightForJoint = false;
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayJointSound();
					} else if (this.candidateJointType == ControllerGameGlobals.NEW_THRUSTERS) {
						var t:Thrusters = new Thrusters(this.potentialJointPart1, this.candidateJointX, this.candidateJointY);
						if (this.copiedThrusters) {
							t.strength = this.copiedThrusters.strength;
							t.angle = this.copiedThrusters.angle;
							t.thrustKey = this.copiedThrusters.thrustKey;
							t.autoOn = this.copiedThrusters.autoOn;
						}
						this.allParts.push(t);
						this.AddAction(new CreateAction(t));
						this.m_sidePanel.ShowThrustersPanel(t);
						this.selectedParts = new Array();
						this.selectedParts.push(t);
						this.curAction = -1;
						this.potentialJointPart1.highlightForJoint = false;
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayJointSound();
					} else if (this.candidateJointType == ControllerGameGlobals.NEW_PRISMATIC_JOINT && this.actionStep == 0) {
						this.jointPart = this.potentialJointPart1;
						this.firstClickX = this.candidateJointX;
						this.firstClickY = this.candidateJointY;
						this.curAction = ControllerGameGlobals.NEW_PRISMATIC_JOINT;
						this.actionStep++;
						this.PlayJointSound();
					} else if (this.candidateJointType == ControllerGameGlobals.NEW_PRISMATIC_JOINT) {
						var pjoint:PrismaticJoint = new PrismaticJoint(this.jointPart, this.potentialJointPart1, this.firstClickX, this.firstClickY, this.candidateJointX, this.candidateJointY);
						if (this.copiedJoint instanceof PrismaticJoint) pjoint.SetJointProperties(this.copiedJoint as PrismaticJoint);
						this.allParts.push(pjoint);
						this.AddAction(new CreateAction(pjoint));
						this.m_sidePanel.ShowJointPanel(pjoint);
						this.selectedParts = new Array();
						this.selectedParts.push(pjoint);
						this.curAction = -1;
						this.jointPart.highlightForJoint = false;
						this.potentialJointPart1.highlightForJoint = false;
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayJointSound();
					}
				}

				// resize text
				if (this.curAction == ControllerGameGlobals.RESIZING_TEXT) {
					(this.draggingPart as TextPart).Resize(ControllerGameGlobals.mouseXWorldPhys - this.initDragX, ControllerGameGlobals.mouseYWorldPhys - this.initDragY);
					this.redrawRobot = true;
				}
			} else if (!this.paused && (((this instanceof ControllerSandbox) && !(this instanceof ControllerChallenge)) || ((this instanceof ControllerChallenge) && ControllerChallenge.challenge.mouseDragAllowed))) {
				// mouse press
				if (Input.mouseDown && !this.m_mouseJoint) {
					var body:b2Body = this.GetBodyAtMouse();

					if (!ControllerGameGlobals.playingReplay && body) {
						var md:b2MouseJointDef = new b2MouseJointDef();
						md.body1 = this.m_world.m_groundBody;
						md.body2 = body;
						md.target.Set(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
						md.maxForce = 300.0 * body.m_mass;
						md.timeStep = this.m_timeStep;
						this.m_mouseJoint = this.m_world.CreateJoint(md) as b2MouseJoint;
						body.WakeUp();
					}
				}

				// mouse move
				if (this.m_mouseJoint) {
					var p2:b2Vec2 = new b2Vec2(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
					this.m_mouseJoint.SetTarget(p2);
				}

				// mouse release
				if (!Input.mouseDown) {
					if (this.m_mouseJoint) {
						this.m_world.DestroyJoint(this.m_mouseJoint);
						this.m_mouseJoint = null;
					}
				}
			}

			if (this.simStarted && Input.mouseDown && !this.m_guiMenu.MouseOverMenu(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld) && ControllerGameGlobals.mouseYWorld >= 100 && (ControllerGameGlobals.mouseXWorld >= 120 || !this.m_sidePanel.visible) && (ControllerGameGlobals.mouseXWorld >= 230 || ControllerGameGlobals.mouseYWorld >= 340 || !this.m_sidePanel.ColourWindowShowing()) && this.curAction != ControllerGameGlobals.BOX_SELECTING && !this.m_mouseJoint) {
				if ((!this.m_tutorialDialog || !this.m_tutorialDialog.MouseOver(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld)) && !this.draggingTutorial) {
					// dragging the world around
					var change:boolean = (ControllerGameGlobals.mouseXWorld != ControllerGameGlobals.prevMouseXWorld || ControllerGameGlobals.mouseYWorld != ControllerGameGlobals.prevMouseYWorld);
					this.draw.m_drawXOff -= (ControllerGameGlobals.mouseXWorld - ControllerGameGlobals.prevMouseXWorld);
					this.draw.m_drawYOff -= (ControllerGameGlobals.mouseYWorld - ControllerGameGlobals.prevMouseYWorld);
					this.autoPanning = false;

					if (change) {
						this.hasPanned = true;
						this.cameraMovements.push(new CameraMovement(this.frameCounter, this.draw.m_drawXOff, this.draw.m_drawYOff, this.m_physScale));
					}
				}
			}

			// make sure they haven't gone beyond the boundaries
			var minY:number = this.Screen2WorldY(85);
			var maxY:number = this.Screen2WorldY(600);
			if (minY < this.GetMinY()) {
				this.draw.m_drawYOff += this.World2ScreenY(this.GetMinY()) - this.World2ScreenY(minY);
			} else if (maxY > this.GetMaxY()) {
				this.draw.m_drawYOff -= this.World2ScreenY(maxY) - this.World2ScreenY(this.GetMaxY());
			}

			var minX:number = this.Screen2WorldX(0);
			var maxX:number = this.Screen2WorldX(800);
			if (minX < this.GetMinX()) {
				this.draw.m_drawXOff += this.World2ScreenX(this.GetMinX()) - this.World2ScreenX(minX);
				this.hasPanned = true;
			} else if (maxX > this.GetMaxX()) {
				this.draw.m_drawXOff -= this.World2ScreenX(maxX) - this.World2ScreenX(this.GetMaxX());
				this.hasPanned = true;
			}

			ControllerGameGlobals.wasMouseDown = Input.mouseDown;
		}

		public keyInput(key:number, up:boolean):void {
			var recorded:boolean = false;
			for (var i:number = 0; i < this.allParts.length; i++) {
				this.allParts[i].KeyInput(key, up, ControllerGameGlobals.playingReplay);
				if (!recorded && up && !ControllerGameGlobals.playingReplay && ((this.allParts[i] instanceof TextPart && key == this.allParts[i].displayKey) || (this.allParts[i] instanceof Cannon && key == this.allParts[i].fireKey))) {
					recorded = true;
					this.keyPresses.push(new KeyPress(this.frameCounter, key));
				}
			}
		}

		public keyPress(key:number, up:boolean):void {
			if (!this.paused && !ControllerGameGlobals.playingReplay) {
				this.keyInput(key, up);
			}

			if (!this.simStarted && !this.m_sidePanel.EnteringInput() && !this.m_fader.visible) {
				if (up && key == 49) {
					this.circleButton(new MouseEvent(""));
				} else if (up && key == 50) {
					this.rectButton(new MouseEvent(""));
				} else if (up && key == 51) {
					this.triangleButton(new MouseEvent(""));
				} else if (up && key == 52) {
					this.fjButton(new MouseEvent(""));
				} else if (up && key == 53) {
					this.rjButton(new MouseEvent(""));
				} else if (up && key == 54) {
					this.pjButton(new MouseEvent(""));
				} else if (up && key == 55) {
					this.textButton(new MouseEvent(""));
				} else if (up && key == 82) {
					this.rotateButton(new MouseEvent(""));
				} else if (up && key == 88) {
					this.cutButton(new MouseEvent(""));
				} else if (up && key == 67) {
					this.copyButton(new MouseEvent(""));
				} else if (up && key == 86) {
					this.pasteButton(new MouseEvent(""));
				} else if (up && (key == 8 || key == 46)) {
					if (this.selectedParts.length == 1 && !this.selectedParts[0] instanceof TextPart) this.deleteButton(new MouseEvent(""));
					else this.multiDeleteButton(new MouseEvent(""));
				} else if (up && key == 89) {
					this.redoButton(new MouseEvent(""));
				} else if (up && key == 90) {
					this.undoButton(new MouseEvent(""));
				} else if (up && (key == 107 || key == 187)) {
					this.zoomInButton(new MouseEvent(""));
				} else if (up && (key == 109 || key == 189)) {
					this.zoomOutButton(new MouseEvent(""));
				} else if (up && key == 80) {
					this.playButton(new MouseEvent(""));
				}
			}

			if (up && key == 27) {
				if (this.m_chooserWindow && this.m_chooserWindow.visible && !this.m_chooserWindow.fader.visible) {
					this.m_chooserWindow.visible = false;
					this.m_fader.visible = false;
				}
				if (this.m_challengeWindow && this.m_challengeWindow.visible && !this.m_challengeWindow.fader.visible) {
					this.m_challengeWindow.visible = false;
					this.m_fader.visible = false;
				}
				if (this.m_sidePanel.visible && !this.m_fader.visible) {
					this.m_sidePanel.visible = false;
				}
				if (this.m_scoreWindow && this.m_scoreWindow.visible) {
					this.m_scoreWindow.visible = false;
					this.m_fader.visible = false;
				}
				if (this.m_progressDialog && this.m_progressDialog.visible) {
					this.m_progressDialog.visible = false;
					if (this.m_chooserWindow && this.m_chooserWindow.visible) {
						this.m_chooserWindow.HideFader();
					} else if (this.m_challengeWindow && this.m_challengeWindow.visible) {
						this.m_challengeWindow.HideFader();
					} else if (this.m_loginWindow && this.m_loginWindow.visible) {
						this.m_loginWindow.HideFader();
					} else if (this.m_newUserWindow && this.m_newUserWindow.visible) {
						this.m_newUserWindow.HideFader();
					} else {
						this.m_fader.visible = false;
					}
				}
				if (this.m_tutorialDialog && this.m_tutorialDialog.visible) {
					this.m_tutorialDialog.closeWindow(new MouseEvent(""));
				}
				if (this.m_linkDialog && this.m_linkDialog.visible) {
					this.m_linkDialog.visible = false;
					if (this.m_chooserWindow && this.m_chooserWindow.visible) {
						this.m_chooserWindow.HideFader();
					} else {
						this.m_fader.visible = false;
					}
				}
				if (this.m_loginWindow && this.m_loginWindow.visible && !this.m_loginWindow.fader.visible) {
					this.m_loginWindow.cancelButtonPressed(new MouseEvent(""));
				}
				if (this.m_newUserWindow && this.m_newUserWindow.visible) {
					this.m_newUserWindow.cancelButtonPressed(new MouseEvent(""));
				}
			}
		}

		public mouseMove(x:number, y:number):void {
			Main.mouseCursor.x = x;
			Main.mouseCursor.y = y;
			Main.mouseHourglass.x = x;
			Main.mouseHourglass.y = y;
		}

		public mouseClick(up:boolean):void {
			this.m_guiMenu.MouseClick(up, ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld);
			var part:ShapePart;

			if (up && this.delayedSelection) {
				this.delayedSelection = false;
				if (ControllerGameGlobals.mouseXWorldPhys == this.initDragX && ControllerGameGlobals.mouseYWorldPhys == this.initDragY) {
					var p:Part = this.GetPartAtMouse();
					if (!Util.ObjectInArray(p, this.selectedParts)) {
						if (!Input.isKeyDown(16)) {
							this.selectedParts = new Array();
						}
						this.selectedParts.push(p);
					} else if (Input.isKeyDown(16)) {
						this.selectedParts = Util.RemoveFromArray(p, this.selectedParts);
					}
					this.redrawRobot = true;
					this.RefreshSidePanel();
				}
			}

			if (up && this.rotatingPart != null) {
				this.curAction = -1;
				this.AddAction(new RotateAction((this.rotatingPart as Part), this.rotatingParts, Util.NormalizeAngle(Math.atan2(ControllerGameGlobals.mouseYWorldPhys - this.rotatingPart.centerY, ControllerGameGlobals.mouseXWorldPhys - this.rotatingPart.centerX) - this.initRotatingAngle)));
				this.CheckIfPartsFit();
				this.rotatingPart = null;
			} else if (up && this.draggingPart != null) {
				if (!this.ignoreAClick) {
					if (this.curAction != ControllerGameGlobals.PASTE && this.curAction != ControllerGameGlobals.RESIZING_TEXT && (ControllerGameGlobals.mouseXWorldPhys != this.initDragX || ControllerGameGlobals.mouseYWorldPhys != this.initDragY)) this.AddAction(new MoveAction(this.draggingPart, this.draggingParts, ControllerGameGlobals.mouseXWorldPhys - this.initDragX, ControllerGameGlobals.mouseYWorldPhys - this.initDragY));
					if (this.curAction == ControllerGameGlobals.RESIZING_TEXT) {
						var tPart:TextPart = (this.draggingPart as TextPart);
						this.AddAction(new ResizeTextAction(tPart, tPart.x - tPart.initX, tPart.y - tPart.initY, tPart.w - tPart.initW, tPart.h - tPart.initH));
					}
					this.CheckIfPartsFit();
					if (this.curAction == ControllerGameGlobals.PASTE) {
						var hasShape:boolean = false;
						for (var i:number = 0; i < this.draggingParts.length; i++) {
							if (this.draggingParts[i] instanceof ShapePart) {
								hasShape = true;
								break;
							}
						}
						if (hasShape) this.PlayShapeSound();
					}
					if (this.curAction < 14) this.curAction = -1;
					this.draggingPart = null;
				} else {
					this.ignoreAClick = false;
				}
			} else if (!up && this.curAction == ControllerGameGlobals.RESIZING_SHAPES) {
				if (!this.ignoreAClick) {
					this.curAction = -1;
					this.AddAction(new ResizeShapesAction(this.draggingParts, this.mostRecentScaleFactor));
					this.draggingParts = new Array();
					this.CheckIfPartsFit();
				} else {
					this.ignoreAClick = false;
				}
			} else if (!up && (this.curAction == ControllerGameGlobals.DRAWING_BUILD_BOX || this.curAction == ControllerGameGlobals.DRAWING_BOX || this.curAction == ControllerGameGlobals.DRAWING_HORIZONTAL_LINE || this.curAction == ControllerGameGlobals.DRAWING_VERTICAL_LINE) && this.actionStep == 0 && ControllerGameGlobals.mouseYWorld > 100 && !this.m_guiMenu.MouseOverMenu(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld) && (!this.m_tutorialDialog || !this.m_tutorialDialog.MouseOver(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld))) {
				this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
				this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
				this.actionStep++;
			} else if ((this.curAction == ControllerGameGlobals.DRAWING_BOX || this.curAction == ControllerGameGlobals.DRAWING_HORIZONTAL_LINE || this.curAction == ControllerGameGlobals.DRAWING_VERTICAL_LINE) && this.actionStep == 1) {
				if (Math.abs(this.firstClickX - ControllerGameGlobals.mouseXWorldPhys) > 0.1 || Math.abs(this.firstClickY - ControllerGameGlobals.mouseYWorldPhys) > 0.1) {
					this.curAction = -1;
					this.m_conditionsDialog.visible = true;
					this.m_fader.visible = true;
					this.selectingCondition = false;
					this.m_conditionsDialog.FinishDrawingCondition(this.firstClickX, this.firstClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
					this.boxText.visible = false;
					this.horizLineText.visible = false;
					this.vertLineText.visible = false;
					this.redrawRobot = true;
				}
			} else if (this.curAction == ControllerGameGlobals.DRAWING_BUILD_BOX && this.actionStep == 1) {
				if (Math.abs(this.firstClickX - ControllerGameGlobals.mouseXWorldPhys) > 0.5 || Math.abs(this.firstClickY - ControllerGameGlobals.mouseYWorldPhys) > 0.5) {
					this.curAction = -1;
					var buildArea:b2AABB = new b2AABB();
					buildArea.lowerBound = Util.Vector(Math.min(this.firstClickX, ControllerGameGlobals.mouseXWorldPhys), Math.min(this.firstClickY, ControllerGameGlobals.mouseYWorldPhys));
					buildArea.upperBound = Util.Vector(Math.max(this.firstClickX, ControllerGameGlobals.mouseXWorldPhys), Math.max(this.firstClickY, ControllerGameGlobals.mouseYWorldPhys));
					ControllerChallenge.challenge.buildAreas.push(buildArea);
					this.selectedBuildArea = ControllerChallenge.challenge.buildAreas[ControllerChallenge.challenge.buildAreas.length - 1];
					this.m_sidePanel.ShowBuildBoxPanel();
					this.BuildBuildArea();
					this.redrawRobot = true;
					this.redrawBuildArea = true;
				}
			}

			if (!up && !this.draggingTutorial && this.m_tutorialDialog && this.m_tutorialDialog.MouseOver(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld)) {
				this.draggingTutorial = true;
				this.initDragX = ControllerGameGlobals.mouseXWorld - this.m_tutorialDialog.x;
				this.initDragY = ControllerGameGlobals.mouseYWorld - this.m_tutorialDialog.y;
				return;
			}
			if (!ControllerGameGlobals.curRobotEditable || ControllerGameGlobals.mouseYWorld < 100 || (ControllerGameGlobals.mouseXWorld < 120 && this.m_sidePanel.visible) || this.m_guiMenu.MouseOverMenu(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld) || (ControllerGameGlobals.mouseXWorld < 230 && ControllerGameGlobals.mouseYWorld < 340 && this.m_sidePanel.ColourWindowShowing()) || (this.m_tutorialDialog && this.m_tutorialDialog.MouseOver(ControllerGameGlobals.mouseXWorld, ControllerGameGlobals.mouseYWorld))) return;

			if (up && this.selectedParts.length == 1 && ControllerGameGlobals.centerOnSelected) {
				this.CenterOnSelected();
			} else if (this.selectedParts.length == 0 && this.curAction == -1 && this instanceof ControllerChallenge && !ControllerChallenge.playChallengeMode) {
				for (i = 0; i < ControllerChallenge.challenge.buildAreas.length; i++) {
					if (ControllerGameGlobals.mouseXWorldPhys > ControllerChallenge.challenge.buildAreas[i].lowerBound.x && ControllerGameGlobals.mouseXWorldPhys < ControllerChallenge.challenge.buildAreas[i].upperBound.x && ControllerGameGlobals.mouseYWorldPhys > ControllerChallenge.challenge.buildAreas[i].lowerBound.y && ControllerGameGlobals.mouseYWorldPhys < ControllerChallenge.challenge.buildAreas[i].upperBound.y) {
						this.selectedBuildArea = ControllerChallenge.challenge.buildAreas[i];
						this.m_sidePanel.ShowBuildBoxPanel();
						break;
					}
				}
			}

			if (this.curAction == ControllerGameGlobals.NEW_CIRCLE) {
				if (!up && this.actionStep == 0) {
					this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
					this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
					this.actionStep++;
				} else if (up && this.actionStep == 1) {
					var radius:number = Util.GetDist(this.firstClickX, this.firstClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
					if (radius > 0) {
						this.curAction = -1;
						var circ:ShapePart = new Circle(this.firstClickX, this.firstClickY, radius);
						this.allParts.push(circ);
						this.selectedParts = new Array();
						this.selectedParts.push(circ);
						this.AddAction(new CreateAction(circ));
						this.CheckIfPartsFit();
						this.m_sidePanel.ShowObjectPanel(circ);
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayShapeSound();
					}
				}
			} else if (this.curAction == ControllerGameGlobals.NEW_RECT) {
				if (!up && this.actionStep == 0) {
					this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
					this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
					this.actionStep++;
				} else if (up && this.actionStep == 1) {
					if (ControllerGameGlobals.mouseXWorldPhys != this.firstClickX || ControllerGameGlobals.mouseYWorldPhys != this.firstClickY) {
						this.curAction = -1;
						var rect:ShapePart = new Rectangle(this.firstClickX, this.firstClickY, ControllerGameGlobals.mouseXWorldPhys - this.firstClickX, ControllerGameGlobals.mouseYWorldPhys - this.firstClickY);
						this.allParts.push(rect);
						this.selectedParts = new Array();
						this.selectedParts.push(rect);
						this.AddAction(new CreateAction(rect));
						this.CheckIfPartsFit();
						this.m_sidePanel.ShowObjectPanel(rect);
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayShapeSound();
					}
				}
			} else if (this.curAction == ControllerGameGlobals.NEW_CANNON) {
				if (!up && this.actionStep == 0) {
					this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
					this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
					this.actionStep++;
				} else if (up && this.actionStep == 1) {
					if (ControllerGameGlobals.mouseXWorldPhys != this.firstClickX || ControllerGameGlobals.mouseYWorldPhys != this.firstClickY) {
						this.curAction = -1;
						var positive:boolean = (ControllerGameGlobals.mouseXWorldPhys >= this.firstClickX || ControllerGameGlobals.mouseYWorldPhys >= this.firstClickY);
						var w:number = (positive ? Math.max(ControllerGameGlobals.mouseXWorldPhys - this.firstClickX, 2 * (ControllerGameGlobals.mouseYWorldPhys - this.firstClickY)) : Math.min(ControllerGameGlobals.mouseXWorldPhys - this.firstClickX, 2 * (ControllerGameGlobals.mouseYWorldPhys - this.firstClickY)));
						var cannon:ShapePart = new Cannon(this.firstClickX, this.firstClickY, w);
						this.allParts.push(cannon);
						this.selectedParts = new Array();
						this.selectedParts.push(cannon);
						this.AddAction(new CreateAction(cannon));
						this.CheckIfPartsFit();
						this.m_sidePanel.ShowCannonPanel((cannon as Cannon));
						ControllerGameGlobals.curRobotID = "";
						if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
						this.redrawRobot = true;
						this.PlayShapeSound();
					}
				}
			} else if (this.curAction == ControllerGameGlobals.NEW_TRIANGLE) {
				if (!up && this.actionStep == 0) {
					this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
					this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
					this.actionStep++;
				} else if (up && this.actionStep == 1) {
					if (ControllerGameGlobals.mouseXWorldPhys != this.firstClickX || ControllerGameGlobals.mouseYWorldPhys != this.firstClickY) {
						var x2:number = ControllerGameGlobals.mouseXWorldPhys;
						var y2:number = ControllerGameGlobals.mouseYWorldPhys;

						var sideLen:number = Util.GetDist(this.firstClickX, this.firstClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
						var angle:number;
						if (sideLen < Triangle.MIN_SIDE_LENGTH) {
							angle = Math.atan2(this.firstClickY - ControllerGameGlobals.mouseYWorldPhys, ControllerGameGlobals.mouseXWorldPhys - this.firstClickX);
							x2 = this.firstClickX + Triangle.MIN_SIDE_LENGTH * Math.cos(angle);
							y2 = this.firstClickY - Triangle.MIN_SIDE_LENGTH * Math.sin(angle);
						} else if (sideLen > Triangle.MAX_SIDE_LENGTH) {
							angle = Math.atan2(this.firstClickY - ControllerGameGlobals.mouseYWorldPhys, ControllerGameGlobals.mouseXWorldPhys - this.firstClickX);
							x2 = this.firstClickX + Triangle.MAX_SIDE_LENGTH * Math.cos(angle);
							y2 = this.firstClickY - Triangle.MAX_SIDE_LENGTH * Math.sin(angle);
						}
						this.secondClickX = x2;
						this.secondClickY = y2;
						this.actionStep++;
						this.PlayShapeSound();
					}
				} else if (up && this.actionStep == 2) {
					if ((ControllerGameGlobals.mouseXWorldPhys != this.firstClickX || ControllerGameGlobals.mouseYWorldPhys != this.firstClickY) && (ControllerGameGlobals.mouseXWorldPhys != this.secondClickX || ControllerGameGlobals.mouseYWorldPhys != this.secondClickY)) {
						var sideLen1:number = Util.GetDist(this.firstClickX, this.firstClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
						var sideLen2:number = Util.GetDist(this.secondClickX, this.secondClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
						var sideLen0:number = Util.GetDist(this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY);
						var angle1:number = Util.NormalizeAngle(Math.acos((sideLen0 * sideLen0 + sideLen1 * sideLen1 - sideLen2 * sideLen2) / (2 * sideLen0 * sideLen1)));
						var angle2:number = Util.NormalizeAngle(Math.acos((sideLen0 * sideLen0 + sideLen2 * sideLen2 - sideLen1 * sideLen1) / (2 * sideLen0 * sideLen2)));
						var angle3:number = Util.NormalizeAngle(Math.acos((sideLen1 * sideLen1 + sideLen2 * sideLen2 - sideLen0 * sideLen0) / (2 * sideLen1 * sideLen2)));

						if (sideLen1 <= Triangle.MAX_SIDE_LENGTH && sideLen1 >= Triangle.MIN_SIDE_LENGTH && sideLen2 <= Triangle.MAX_SIDE_LENGTH && sideLen2 >= Triangle.MIN_SIDE_LENGTH && angle1 >= Triangle.MIN_TRIANGLE_ANGLE && angle2 >= Triangle.MIN_TRIANGLE_ANGLE && angle3 >= Triangle.MIN_TRIANGLE_ANGLE) {
							this.curAction = -1;
							var tri:ShapePart = new Triangle(this.firstClickX, this.firstClickY, this.secondClickX, this.secondClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
							this.allParts.push(tri);
							this.selectedParts = new Array();
							this.selectedParts.push(tri);
							this.AddAction(new CreateAction(tri));
							this.CheckIfPartsFit();
							this.m_sidePanel.ShowObjectPanel(tri);
							ControllerGameGlobals.curRobotID = "";
							if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
							this.redrawRobot = true;
							this.PlayShapeSound();
						}
					}
				}
			} else if (up && this.actionStep == 0 && this.curAction == ControllerGameGlobals.NEW_PRISMATIC_JOINT) {
				this.MaybeStartCreatingPrismaticJoint();
			} else if (up && this.actionStep == 1 && this.curAction == ControllerGameGlobals.NEW_PRISMATIC_JOINT) {
				if (Util.GetDist(this.firstClickX, this.firstClickY, ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys) > 0.3)	this.MaybeFinishCreatingPrismaticJoint();
			} else if (up && this.actionStep == 0 && (this.curAction == ControllerGameGlobals.NEW_REVOLUTE_JOINT || this.curAction == ControllerGameGlobals.NEW_FIXED_JOINT)) {
				this.MaybeCreateJoint();
			} else if (up && this.curAction == ControllerGameGlobals.BOX_SELECTING) {
				this.selectedParts = new Array();
				for (i = 0; i < this.allParts.length; i++) {
					if (this.allParts[i].isEditable && this.allParts[i].IntersectsBox(Math.min(this.firstClickX, ControllerGameGlobals.mouseXWorldPhys), Math.min(this.firstClickY, ControllerGameGlobals.mouseYWorldPhys), Math.abs(this.firstClickX - ControllerGameGlobals.mouseXWorldPhys), Math.abs(this.firstClickY - ControllerGameGlobals.mouseYWorldPhys))) {
						this.selectedParts.push(this.allParts[i]);
					}
				}

				if (this.selectedParts.length == 0) {
					this.m_sidePanel.visible = false;
				} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof Cannon) {
					this.m_sidePanel.ShowCannonPanel(this.selectedParts[0]);
				} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
					this.m_sidePanel.ShowObjectPanel(this.selectedParts[0]);
				} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof JointPart) {
					this.m_sidePanel.ShowJointPanel(this.selectedParts[0]);
				} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
					this.m_sidePanel.ShowTextPanel(this.selectedParts[0]);
				} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof Thrusters) {
					this.m_sidePanel.ShowThrustersPanel(this.selectedParts[0]);
				} else {
					this.m_sidePanel.ShowMultiSelectPanel(this.selectedParts);
				}
				this.curAction = -1;
				this.redrawRobot = true;
			} else if (up && this.curAction == ControllerGameGlobals.FINALIZING_JOINT) {
				if (this.candidateJointType == ControllerGameGlobals.NEW_PRISMATIC_JOINT || this.candidateJointType == ControllerGameGlobals.NEW_THRUSTERS) {
					this.potentialJointPart1.highlightForJoint = false;
					var index:number = -1;
					for (i = 0; i < this.candidateJointParts.length; i++) {
						if (this.potentialJointPart1 == this.candidateJointParts[i]) index = i;
					}
					index++;
					if (index == this.candidateJointParts.length) index = 0;
					this.potentialJointPart1 = this.candidateJointParts[index];
					this.potentialJointPart1.highlightForJoint = true;
				} else {
					this.potentialJointPart1.highlightForJoint = false;
					this.potentialJointPart2.highlightForJoint = false;
					var index1:number = -1, index2:number = -1;
					for (i = 0; i < this.candidateJointParts.length; i++) {
						if (this.potentialJointPart1 == this.candidateJointParts[i]) index1 = i;
						if (this.potentialJointPart2 == this.candidateJointParts[i]) index2 = i;
					}
					if (index1 == this.candidateJointParts.length - 2 && index2 == this.candidateJointParts.length - 1) {
						index1 = 0;
						index2 = 1;
					} else {
						index2++;
						if (index2 == this.candidateJointParts.length) {
							index1++;
							index2 = index1 + 1;
						}
					}
					this.potentialJointPart1 = this.candidateJointParts[index1];
					this.potentialJointPart2 = this.candidateJointParts[index2];

					this.potentialJointPart1.highlightForJoint = true;
					this.potentialJointPart2.highlightForJoint = true;
				}
			} else if (!up && this.curAction == ControllerGameGlobals.NEW_TEXT && this.actionStep == 0) {
				this.firstClickX = ControllerGameGlobals.mouseXWorldPhys;
				this.firstClickY = ControllerGameGlobals.mouseYWorldPhys;
				this.actionStep++;
			} else if (up && this.curAction == ControllerGameGlobals.NEW_TEXT && this.actionStep == 1) {
				var finalClickX:number = ControllerGameGlobals.mouseXWorldPhys;
				var finalClickY:number = ControllerGameGlobals.mouseYWorldPhys;
				if (Math.abs(finalClickX - this.firstClickX) < 1 || Math.abs(finalClickY - this.firstClickY) < 0.5) {
					var avgX:number = (this.firstClickX + finalClickX) / 2.0;
					var avgY:number = (this.firstClickY + finalClickY) / 2.0;
					this.firstClickX = avgX - 2;
					this.firstClickY = avgY - 1;
					finalClickX = avgX + 2;
					finalClickY = avgY + 1;
				}
				var text:TextPart = new TextPart(this, Math.min(this.firstClickX, finalClickX), Math.min(this.firstClickY, finalClickY), Math.max(this.firstClickX, finalClickX) - Math.min(this.firstClickX, finalClickX), Math.max(this.firstClickY, finalClickY) - Math.min(this.firstClickY, finalClickY), "New Text");
				this.selectedParts.push(text);
				this.allParts.push(text);
				this.AddAction(new CreateAction(text));
				this.curAction = -1;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.ShowTextPanel(text);
				this.redrawRobot = true;
			} else if (up && this.curAction == ControllerGameGlobals.NEW_THRUSTERS) {
				this.MaybeCreateThrusters();
			} else if (up && this.curAction == ControllerGameGlobals.RESIZING_TEXT) {
				this.curAction = -1;
			}
		}

		public RefreshSidePanel():void {
			if (this.selectedParts.length == 0 || this.selectingCondition) {
				this.m_sidePanel.visible = false;
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof Cannon) {
				this.m_sidePanel.ShowCannonPanel(this.selectedParts[0] as Cannon);
				this.lastSelectedShape = null;
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				this.m_sidePanel.ShowObjectPanel(this.selectedParts[0] as ShapePart);
				this.lastSelectedShape = null;
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
				this.m_sidePanel.ShowTextPanel(this.selectedParts[0] as TextPart);
				this.lastSelectedText = null;
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof JointPart) {
				this.m_sidePanel.ShowJointPanel(this.selectedParts[0] as JointPart);
				this.lastSelectedJoint = null;
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof Thrusters) {
				this.m_sidePanel.ShowThrustersPanel(this.selectedParts[0] as Thrusters);
				this.lastSelectedThrusters = null;
			} else {
				this.m_sidePanel.ShowMultiSelectPanel(this.selectedParts);
			}
		}

		public AddAction(a:Action):void {
			while (this.lastAction + 1 != this.actions.length) {
				this.actions.pop();
			}
			this.lastAction = this.actions.length;
			this.actions.push(a);
		}

		public CenterOnSelected():void {
			if (this.selectedParts.length == 1) {
				var centerX:number, centerY:number;
				if (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof Thrusters) {
					centerX = this.selectedParts[0].centerX;
					centerY = this.selectedParts[0].centerY;
				} else if (this.selectedParts[0] instanceof JointPart) {
					centerX = this.selectedParts[0].anchorX;
					centerY = this.selectedParts[0].anchorY;
				} else if (this.selectedParts[0] instanceof TextPart) {
					centerX = this.selectedParts[0].x + this.selectedParts[0].w / 2;
					centerY = this.selectedParts[0].y + this.selectedParts[0].h / 2;
				}

				var oldX:number = this.draw.m_drawXOff;
				var oldY:number = this.draw.m_drawYOff;
				this.draw.m_drawXOff += this.World2ScreenX(centerX) - ControllerGameGlobals.ZOOM_FOCUS_X;
				this.draw.m_drawYOff += this.World2ScreenY(centerY) - ControllerGameGlobals.ZOOM_FOCUS_Y;
				if (oldX != this.draw.m_drawXOff || oldY != this.draw.m_drawYOff) {
					this.hasPanned = true;
				}
			}
		}

		// BUTTON LISTENERS

		public circleButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_CIRCLE) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_CIRCLE;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
			}
		}

		public rectButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_RECT) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_RECT;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
			}
		}

		public triangleButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_TRIANGLE) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_TRIANGLE;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
			}
		}

		public fjButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_FIXED_JOINT) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_FIXED_JOINT;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
				this.potentialJointPart1 = null;
				this.potentialJointPart2 = null;
				this.copiedJoint = null;
			}
		}

		public rjButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_REVOLUTE_JOINT) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_REVOLUTE_JOINT;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
				this.potentialJointPart1 = null;
				this.potentialJointPart2 = null;
				this.copiedJoint = null;
			}
		}

		public pjButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_PRISMATIC_JOINT) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_PRISMATIC_JOINT;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
				this.potentialJointPart1 = null;
				this.potentialJointPart2 = null;
				this.copiedJoint = null;
			}
		}

		public textButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (this.curAction == ControllerGameGlobals.NEW_TEXT) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else {
				this.curAction = ControllerGameGlobals.NEW_TEXT;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
			}
		}

		public thrustersButton(e:MouseEvent):void {
			if (/*Main.premiumMode*/ true) {
				if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
				this.curAction = ControllerGameGlobals.NEW_THRUSTERS;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
				this.copiedThrusters = null;
			} else {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("That feature instanceof only available to IncrediBots supporters. Become an IncrediBots supporter?", 8);
			}
		}

		public cannonButton(e:MouseEvent):void {
			if (/*Main.premiumMode*/ true) {
				if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
				this.curAction = ControllerGameGlobals.NEW_CANNON;
				this.actionStep = 0;
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
			} else {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("That feature instanceof only available to IncrediBots supporters. Become an IncrediBots supporter?", 8);
			}
		}

		private mochiAdStarted():void {
			ControllerGameGlobals.adStarted = true;
		}

		private mochiAdFinished():void {
			ControllerGameGlobals.adStarted = false;
			this.playButton(new MouseEvent(""), false);
		}

		public playButton(e:MouseEvent, maybeShowAd:boolean = true):void {
			if (this.selectingCondition) return;
			/*var time:number = getTimer();
			if (!Main.DEBUG_VERSION && !Main.premiumMode && maybeShowAd && time > Main.lastAdTime + 30 * 60 * 1000) {
				MochiAd.showInterLevelAd({clip:root, id:"1913f89f65e17063", res:"800x600", ad_started:mochiAdStarted, ad_finished:mochiAdFinished});
				Main.lastAdTime = time;
			}*/

			if (!ControllerGameGlobals.adStarted) {
				this.CheckIfPartsFit();
				var tooManyShapes:boolean = this.TooManyShapes();
				if ((this.partsFit && !tooManyShapes) || ControllerGameGlobals.playingReplay) {
					this.m_guiPanel.ShowGamePanel();
					this.m_sidePanel.visible = false;
					this.selectedParts = new Array();
					this.curAction = -1;
					this.paused = false;
					if (!this.simStarted) {
						this.frameCounter = 0;
						this.m_guiPanel.SetTimer(this.frameCounter);
						this.cameraMovements = new Array();
						this.cameraMovements.push(new CameraMovement(0, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, this.m_physScale));
						this.keyPresses = new Array();
						this.syncPoints = new Array();
						ControllerGameGlobals.cannonballs = new Array();
						if (ControllerGameGlobals.playingReplay) {
							ControllerGameGlobals.replay.syncPointIndex = 0;
							ControllerGameGlobals.replay.cameraMovementIndex = 0;
							ControllerGameGlobals.replay.keyPressIndex = 0;
							if (ControllerGameGlobals.replay.syncPoints.length > 0) {
								this.replaySplineXs = this.ComputeReplaySplines(0);
								this.replaySplineYs = this.ComputeReplaySplines(1);
								this.replaySplineAngles = this.ComputeReplaySplines(2);
							}
						}
						this.simStarted = true;
						this.autoPanning = true;
						this.canSaveReplay = true;
						for (var i:number = 0; i < this.allParts.length; i++) {
							this.allParts[i].checkedCollisionGroup = false;
						}
						for (i = 0; i < this.allParts.length; i++) {
							if (this.allParts[i] instanceof ShapePart) this.allParts[i].SetCollisionGroup(-(i + 1));
						}

						this.CreateWorld();

						for (i = this.allParts.length; i >= 0; i--) {
							if (this.allParts[i] instanceof ShapePart || this.allParts[i] instanceof TextPart) this.allParts[i].Init(this.m_world);
						}
						ControllerGameGlobals.collisionGroup = 0x0001;
						for (i = 0; i < this.allParts.length; i++) {
							if (this.allParts[i] instanceof PrismaticJoint) ControllerGameGlobals.collisionGroup *= 2;
							if (this.allParts[i] instanceof JointPart || this.allParts[i] instanceof Thrusters) this.allParts[i].Init(this.m_world);
						}

						this.cameraPart = null;
						for (i = 0; i < this.allParts.length; i++) {
							if (this.allParts[i] instanceof ShapePart && this.allParts[i].isCameraFocus && this.allParts[i].isEnabled) this.cameraPart = this.allParts[i];
						}
						if (!this.cameraPart) this.cameraPart = this.FindCenterOfRobot();
						this.savedDrawXOff = this.Screen2WorldX(ControllerGameGlobals.ZOOM_FOCUS_X);
						this.savedDrawYOff = this.Screen2WorldY(ControllerGameGlobals.ZOOM_FOCUS_Y);
					}
				} else {
					this.m_fader.visible = true;
					if (!this.partsFit) this.ShowDialog3("You must fit your robot inside the starting box first!");
					else if (tooManyShapes) this.ShowDialog3("Your robot contains too many shapes!  (Limit 500)");
					this.m_progressDialog.ShowOKButton();
					this.m_progressDialog.StopTimer();
				}
			}
		}

		public editButton(e:MouseEvent, confirmed:boolean = false):void {

		}

		public pauseButton(e:MouseEvent):void {
			if (ControllerGameGlobals.playingReplay && ControllerGameGlobals.replay.Update(this.frameCounter)) this.ShowPostReplayWindow();
			this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
			this.paused = true;
		}

		public resetButton(e:MouseEvent, rateRobot:boolean = true):void {
			if (ControllerGameGlobals.playingReplay) {
				for (var i:number = 0; i < this.allParts.length; i++) {
					this.allParts[i].UnInit(this.m_world);
				}
				this.simStarted = false;
				this.playButton(e, false);
			} else {
				this.m_guiPanel.ShowEditPanel();
				this.paused = true;
				this.simStarted = false;
				ControllerGameGlobals.playingReplay = false;
				for (i = 0; i < this.allParts.length; i++) {
					this.allParts[i].UnInit(this.m_world);
				}
				this.draw.m_drawXOff = this.savedDrawXOff * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_X;
				this.draw.m_drawYOff = this.savedDrawYOff * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_Y;
				this.hasPanned = true;
				if (rateRobot) {
					if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic && !ControllerGameGlobals.ratedCurChallenge && !LSOManager.HasRatedChallenge(ControllerGameGlobals.curChallengeID)) {
						ControllerGameGlobals.ratedCurChallenge = true;
						if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
						this.m_rateDialog = new RateWindow(this, 2, 0, true);
						this.addChild(this.m_rateDialog);
						this.m_fader.visible = true;
					} else if (ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic && !ControllerGameGlobals.ratedCurRobot && !LSOManager.HasRatedRobot(ControllerGameGlobals.curRobotID)) {
						ControllerGameGlobals.ratedCurRobot = true;
						if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
						this.m_rateDialog = new RateWindow(this, 0, 0, true);
						this.addChild(this.m_rateDialog);
						this.m_fader.visible = true;
						this.paused = true;
					}
				}
			}
			this.wonChallenge = false;
			this.redrawBuildArea = true;
		}

		public rewindButton(e:MouseEvent, makeThemRate:boolean = true):void {
			if (!ControllerGameGlobals.playingReplay) {
				this.resetButton(e, false);
				this.playButton(e);
			} else if (ControllerGameGlobals.viewingUnsavedReplay) {
				this.paused = true;
				this.simStarted = false;
				ControllerGameGlobals.playingReplay = false;
				this.wonChallenge = false;
				ControllerGameGlobals.viewingUnsavedReplay = false;
				this.m_guiPanel.ShowEditPanel(true);
				for (var i:number = 0; i < this.allParts.length; i++) {
					this.allParts[i].UnInit(this.m_world);
				}
				this.draw.m_drawXOff = this.savedDrawXOff * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_X;
				this.draw.m_drawYOff = this.savedDrawYOff * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_Y;
				this.hasPanned = true;
				this.redrawBuildArea = true;
			} else {
				if (makeThemRate && ControllerGameGlobals.curReplayID != "" && !ControllerGameGlobals.ratedCurReplay && ControllerGameGlobals.curReplayPublic && !LSOManager.HasRatedReplay(ControllerGameGlobals.curReplayID)) {
					ControllerGameGlobals.ratedCurReplay = true;
					if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
					this.m_rateDialog = new RateWindow(this, 1, 5);
					this.addChild(this.m_rateDialog);
					this.m_fader.visible = true;
				} else {
					Main.changeControllers = true;
					ControllerGameGlobals.playingReplay = false;
					ControllerGameGlobals.showTutorial = false;
					ControllerGameGlobals.replayParts = new Array();
					ControllerGameGlobals.curRobotID = "";
					ControllerGameGlobals.curRobotEditable = true;
					ControllerGameGlobals.curReplayID = "";
				}
			}
		}

		public reportButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic) {
				if (ControllerGameGlobals.userName == "_Public") {
					this.clickedReport = true;
					this.loginButton(e, true, false);
				} else {
					if (this.m_reportWindow) this.removeChild(this.m_reportWindow);
					this.m_reportWindow = new ReportWindow(this, 1, ControllerGameGlobals.curReplayID);
					this.addChild(this.m_reportWindow);
					this.m_fader.visible = true;
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
				if (ControllerGameGlobals.userName == "_Public") {
					this.clickedReport = true;
					this.loginButton(e, true, false);
				} else {
					if (this.m_reportWindow) this.removeChild(this.m_reportWindow);
					this.m_reportWindow = new ReportWindow(this, 2, ControllerGameGlobals.curChallengeID);
					this.addChild(this.m_reportWindow);
					this.m_fader.visible = true;
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else if (ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic) {
				if (ControllerGameGlobals.userName == "_Public") {
					this.clickedReport = true;
					this.loginButton(e, true, false);
				} else {
					if (this.m_reportWindow) this.removeChild(this.m_reportWindow);
					this.m_reportWindow = new ReportWindow(this, 0, ControllerGameGlobals.curRobotID);
					this.addChild(this.m_reportWindow);
					this.m_fader.visible = true;
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You can only report publicly saved robots.");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public finishReporting(e:Event):void {
			var threadID:number = Database.FinishReporting(e);
			if (threadID != -1) {
				this.ShowDialog3("Thank you, the moderators have been notified.");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
				Main.ShowMouse();
			}
		}

		public featureButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic) {
				Database.FeatureReplay(ControllerGameGlobals.curReplayID, !ControllerGameGlobals.curReplayFeatured, this.finishFeaturing);
				this.m_fader.visible = true;
				this.ShowDialog("Featuring...");
				Main.ShowHourglass();
			} else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
				Database.FeatureChallenge(ControllerGameGlobals.curChallengeID, !ControllerGameGlobals.curChallengeFeatured, this.finishFeaturing);
				this.m_fader.visible = true;
				this.ShowDialog("Featuring...");
				Main.ShowHourglass();
			} else if (ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic) {
				Database.FeatureRobot(ControllerGameGlobals.curRobotID, !ControllerGameGlobals.curRobotFeatured, this.finishFeaturing);
				this.m_fader.visible = true;
				this.ShowDialog("Featuring...");
				Main.ShowHourglass();
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You can only feature publicly saved robots.");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		private finishFeaturing(e:Event):void {
			var retVal:boolean = Database.FinishFeaturing(e);
			if (retVal) {
				this.m_progressDialog.SetMessage("Success!");
				this.m_progressDialog.HideInXSeconds(1);
				this.m_fader.visible = false;
				Main.ShowMouse();
				if (ControllerGameGlobals.playingReplay) ControllerGameGlobals.curReplayFeatured = !ControllerGameGlobals.curReplayFeatured;
				else if (ControllerGameGlobals.curChallengeID != "") ControllerGameGlobals.curChallengeFeatured = !ControllerGameGlobals.curChallengeFeatured;
				else ControllerGameGlobals.curRobotFeatured = !ControllerGameGlobals.curRobotFeatured;
			}
		}

		public rateButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic && !LSOManager.HasRatedRobot(ControllerGameGlobals.curRobotID)) {
				this.m_fader.visible = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 0);
				this.addChild(this.m_rateDialog);
			} else if (ControllerGameGlobals.curRobotID == "" || !ControllerGameGlobals.curRobotPublic) {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your robot publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You've already rated this robot!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public rateWindowClosed(rating:number, redirect:number):void {
			this.m_rateDialog.visible = false;
			if (ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic) {
				Database.RateReplay(ControllerGameGlobals.curReplayID, rating, this.finishRatingReplay);
			} else if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic) {
				Database.RateChallenge(ControllerGameGlobals.curChallengeID, rating, this.finishRatingChallenge);
			} else {
				Database.RateRobot(ControllerGameGlobals.curRobotID, rating, this.finishRatingRobot);
			}
			this.redirectAfterRating = redirect;
			this.m_fader.visible = true;
			this.ShowDialog("Rating...");
			Main.ShowHourglass();
			this.curAction = -1;
		}

		public conditionsButton(e:MouseEvent):void {
			this.curAction = -1;
			this.boxText.visible = false;
			this.horizLineText.visible = false;
			this.vertLineText.visible = false;
			this.shapeText.visible = false;
			this.m_sidePanel.visible = false;
			if (this.m_conditionsDialog) this.removeChild(this.m_conditionsDialog);
			this.m_conditionsDialog = new ConditionsWindow(this as ControllerChallenge);
			this.addChild(this.m_conditionsDialog);
			this.m_fader.visible = true;
		}

		public restrictionsButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			this.m_sidePanel.visible = false;
			if (this.m_restrictionsDialog) this.removeChild(this.m_restrictionsDialog);
			this.m_restrictionsDialog = new RestrictionsWindow(this as ControllerChallenge);
			this.addChild(this.m_restrictionsDialog);
			this.m_fader.visible = true;
			this.saveAfterRestrictions = false;
		}

		public buildBoxButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			/*if (ControllerChallenge.challenge.buildAreas.length != 0) {
				m_fader.visible = true;
				if (m_progressDialog) removeChild(m_progressDialog);
				m_progressDialog = new DialogWindow(this, "One or more build boxes already exists.  Would you like to keep them or delete them?", true, false, true);
				m_progressDialog.ShowBuildBoxButtons();
				addChild(m_progressDialog);
			}*/
			this.curAction = ControllerGameGlobals.DRAWING_BUILD_BOX;
			this.actionStep = 0;
		}

		public sandboxSettingsButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
			if (!this.simStarted) {
				if (this instanceof ControllerSandbox && (!(this instanceof ControllerChallenge) || !ControllerChallenge.playOnlyMode)) {
					this.m_sandboxWindow = new AdvancedSandboxWindow(this, ControllerSandbox.settings);
					this.m_fader.visible = true;
					this.addChild(this.m_sandboxWindow);
				} else {
					this.m_fader.visible = true;
					this.ShowDialog3("That feature instanceof only available in Sandbox mode!");
					this.m_progressDialog.ShowOKButton();
					this.m_progressDialog.StopTimer();
				}
			}
		}

		public commentButton(e:MouseEvent, robotID:String = "", robotPublic:boolean = false):void {
			if (this.selectingCondition) return;
			if (robotID == "") {
				robotID = ControllerGameGlobals.curRobotID;
				robotPublic = ControllerGameGlobals.curRobotPublic;
			}
			if (robotID != "" && robotPublic) {
				Database.CommentOnRobot(robotID, this.finishCommenting);
				this.m_fader.visible = true;
				this.ShowDialog("Connecting to forum...");
				Main.ShowHourglass();
				this.curAction = -1;
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your robot publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public finishCommenting(e:Event):void {
			if (!Database.waitingForResponse || (Database.curTransactionType != Database.ACTION_COMMENT_ROBOT && Database.curTransactionType != Database.ACTION_COMMENT_REPLAY)) return;
			var threadID:number = Database.FinishCommenting(e);
			if (threadID != -1) {
				if (this.m_chooserWindow && this.m_chooserWindow.visible) this.m_chooserWindow.HideFader();
				else this.m_fader.visible = false;
				this.m_progressDialog.visible = false;
				Main.BrowserRedirect("http://www.incredibots.com/forums/posting.php?mode=reply&t=" + threadID + (ControllerGameGlobals.userName == "_Public" ? "" : "&sid=" + ControllerGameGlobals.sessionID), true);
				Main.ShowMouse();
			}
		}

		public finishRatingRobot(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_RATE_ROBOT) return;
			var retVal:boolean = Database.FinishRating(e);
			if (retVal) {
				LSOManager.SetRobotRated(ControllerGameGlobals.curRobotID);
				this.m_progressDialog.SetMessage("Success!");
				this.m_progressDialog.HideInXSeconds(1);
				if (this.m_postReplayWindow && this.m_postReplayWindow.visible) this.m_postReplayWindow.HideFader();
				else this.m_fader.visible = false;
				this.m_rateDialog.visible = false;
				Main.ShowMouse();
			}
			if (this.redirectAfterRating == 1) {
				this.loadButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 2) {
				this.loadRobotButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 3) {
				this.loadReplayButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 4) {
				this.loadChallengeButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 5) {
				this.rewindButton(new MouseEvent(""));
			}
			this.redirectAfterRating = 0;
		}

		public finishRatingReplay(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_RATE_REPLAY) return;
			var retVal:boolean = Database.FinishRating(e);
			if (retVal) {
				LSOManager.SetReplayRated(ControllerGameGlobals.curReplayID);
				this.m_progressDialog.SetMessage("Success!");
				this.m_progressDialog.HideInXSeconds(1);
				if (this.m_postReplayWindow && this.m_postReplayWindow.visible) this.m_postReplayWindow.HideFader();
				else this.m_fader.visible = false;
				this.m_rateDialog.visible = false;
				Main.ShowMouse();
			}
			if (this.redirectAfterRating == 1) {
				this.loadButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 2) {
				this.loadRobotButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 3) {
				this.loadReplayButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 4) {
				this.loadChallengeButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 5) {
				this.rewindButton(new MouseEvent(""));
			}
			this.redirectAfterRating = 0;
		}

		public finishRatingChallenge(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_RATE_CHALLENGE) return;
			var retVal:boolean = Database.FinishRating(e);
			if (retVal) {
				LSOManager.SetChallengeRated(ControllerGameGlobals.curChallengeID);
				this.m_progressDialog.SetMessage("Success!");
				this.m_progressDialog.HideInXSeconds(1);
				if (this.m_postReplayWindow && this.m_postReplayWindow.visible) this.m_postReplayWindow.HideFader();
				else this.m_fader.visible = false;
				this.m_rateDialog.visible = false;
				Main.ShowMouse();
			}
			if (this.redirectAfterRating == 1) {
				this.loadButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 2) {
				this.loadRobotButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 3) {
				this.loadReplayButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 4) {
				this.loadChallengeButton(new MouseEvent(""));
			} else if (this.redirectAfterRating == 5) {
				this.rewindButton(new MouseEvent(""));
			}
			this.redirectAfterRating = 0;
		}

		public embedButton(e:MouseEvent, robotID:String = "", robotPublic:boolean = false):void {
			if (this.selectingCondition) return;
			if (robotID == "") {
				robotID = ControllerGameGlobals.curRobotID;
				robotPublic = ControllerGameGlobals.curRobotPublic;
			}
			if (robotID != "" && robotPublic) {
				this.m_fader.visible = true;
				this.ShowLinkDialog("Copy the HTML below into your\n  website to embed this robot.", null, false, robotID);
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your robot publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public linkButton(e:MouseEvent, robotID:String = "", robotPublic:boolean = false):void {
			if (this.selectingCondition) return;
			if (robotID == "") {
				robotID = ControllerGameGlobals.curRobotID;
				robotPublic = ControllerGameGlobals.curRobotPublic;
			}
			if (robotID != "" && robotPublic) {
				this.m_fader.visible = true;
				this.ShowLinkDialog("     Use the link below to\n        link to this robot.", "http://incredibots2.com/?robotID=" + robotID);
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your robot publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public rateReplayButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic && !LSOManager.HasRatedReplay(ControllerGameGlobals.curReplayID)) {
				this.m_fader.visible = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 1);
				this.addChild(this.m_rateDialog);
			} else if (ControllerGameGlobals.curReplayID == "" || !ControllerGameGlobals.curReplayPublic) {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your replay publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You've already rated this replay!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public commentReplayButton(e:MouseEvent, replayID:String = "", replayPublic:boolean = false):void {
			if (replayID == "") {
				replayID = ControllerGameGlobals.curReplayID;
				replayPublic = ControllerGameGlobals.curReplayPublic;
			}
			if (replayID != "" && replayPublic) {
				Database.CommentOnReplay(replayID, this.finishCommenting);
				this.m_fader.visible = true;
				this.ShowDialog("Connecting to forum...");
				Main.ShowHourglass();
				this.curAction = -1;
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your replay publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public embedReplayButton(e:MouseEvent, replayID:String = "", replayPublic:boolean = false):void {
			if (replayID == "") {
				replayID = ControllerGameGlobals.curReplayID;
				replayPublic = ControllerGameGlobals.curReplayPublic;
			}
			if (replayID != "" && replayPublic) {
				this.m_fader.visible = true;
				this.ShowLinkDialog("Copy the HTML below into your\n  website to embed this replay.", null, true, replayID);
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your replay publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public linkReplayButton(e:MouseEvent, replayID:String = "", replayPublic:boolean = false):void {
			if (replayID == "") {
				replayID = ControllerGameGlobals.curReplayID;
				replayPublic = ControllerGameGlobals.curReplayPublic;
			}
			if (replayID != "" && replayPublic) {
				this.m_fader.visible = true;
				this.ShowLinkDialog("     Use the link below to\n       link to this replay.", "http://incredibots2.com/?replayID=" + replayID);
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your replay publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public rateChallengeButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic && !LSOManager.HasRatedChallenge(ControllerGameGlobals.curChallengeID)) {
				this.m_fader.visible = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 2);
				this.addChild(this.m_rateDialog);
			} else if (ControllerGameGlobals.curChallengeID == "" || !ControllerGameGlobals.curChallengePublic) {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your challenge publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You've already rated this challenge!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public commentChallengeButton(e:MouseEvent, challengeID:String = "", challengePublic:boolean = false):void {
			if (this.selectingCondition) return;
			if (challengeID == "") {
				challengeID = ControllerGameGlobals.curChallengeID;
				challengePublic = ControllerGameGlobals.curChallengePublic;
			}
			if (challengeID != "" && challengePublic) {
				Database.CommentOnChallenge(challengeID, this.finishCommenting);
				this.m_fader.visible = true;
				this.ShowDialog("Connecting to forum...");
				Main.ShowHourglass();
				this.curAction = -1;
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your challenge publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public embedChallengeButton(e:MouseEvent, challengeID:String = "", challengePublic:boolean = false):void {
			if (this.selectingCondition) return;
			if (challengeID == "") {
				challengeID = ControllerGameGlobals.curChallengeID;
				challengePublic = ControllerGameGlobals.curChallengePublic;
			}
			if (challengeID != "" && challengePublic) {
				this.m_fader.visible = true;
				this.ShowLinkDialog("Copy the HTML below into your\n  website to embed this challenge.", null, false, challengeID, true);
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your challenge publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public linkChallengeButton(e:MouseEvent, challengeID:String = "", challengePublic:boolean = false):void {
			if (this.selectingCondition) return;
			if (challengeID == "") {
				challengeID = ControllerGameGlobals.curChallengeID;
				challengePublic = ControllerGameGlobals.curChallengePublic;
			}
			if (challengeID != "" && challengePublic) {
				this.m_fader.visible = true;
				this.ShowLinkDialog("     Use the link below to\n       link to this challenge.", "http://incredibots2.com/?challengeID=" + challengeID);
			} else {
				this.m_fader.visible = true;
				this.ShowDialog3("You need to save your challenge publicly first!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
			}
		}

		public tutorialButton(e:MouseEvent):void {
			if (this.m_tutorialDialog) {
				this.m_tutorialDialog.visible = true;
				this.m_tutorialDialog.ResetPosition();
			}
		}

		public rotateButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable) return;
			for (var i:number = this.selectedParts.length - 1; i >= 0; i--) {
				if (this.selectedParts[i] instanceof TextPart) {
					this.selectedParts = Util.RemoveFromArray(this.selectedParts[i], this.selectedParts);
				}
			}
			if (this.selectedParts.length == 0) return;
			this.curAction = ControllerGameGlobals.ROTATE;
			this.rotatingPart = null;
			for (i = 0; i < this.selectedParts.length; i++) {
				if ((this.selectedParts[i] instanceof ShapePart && (!this.rotatingPart || (this.rotatingPart instanceof Thrusters) || this.selectedParts[i].GetMass() > this.rotatingPart.GetMass())) || (this.selectedParts[i] instanceof Thrusters && !this.rotatingPart)) {
					this.rotatingPart = this.selectedParts[i];
				}
			}
			if (this.rotatingPart != null) {
				this.rotatingParts = new Array();
				if (this.selectedParts.length == 1 && this.rotatingPart instanceof Thrusters) {
					this.rotatingParts.push(this.rotatingPart);
				} else {
					for (i = 0; i < this.selectedParts.length; i++) {
						this.rotatingParts = this.rotatingParts.concat(this.selectedParts[i].GetAttachedParts());
					}
					this.rotatingParts = Util.RemoveDuplicates(this.rotatingParts);
				}
				for (i = 0; i < this.rotatingParts.length; i++) {
					if (this.rotatingParts[i] instanceof ShapePart || this.rotatingParts[i] instanceof Thrusters) {
						this.rotatingParts[i].rotateAngle = Math.atan2(this.rotatingParts[i].centerY - this.rotatingPart.centerY, this.rotatingParts[i].centerX - this.rotatingPart.centerX);
						this.rotatingParts[i].rotateOrientation = this.rotatingParts[i].angle;
					} else {
						this.rotatingParts[i].rotateAngle = Math.atan2(this.rotatingParts[i].anchorY - this.rotatingPart.centerY, this.rotatingParts[i].anchorX - this.rotatingPart.centerX);
						if (this.rotatingParts[i] instanceof PrismaticJoint) {
							this.rotatingParts[i].rotateOrientation = Util.GetAngle(this.rotatingParts[i].axis);
						}
					}
				}
				this.initRotatingAngle = Math.atan2(ControllerGameGlobals.mouseYWorldPhys - this.rotatingPart.centerY, ControllerGameGlobals.mouseXWorldPhys - this.rotatingPart.centerX);
			}
		}

		public mirrorHorizontal(e:MouseEvent):void {
			if (/*Main.premiumMode*/ true) {
				if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
				if (this.simStarted) return;
				if (this.selectedParts.length == 0) return;
				var newParts:Array<any> = new Array();
				var centerX:number = (this.selectedParts[0] instanceof JointPart ? this.selectedParts[0].anchorX : (this.selectedParts[0] instanceof TextPart ? this.selectedParts[0].x + this.selectedParts[0].w / 2 : this.selectedParts[0].centerX));
				var centerY:number = (this.selectedParts[0] instanceof JointPart ? this.selectedParts[0].anchorY : (this.selectedParts[0] instanceof TextPart ? this.selectedParts[0].y + this.selectedParts[0].h / 2 : this.selectedParts[0].centerY));
				var partMapping:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof Circle) {
						var c:Circle = new Circle(centerX - (this.selectedParts[i].centerX - centerX), this.selectedParts[i].centerY, this.selectedParts[i].radius);
						c.angle = Math.PI - this.selectedParts[i].angle;
						c.isStatic = this.selectedParts[i].isStatic;
						c.density = this.selectedParts[i].density;
						c.collide = this.selectedParts[i].collide;
						c.red = this.selectedParts[i].red;
						c.green = this.selectedParts[i].green;
						c.blue = this.selectedParts[i].blue;
						c.opacity = this.selectedParts[i].opacity;
						c.outline = this.selectedParts[i].outline;
						c.terrain = this.selectedParts[i].terrain;
						c.undragable = this.selectedParts[i].undragable;
						newParts.push(c);
						partMapping.push(c);
					} else if (this.selectedParts[i] instanceof Rectangle) {
						var r:Rectangle = new Rectangle(centerX - (this.selectedParts[i].x - centerX), this.selectedParts[i].y, -this.selectedParts[i].w, this.selectedParts[i].h);
						r.angle = Math.PI - this.selectedParts[i].angle;
						r.isStatic = this.selectedParts[i].isStatic;
						r.density = this.selectedParts[i].density;
						r.collide = this.selectedParts[i].collide;
						r.red = this.selectedParts[i].red;
						r.green = this.selectedParts[i].green;
						r.blue = this.selectedParts[i].blue;
						r.opacity = this.selectedParts[i].opacity;
						r.outline = this.selectedParts[i].outline;
						r.terrain = this.selectedParts[i].terrain;
						r.undragable = this.selectedParts[i].undragable;
						newParts.push(r);
						partMapping.push(r);
					} else if (this.selectedParts[i] instanceof Triangle) {
						var verts:Array<any> = this.selectedParts[i].GetVertices();
						var t:Triangle = new Triangle(centerX - (verts[0].x - centerX), verts[0].y, centerX - (verts[1].x - centerX), verts[1].y, centerX - (verts[2].x - centerX), verts[2].y);
						t.isStatic = this.selectedParts[i].isStatic;
						t.density = this.selectedParts[i].density;
						t.collide = this.selectedParts[i].collide;
						t.red = this.selectedParts[i].red;
						t.green = this.selectedParts[i].green;
						t.blue = this.selectedParts[i].blue;
						t.opacity = this.selectedParts[i].opacity;
						t.outline = this.selectedParts[i].outline;
						t.terrain = this.selectedParts[i].terrain;
						t.undragable = this.selectedParts[i].undragable;
						newParts.push(t);
						partMapping.push(t);
					} else if (this.selectedParts[i] instanceof Cannon) {
						var ca:Cannon = new Cannon(centerX - (this.selectedParts[i].x - centerX) - this.selectedParts[i].w, this.selectedParts[i].y, this.selectedParts[i].w);
						ca.angle = Math.PI - this.selectedParts[i].angle;
						ca.isStatic = this.selectedParts[i].isStatic;
						ca.density = this.selectedParts[i].density;
						ca.collide = this.selectedParts[i].collide;
						ca.red = this.selectedParts[i].red;
						ca.green = this.selectedParts[i].green;
						ca.blue = this.selectedParts[i].blue;
						ca.opacity = this.selectedParts[i].opacity;
						ca.outline = this.selectedParts[i].outline;
						ca.terrain = this.selectedParts[i].terrain;
						ca.undragable = this.selectedParts[i].undragable;
						ca.fireKey = this.selectedParts[i].fireKey;
						ca.strength = this.selectedParts[i].strength;
						newParts.push(ca);
						partMapping.push(ca);
					} else if (this.selectedParts[i] instanceof TextPart) {
						var te:TextPart = new TextPart(this, centerX - (this.selectedParts[i].x + this.selectedParts[i].w / 2 - centerX), this.selectedParts[i].y, this.selectedParts[i].w, this.selectedParts[i].h, this.selectedParts[i].text, this.selectedParts[i].inFront);
						te.red = this.selectedParts[i].red;
						te.green = this.selectedParts[i].green;
						te.blue = this.selectedParts[i].blue;
						te.size = this.selectedParts[i].size;
						te.alwaysVisible = this.selectedParts[i].alwaysVisible;
						te.inFront = this.selectedParts[i].inFront;
						te.scaleWithZoom = this.selectedParts[i].scaleWithZoom;
						te.displayKey = this.selectedParts[i].displayKey;
						newParts.push(te);
						partMapping.push(-1);
					} else if (this.selectedParts[i] instanceof JointPart || this.selectedParts[i] instanceof Thrusters) {
						partMapping.push(-1);
					}
				}
				for (i = 0; i < this.selectedParts.length; i++) {
					var index1:number = -1, index2:number = -1;
					if (this.selectedParts[i] instanceof JointPart) {
						for (var j:number = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == this.selectedParts[i].part1) index1 = j;
							if (this.selectedParts[j] == this.selectedParts[i].part2) index2 = j;
						}
						if (index1 == -1 || index2 == -1) continue;
					} else if (this.selectedParts[i] instanceof Thrusters) {
						for (j = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == this.selectedParts[i].shape) index1 = j;
						}
						if (index1 == -1) continue;
					}
					if (this.selectedParts[i] instanceof FixedJoint) {
						var fj:FixedJoint = new FixedJoint(partMapping[index1], partMapping[index2], centerX - (this.selectedParts[i].anchorX - centerX), this.selectedParts[i].anchorY);
						newParts.push(fj);
					} else if (this.selectedParts[i] instanceof RevoluteJoint) {
						var rj:RevoluteJoint = new RevoluteJoint(partMapping[index1], partMapping[index2], centerX - (this.selectedParts[i].anchorX - centerX), this.selectedParts[i].anchorY);
						rj.enableMotor = this.selectedParts[i].enableMotor;
						rj.motorCWKey = this.selectedParts[i].motorCCWKey;
						rj.motorCCWKey = this.selectedParts[i].motorCWKey;
						rj.motorStrength = this.selectedParts[i].motorStrength;
						rj.motorSpeed = this.selectedParts[i].motorSpeed;
						rj.motorLowerLimit = -this.selectedParts[i].motorUpperLimit;
						rj.motorUpperLimit = -this.selectedParts[i].motorLowerLimit;
						rj.isStiff = this.selectedParts[i].isStiff;
						rj.autoCW = this.selectedParts[i].autoCCW;
						rj.autoCCW = this.selectedParts[i].autoCW;
						newParts.push(rj);
					} else if (this.selectedParts[i] instanceof PrismaticJoint) {
						var pj:PrismaticJoint = new PrismaticJoint(partMapping[index1], partMapping[index2], 0, 0, 1, 1);
						pj.anchorX = centerX - (this.selectedParts[i].anchorX - centerX);
						pj.anchorY = this.selectedParts[i].anchorY;
						var axisAngle:number = Math.atan2(this.selectedParts[i].axis.y, this.selectedParts[i].axis.x);
						axisAngle = Util.NormalizeAngle(Math.PI - axisAngle);
						pj.axis = new b2Vec2(Math.cos(axisAngle), Math.sin(axisAngle));
						pj.axis.Normalize();
						pj.initLength = this.selectedParts[i].initLength;
						pj.enablePiston = this.selectedParts[i].enablePiston;
						pj.pistonUpKey = this.selectedParts[i].pistonUpKey;
						pj.pistonDownKey = this.selectedParts[i].pistonDownKey;
						pj.pistonStrength = this.selectedParts[i].pistonStrength;
						pj.pistonSpeed = this.selectedParts[i].pistonSpeed;
						pj.isStiff = this.selectedParts[i].isStiff;
						pj.autoOscillate = this.selectedParts[i].autoOscillate;
						pj.red = this.selectedParts[i].red;
						pj.green = this.selectedParts[i].green;
						pj.blue = this.selectedParts[i].blue;
						pj.opacity = this.selectedParts[i].opacity;
						pj.outline = this.selectedParts[i].outline;
						pj.collide = this.selectedParts[i].collide;
						newParts.push(pj);
					} else if (this.selectedParts[i] instanceof Thrusters) {
						var th:Thrusters = new Thrusters(partMapping[index1], centerX - (this.selectedParts[i].centerX - centerX), this.selectedParts[i].centerY);
						th.angle = Math.PI - this.selectedParts[i].angle;
						th.strength = this.selectedParts[i].strength;
						th.thrustKey = this.selectedParts[i].thrustKey;
						th.autoOn = this.selectedParts[i].autoOn;
						newParts.push(th);
					}
				}
				if (newParts.length > 0) {
					this.selectedParts = new Array();
					this.draggingParts = new Array();
					for (i = 0; i < newParts.length; i++) {
						newParts[i].dragXOff = centerX - (newParts[i] instanceof JointPart ? newParts[i].anchorX : (newParts[i] instanceof TextPart ? newParts[i].x - newParts[i].w / 2 : newParts[i].centerX));
						newParts[i].dragYOff = centerY - (newParts[i] instanceof JointPart ? newParts[i].anchorY : (newParts[i] instanceof TextPart ? newParts[i].y - newParts[i].h / 2 : newParts[i].centerY));
						this.selectedParts.push(newParts[i]);
						this.draggingParts.push(newParts[i]);
						this.allParts.push(newParts[i]);
					}
					this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
					this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
					this.draggingPart = this.selectedParts[0];
					this.draggingPart.Move(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
					this.RefreshSidePanel();
					this.AddAction(new MassCreateAction(this.selectedParts));
					this.curAction = ControllerGameGlobals.PASTE;
					ControllerGameGlobals.curRobotID = "";
				}
			} else {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("That feature instanceof only available to IncrediBots supporters. Become an IncrediBots supporter?", 8);
			}
		}

		public mirrorVertical(e:MouseEvent):void {
			if (/*Main.premiumMode*/ true) {
				if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
				if (this.simStarted) return;
				if (this.selectedParts.length == 0) return;
				var newParts:Array<any> = new Array();
				var centerX:number = (this.selectedParts[0] instanceof JointPart ? this.selectedParts[0].anchorX : (this.selectedParts[0] instanceof TextPart ? this.selectedParts[0].x + this.selectedParts[0].w / 2 : this.selectedParts[0].centerX));
				var centerY:number = (this.selectedParts[0] instanceof JointPart ? this.selectedParts[0].anchorY : (this.selectedParts[0] instanceof TextPart ? this.selectedParts[0].y + this.selectedParts[0].h / 2 : this.selectedParts[0].centerY));
				var partMapping:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof Circle) {
						var c:Circle = new Circle(this.selectedParts[i].centerX, centerY - (this.selectedParts[i].centerY - centerY), this.selectedParts[i].radius);
						c.angle = 2 * Math.PI - this.selectedParts[i].angle;
						c.isStatic = this.selectedParts[i].isStatic;
						c.density = this.selectedParts[i].density;
						c.collide = this.selectedParts[i].collide;
						c.red = this.selectedParts[i].red;
						c.green = this.selectedParts[i].green;
						c.blue = this.selectedParts[i].blue;
						c.opacity = this.selectedParts[i].opacity;
						c.outline = this.selectedParts[i].outline;
						c.terrain = this.selectedParts[i].terrain;
						c.undragable = this.selectedParts[i].undragable;
						newParts.push(c);
						partMapping.push(c);
					} else if (this.selectedParts[i] instanceof Rectangle) {
						var r:Rectangle = new Rectangle(this.selectedParts[i].x, centerY - (this.selectedParts[i].y - centerY), this.selectedParts[i].w, -this.selectedParts[i].h);
						r.angle = 2 * Math.PI - this.selectedParts[i].angle;
						r.isStatic = this.selectedParts[i].isStatic;
						r.density = this.selectedParts[i].density;
						r.collide = this.selectedParts[i].collide;
						r.red = this.selectedParts[i].red;
						r.green = this.selectedParts[i].green;
						r.blue = this.selectedParts[i].blue;
						r.opacity = this.selectedParts[i].opacity;
						r.outline = this.selectedParts[i].outline;
						r.terrain = this.selectedParts[i].terrain;
						r.undragable = this.selectedParts[i].undragable;
						newParts.push(r);
						partMapping.push(r);
					} else if (this.selectedParts[i] instanceof Triangle) {
						var verts:Array<any> = this.selectedParts[i].GetVertices();
						var t:Triangle = new Triangle(verts[0].x, centerY - (verts[0].y - centerY), verts[1].x, centerY - (verts[1].y - centerY), verts[2].x, centerY - (verts[2].y - centerY));
						t.isStatic = this.selectedParts[i].isStatic;
						t.density = this.selectedParts[i].density;
						t.collide = this.selectedParts[i].collide;
						t.red = this.selectedParts[i].red;
						t.green = this.selectedParts[i].green;
						t.blue = this.selectedParts[i].blue;
						t.opacity = this.selectedParts[i].opacity;
						t.outline = this.selectedParts[i].outline;
						t.terrain = this.selectedParts[i].terrain;
						t.undragable = this.selectedParts[i].undragable;
						newParts.push(t);
						partMapping.push(t);
					} else if (this.selectedParts[i] instanceof Cannon) {
						var ca:Cannon = new Cannon(this.selectedParts[i].x, centerY - (this.selectedParts[i].y - centerY) - this.selectedParts[i].w / 2, this.selectedParts[i].w);
						ca.angle = 2 * Math.PI - this.selectedParts[i].angle;
						ca.isStatic = this.selectedParts[i].isStatic;
						ca.density = this.selectedParts[i].density;
						ca.collide = this.selectedParts[i].collide;
						ca.red = this.selectedParts[i].red;
						ca.green = this.selectedParts[i].green;
						ca.blue = this.selectedParts[i].blue;
						ca.opacity = this.selectedParts[i].opacity;
						ca.outline = this.selectedParts[i].outline;
						ca.terrain = this.selectedParts[i].terrain;
						ca.undragable = this.selectedParts[i].undragable;
						ca.fireKey = this.selectedParts[i].fireKey;
						ca.strength = this.selectedParts[i].strength;
						newParts.push(ca);
						partMapping.push(ca);
					} else if (this.selectedParts[i] instanceof TextPart) {
						var te:TextPart = new TextPart(this, this.selectedParts[i].x, centerY - (this.selectedParts[i].y + this.selectedParts[i].h / 2 - centerY), this.selectedParts[i].w, this.selectedParts[i].h, this.selectedParts[i].text, this.selectedParts[i].inFront);
						te.red = this.selectedParts[i].red;
						te.green = this.selectedParts[i].green;
						te.blue = this.selectedParts[i].blue;
						te.size = this.selectedParts[i].size;
						te.alwaysVisible = this.selectedParts[i].alwaysVisible;
						te.inFront = this.selectedParts[i].inFront;
						te.scaleWithZoom = this.selectedParts[i].scaleWithZoom;
						te.displayKey = this.selectedParts[i].displayKey;
						newParts.push(te);
						partMapping.push(-1);
					} else if (this.selectedParts[i] instanceof JointPart || this.selectedParts[i] instanceof Thrusters) {
						partMapping.push(-1);
					}
				}
				for (i = 0; i < this.selectedParts.length; i++) {
					var index1:number = -1, index2:number = -1;
					if (this.selectedParts[i] instanceof JointPart) {
						for (var j:number = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == this.selectedParts[i].part1) index1 = j;
							if (this.selectedParts[j] == this.selectedParts[i].part2) index2 = j;
						}
						if (index1 == -1 || index2 == -1) continue;
					} else if (this.selectedParts[i] instanceof Thrusters) {
						for (j = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == this.selectedParts[i].shape) index1 = j;
						}
						if (index1 == -1) continue;
					}
					if (this.selectedParts[i] instanceof FixedJoint) {
						var fj:FixedJoint = new FixedJoint(partMapping[index1], partMapping[index2], this.selectedParts[i].anchorX, centerY - (this.selectedParts[i].anchorY - centerY));
						newParts.push(fj);
					} else if (this.selectedParts[i] instanceof RevoluteJoint) {
						var rj:RevoluteJoint = new RevoluteJoint(partMapping[index1], partMapping[index2], this.selectedParts[i].anchorX, centerY - (this.selectedParts[i].anchorY - centerY));
						rj.enableMotor = this.selectedParts[i].enableMotor;
						rj.motorCWKey = this.selectedParts[i].motorCCWKey;
						rj.motorCCWKey = this.selectedParts[i].motorCWKey;
						rj.motorStrength = this.selectedParts[i].motorStrength;
						rj.motorSpeed = this.selectedParts[i].motorSpeed;
						rj.motorLowerLimit = -this.selectedParts[i].motorUpperLimit;
						rj.motorUpperLimit = -this.selectedParts[i].motorLowerLimit;
						rj.isStiff = this.selectedParts[i].isStiff;
						rj.autoCW = this.selectedParts[i].autoCCW;
						rj.autoCCW = this.selectedParts[i].autoCW;
						newParts.push(rj);
					} else if (this.selectedParts[i] instanceof PrismaticJoint) {
						var pj:PrismaticJoint = new PrismaticJoint(partMapping[index1], partMapping[index2], 0, 0, 1, 1);
						pj.anchorX = this.selectedParts[i].anchorX;
						pj.anchorY = centerY - (this.selectedParts[i].anchorY - centerY);
						var axisAngle:number = Math.atan2(this.selectedParts[i].axis.y, this.selectedParts[i].axis.x);
						axisAngle = Util.NormalizeAngle(2 * Math.PI - axisAngle);
						pj.axis = new b2Vec2(Math.cos(axisAngle), Math.sin(axisAngle));
						pj.axis.Normalize();
						pj.initLength = this.selectedParts[i].initLength;
						pj.enablePiston = this.selectedParts[i].enablePiston;
						pj.pistonUpKey = this.selectedParts[i].pistonUpKey;
						pj.pistonDownKey = this.selectedParts[i].pistonDownKey;
						pj.pistonStrength = this.selectedParts[i].pistonStrength;
						pj.pistonSpeed = this.selectedParts[i].pistonSpeed;
						pj.isStiff = this.selectedParts[i].isStiff;
						pj.autoOscillate = this.selectedParts[i].autoOscillate;
						pj.red = this.selectedParts[i].red;
						pj.green = this.selectedParts[i].green;
						pj.blue = this.selectedParts[i].blue;
						pj.opacity = this.selectedParts[i].opacity;
						pj.outline = this.selectedParts[i].outline;
						pj.collide = this.selectedParts[i].collide;
						newParts.push(pj);
					} else if (this.selectedParts[i] instanceof Thrusters) {
						var th:Thrusters = new Thrusters(partMapping[index1], this.selectedParts[i].centerX, centerY - (this.selectedParts[i].centerY - centerY));
						th.angle = 2 * Math.PI - this.selectedParts[i].angle;
						th.strength = this.selectedParts[i].strength;
						th.thrustKey = this.selectedParts[i].thrustKey;
						th.autoOn = this.selectedParts[i].autoOn;
						newParts.push(th);
					}
				}
				if (newParts.length > 0) {
					this.selectedParts = new Array();
					this.draggingParts = new Array();
					for (i = 0; i < newParts.length; i++) {
						newParts[i].dragXOff = centerX - (newParts[i] instanceof JointPart ? newParts[i].anchorX : (newParts[i] instanceof TextPart ? newParts[i].x - newParts[i].w / 2 : newParts[i].centerX));
						newParts[i].dragYOff = centerY - (newParts[i] instanceof JointPart ? newParts[i].anchorY : (newParts[i] instanceof TextPart ? newParts[i].y - newParts[i].h / 2 : newParts[i].centerY));
						this.selectedParts.push(newParts[i]);
						this.draggingParts.push(newParts[i]);
						this.allParts.push(newParts[i]);
					}
					this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
					this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
					this.draggingPart = this.selectedParts[0];
					this.draggingPart.Move(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
					this.RefreshSidePanel();
					this.AddAction(new MassCreateAction(this.selectedParts));
					this.curAction = ControllerGameGlobals.PASTE;
					ControllerGameGlobals.curRobotID = "";
				}
			} else {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("That feature instanceof only available to IncrediBots supporters. Become an IncrediBots supporter?", 8);
			}
		}

		public scaleButton(e:MouseEvent):void {
			if (/*Main.premiumMode*/ true) {
				if (!ControllerGameGlobals.curRobotEditable || this.selectingCondition) return;
				if (this.simStarted) return;
				if (this.selectedParts.length == 0) return;
				this.initDragX = (this.selectedParts[0] instanceof JointPart ? this.selectedParts[0].anchorX : (this.selectedParts[0] instanceof TextPart ? this.selectedParts[0].x + this.selectedParts[0].w / 2 : this.selectedParts[0].centerX));
				this.initDragY = (this.selectedParts[0] instanceof JointPart ? this.selectedParts[0].anchorY : (this.selectedParts[0] instanceof TextPart ? this.selectedParts[0].y + this.selectedParts[0].h / 2 : this.selectedParts[0].centerY));
				this.firstClickX = ControllerGameGlobals.mouseXWorld;
				this.firstClickY = ControllerGameGlobals.mouseYWorld;
				this.draggingParts = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					this.draggingParts = Util.RemoveDuplicates(this.draggingParts.concat(this.selectedParts[i].GetAttachedParts()));
				}
				for (i = 0; i < this.draggingParts.length; i++) {
					this.draggingParts[i].dragXOff = (this.draggingParts[i] instanceof JointPart ? this.draggingParts[i].anchorX : (this.draggingParts[i] instanceof TextPart ? this.draggingParts[i].x + this.draggingParts[i].w / 2 : this.draggingParts[i].centerX)) - this.initDragX;
					this.draggingParts[i].dragYOff = (this.draggingParts[i] instanceof JointPart ? this.draggingParts[i].anchorY : (this.draggingParts[i] instanceof TextPart ? this.draggingParts[i].y + this.draggingParts[i].h / 2 : this.draggingParts[i].centerY)) - this.initDragY;
					this.draggingParts[i].PrepareForResizing();
				}
				this.curAction = ControllerGameGlobals.RESIZING_SHAPES;
			} else {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("That feature instanceof only available to IncrediBots supporters. Become an IncrediBots supporter?", 8);
			}
		}

		public deleteButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable) return;
			if (this.simStarted) return;
			if (this.selectedParts.length == 1) {
				this.DeletePart(this.selectedParts[0]);
				this.curAction = -1;
				this.m_sidePanel.visible = false;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			}
		}

		public deleteBuildBoxButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable) return;
			if (this.simStarted) return;
			if (this.selectedBuildArea) {
				ControllerChallenge.challenge.buildAreas = Util.RemoveFromArray(this.selectedBuildArea, ControllerChallenge.challenge.buildAreas);
				this.BuildBuildArea();
				this.redrawBuildArea = true;
			}
			this.m_sidePanel.visible = false;
		}

		public multiDeleteButton(e:MouseEvent):void {
			if (!ControllerGameGlobals.curRobotEditable) return;
			if (this.simStarted) return;
			var affectedJoints:Array<any> = new Array();
			for (var i:number = 0; i < this.selectedParts.length; i++) {
				if (this.selectedParts[i] instanceof ShapePart) {
					affectedJoints = affectedJoints.concat(this.selectedParts[i].GetActiveJoints());
					affectedJoints = affectedJoints.concat(this.selectedParts[i].GetActiveThrusters());
				}
				this.DeletePart(this.selectedParts[i], false, false);
			}
			if (this.selectedParts.length != 0) {
				var deletedParts:Array<any> = Util.RemoveDuplicates(this.selectedParts.concat(affectedJoints));
				this.AddAction(new ClearAction(deletedParts));
				for (i = 0; i < deletedParts.length; i++) {
					this.selectedParts = Util.RemoveFromArray(deletedParts[i], this.selectedParts);
				}
				this.CheckIfPartsFit();
				this.m_sidePanel.visible = false;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			}
		}

		public densitySlider(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				var oldDensity:number = (this.selectedParts[0] as ShapePart).density;
				(this.selectedParts[0] as ShapePart).density = e.target.value;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.SetDensity(e.target.value);
				if (oldDensity != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.DENSITY_TYPE, e.target.value - oldDensity));
			}
		}

		public densityText(e:Event):void {
			if (this.lastSelectedShape instanceof ShapePart) {
				var oldDensity:number = (this.lastSelectedShape as ShapePart).density;
				var density:number = Number(e.target.text);
				if (density < ControllerGameGlobals.minDensity) density = ControllerGameGlobals.minDensity;
				if (density > ControllerGameGlobals.maxDensity) density = ControllerGameGlobals.maxDensity;
				if (isNaN(density)) {
					if (ControllerGameGlobals.minDensity > 15.0) {
						density = ControllerGameGlobals.minDensity;
					} else if (ControllerGameGlobals.maxDensity < 15.0) {
						density = ControllerGameGlobals.maxDensity;
					} else {
						density = 15.0;
					}
				}
				this.lastSelectedShape.density = density;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.SetDensity(density);
				if (oldDensity != density) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.DENSITY_TYPE, density - oldDensity));
			}
			this.m_sidePanel.TextAreaLostFocus();
		}

		public strengthText(e:Event):void {
			if (this.lastSelectedJoint instanceof JointPart) {
				var oldStrength:number;
				if (this.lastSelectedJoint instanceof RevoluteJoint) oldStrength = (this.lastSelectedJoint as RevoluteJoint).motorStrength;
				if (this.lastSelectedJoint instanceof PrismaticJoint) oldStrength = (this.lastSelectedJoint as PrismaticJoint).pistonStrength;
				var strength:number = Number(e.target.text);
				if (this.lastSelectedJoint instanceof RevoluteJoint) {
					if (strength < 1.0) strength = 1.0;
					if (strength > ControllerGameGlobals.maxRJStrength) strength = ControllerGameGlobals.maxRJStrength;
					if (isNaN(strength)) strength = Math.min(15.0, ControllerGameGlobals.maxRJStrength);
				}
				if (this.lastSelectedJoint instanceof PrismaticJoint) {
					if (strength < 1.0) strength = 1.0;
					if (strength > ControllerGameGlobals.maxSJStrength) strength = ControllerGameGlobals.maxSJStrength;
					if (isNaN(strength)) strength = Math.min(15.0, ControllerGameGlobals.maxSJStrength);
				}
				if (this.lastSelectedJoint instanceof RevoluteJoint) (this.lastSelectedJoint as RevoluteJoint).motorStrength = strength;
				if (this.lastSelectedJoint instanceof PrismaticJoint) (this.lastSelectedJoint as PrismaticJoint).pistonStrength = strength;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.SetStrength(strength);
				if (oldStrength != strength) this.AddAction(new ChangeSliderAction(this.lastSelectedJoint, ChangeSliderAction.STRENGTH_TYPE, strength - oldStrength));
			}
			this.m_sidePanel.TextAreaLostFocus();
		}

		public speedText(e:Event):void {
			if (this.lastSelectedJoint instanceof JointPart) {
				var oldSpeed:number;
				if (this.lastSelectedJoint instanceof RevoluteJoint) oldSpeed = (this.lastSelectedJoint as RevoluteJoint).motorSpeed;
				if (this.lastSelectedJoint instanceof PrismaticJoint) oldSpeed = (this.lastSelectedJoint as PrismaticJoint).pistonSpeed;
				var speed:number = Number(e.target.text);
				if (this.lastSelectedJoint instanceof RevoluteJoint) {
					if (speed < 1.0) speed = 1.0;
					if (speed > ControllerGameGlobals.maxRJSpeed) speed = ControllerGameGlobals.maxRJSpeed;
					if (isNaN(speed)) speed = Math.min(15.0, ControllerGameGlobals.maxRJSpeed);
				}
				if (this.lastSelectedJoint instanceof PrismaticJoint) {
					if (speed < 1.0) speed = 1.0;
					if (speed > ControllerGameGlobals.maxSJSpeed) speed = ControllerGameGlobals.maxSJSpeed;
					if (isNaN(speed)) speed = Math.min(15.0, ControllerGameGlobals.maxSJSpeed);
				}
				if (this.lastSelectedJoint instanceof RevoluteJoint) (this.lastSelectedJoint as RevoluteJoint).motorSpeed = speed;
				if (this.lastSelectedJoint instanceof PrismaticJoint) (this.lastSelectedJoint as PrismaticJoint).pistonSpeed = speed;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.SetSpeed(speed);
				if (oldSpeed != speed) this.AddAction(new ChangeSliderAction(this.lastSelectedJoint, ChangeSliderAction.SPEED_TYPE, speed - oldSpeed));
			}
			this.m_sidePanel.TextAreaLostFocus();
		}

		public thrustText(e:Event):void {
			if (this.lastSelectedThrusters instanceof Thrusters) {
				var oldStrength:number;
				oldStrength = this.lastSelectedThrusters.strength;
				var strength:number = Number(e.target.text);
				if (strength < 1.0) strength = 1.0;
				if (strength > ControllerGameGlobals.maxThrusterStrength) strength = ControllerGameGlobals.maxThrusterStrength;
				if (isNaN(strength)) strength = Math.min(15.0, ControllerGameGlobals.maxThrusterStrength);
				this.lastSelectedThrusters.strength = strength;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.SetThrust(strength);
				if (oldStrength != strength) this.AddAction(new ChangeSliderAction(this.lastSelectedThrusters, ChangeSliderAction.SPEED_TYPE, strength - oldStrength));
			}
			this.m_sidePanel.TextAreaLostFocus();
		}

		public cannonText(e:Event):void {
			if (this.lastSelectedShape instanceof Cannon) {
				var oldStrength:number;
				oldStrength = (this.lastSelectedShape as Cannon).strength;
				var strength:number = Number(e.target.text);
				if (strength < 1.0) strength = 1.0;
				if (strength > 30) strength = 30;
				if (isNaN(strength)) strength = 15;
				(this.lastSelectedShape as Cannon).strength = strength;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.SetCannon(strength);
				if (oldStrength != strength) this.AddAction(new ChangeSliderAction(this.lastSelectedShape, ChangeSliderAction.STRENGTH_TYPE, strength - oldStrength));
			}
			this.m_sidePanel.TextAreaLostFocus();
		}

		public cameraBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				(this.selectedParts[0] as ShapePart).isCameraFocus = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				var oldCameraPart:ShapePart = null;
				if (e.target.selected) {
					for (var i:number = 0; i < this.allParts.length; i++) {
						if (this.allParts[i] instanceof ShapePart && this.allParts[i] != this.selectedParts[0]) {
							if (this.allParts[i].isCameraFocus) {
								this.allParts[i].isCameraFocus = false;
								oldCameraPart = this.allParts[i];
							}
						}
					}
				}
				this.AddAction(new CameraAction(this.selectedParts[0], e.target.selected, oldCameraPart));
			}
		}

		public collisionBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				(this.selectedParts[0] as ShapePart).collide = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.AddAction(new ShapeCheckboxAction(this.selectedParts[0], ShapeCheckboxAction.COLLIDE_TYPE, e.target.selected));
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof PrismaticJoint) {
				(this.selectedParts[0] as PrismaticJoint).collide = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.AddAction(new ShapeCheckboxAction(this.selectedParts[0], ShapeCheckboxAction.COLLIDE_TYPE, e.target.selected));
			} else if (this.selectedParts.length > 1) {
				var affectedParts:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if ((this.selectedParts[i] instanceof ShapePart || this.selectedParts[i] instanceof PrismaticJoint) && this.selectedParts[i].collide != e.target.selected) {
						this.selectedParts[i].collide = e.target.selected;
						affectedParts.push(this.selectedParts[i]);
					}
				}
				if (affectedParts.length > 0) {
					ControllerGameGlobals.curRobotID = "";
					this.redrawRobot = true;
					this.AddAction(new MultiCollideAction(affectedParts, e.target.selected));
				}
			}
		}

		public fixateBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				(this.selectedParts[0] as ShapePart).isStatic = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
				this.AddAction(new ShapeCheckboxAction(this.selectedParts[0], ShapeCheckboxAction.FIXATE_TYPE, e.target.selected));
			} else if (this.selectedParts.length > 1) {
				var affectedParts:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof ShapePart && this.selectedParts[i].isStatic != e.target.selected) {
						this.selectedParts[i].isStatic = e.target.selected;
						affectedParts.push(this.selectedParts[i]);
					}
				}
				if (affectedParts.length > 0) {
					ControllerGameGlobals.curRobotID = "";
					this.redrawRobot = true;
					this.AddAction(new MultiFixateAction(affectedParts, e.target.selected));
				}
			}
		}

		public outlineBox(e:Event):void {
			if (this.selectedParts.length == 1 && (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof PrismaticJoint)) {
				this.selectedParts[0].outline = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
				this.AddAction(new ShapeCheckboxAction(this.selectedParts[0], ShapeCheckboxAction.OUTLINE_TYPE, e.target.selected));
			} else if (this.selectedParts.length > 1) {
				var affectedParts:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if ((this.selectedParts[i] instanceof ShapePart || this.selectedParts[i] instanceof PrismaticJoint) && this.selectedParts[i].outline != e.target.selected) {
						this.selectedParts[i].outline = e.target.selected;
						affectedParts.push(this.selectedParts[i]);
					}
				}
				if (affectedParts.length > 0) {
					ControllerGameGlobals.curRobotID = "";
					this.redrawRobot = true;
					this.AddAction(new MultiOutlineAction(affectedParts, e.target.selected));
				}
			}
		}

		public terrainBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				this.selectedParts[0].terrain = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
				this.AddAction(new ShapeCheckboxAction(this.selectedParts[0], ShapeCheckboxAction.TERRAIN_TYPE, e.target.selected));
			} else if (this.selectedParts.length > 1) {
				var affectedParts:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if ((this.selectedParts[i] instanceof ShapePart) && this.selectedParts[i].terrain != e.target.selected) {
						this.selectedParts[i].terrain = e.target.selected;
						affectedParts.push(this.selectedParts[i]);
					}
				}
				if (affectedParts.length > 0) {
					ControllerGameGlobals.curRobotID = "";
					this.redrawRobot = true;
					this.AddAction(new MultiTerrainAction(affectedParts, e.target.selected));
				}
			}
		}

		public undragableBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof ShapePart) {
				this.selectedParts[0].undragable = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.AddAction(new ShapeCheckboxAction(this.selectedParts[0], ShapeCheckboxAction.UNDRAGABLE_TYPE, e.target.selected));
			} else if (this.selectedParts.length > 1) {
				var affectedParts:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if ((this.selectedParts[i] instanceof ShapePart) && this.selectedParts[i].undragable != e.target.selected) {
						this.selectedParts[i].undragable = e.target.selected;
						affectedParts.push(this.selectedParts[i]);
					}
				}
				if (affectedParts.length > 0) {
					ControllerGameGlobals.curRobotID = "";
					this.redrawRobot = true;
					this.AddAction(new MultiUndragableAction(affectedParts, e.target.selected));
				}
			}
		}

		public frontButton(e:MouseEvent):void {
			if (this.simStarted) return;
			if (this.selectedParts.length == 1 && (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof PrismaticJoint)) {
				var oldIndex:number = -1;
				for (var i:number = 0; i < this.allParts.length; i++) {
					if (this.allParts[i] == this.selectedParts[0]) oldIndex = i;
				}
				this.allParts = Util.RemoveFromArray(this.selectedParts[0], this.allParts);
				this.allParts.push(this.selectedParts[0]);
				ControllerGameGlobals.curRobotID = "";
				this.AddAction(new MoveZAction(this.selectedParts[0], MoveZAction.FRONT_TYPE, oldIndex));
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
				if (!this.selectedParts[0].inFront) {
					this.selectedParts[0].inFront = true;
					this.removeChild(this.selectedParts[0].m_textField);
					this.addChildAt(this.selectedParts[0].m_textField, this.getChildIndex(this.m_canvas) + 1);
					this.AddAction(new MoveZAction(this.selectedParts[0], MoveZAction.FRONT_TYPE));
				}
			}
			this.redrawRobot = true;
		}

		public backButton(e:MouseEvent):void {
			if (this.simStarted) return;
			if (this.selectedParts.length == 1 && (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof PrismaticJoint)) {
				var oldIndex:number = -1;
				var foundIt:boolean = false;
				for (var i:number = this.allParts.length - 1; i > 0; i--) {
					if (this.allParts[i] == this.selectedParts[0]) {
						oldIndex = i;
						foundIt = true;
					}
					if (foundIt) {
						if (!this.allParts[i - 1].isEditable) {
							break;
						}
						this.allParts[i] = this.allParts[i - 1];
					}
				}
				this.allParts[i] = this.selectedParts[0];
				ControllerGameGlobals.curRobotID = "";
				this.AddAction(new MoveZAction(this.selectedParts[0], MoveZAction.BACK_TYPE, oldIndex));
			} else if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
				if (this.selectedParts[0].inFront) {
					this.selectedParts[0].inFront = false;
					this.removeChild(this.selectedParts[0].m_textField);
					this.addChildAt(this.selectedParts[0].m_textField, this.getChildIndex(this.m_canvas));
					this.AddAction(new MoveZAction(this.selectedParts[0], MoveZAction.BACK_TYPE));
				}
			}
			this.redrawRobot = true;
		}

		public scaleWithZoomBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
				(this.selectedParts[0] as TextPart).scaleWithZoom = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.AddAction(new TextCheckboxAction(this.selectedParts[0], TextCheckboxAction.SCALE_TYPE, e.target.selected));
			}
		}

		public alwaysVisibleBox(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
				(this.selectedParts[0] as TextPart).alwaysVisible = e.target.selected;
				ControllerGameGlobals.curRobotID = "";
				this.m_sidePanel.EnableTextStuff(!e.target.selected);
				this.AddAction(new TextCheckboxAction(this.selectedParts[0], TextCheckboxAction.DISPLAY_TYPE, e.target.selected));
			}
		}

		public textKeyBox(e:KeyboardEvent):void {
			if (e.currentTarget.enabled) {
				var str:String;
				if (this.selectedParts[0] instanceof TextPart) {
					var oldKey:number = (this.selectedParts[0] as TextPart).displayKey;
					(this.selectedParts[0] as TextPart).displayKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.TEXT_TYPE, oldKey, e.keyCode));
				}
				str = Input.getKeyString(e.keyCode);
				if (str == null) str = "Unk: " + e.keyCode;
				e.target.text = str;
				e.target.setSelection(0, 10);
				ControllerGameGlobals.curRobotID = "";
			}
		}

		public textEntered(e:Event):void {
			if (this.selectedParts[0] instanceof ShapePart) {
				this.lastSelectedShape = this.selectedParts[0];
			} else if (this.selectedParts[0] instanceof JointPart) {
				this.lastSelectedJoint = this.selectedParts[0];
			} else if (this.selectedParts[0] instanceof TextPart) {
				this.lastSelectedText = this.selectedParts[0];
			} else if (this.selectedParts[0] instanceof Thrusters) {
				this.lastSelectedThrusters = this.selectedParts[0];
			}
		}

		public colourButton(red:number, green:number, blue:number, opacity:number, defaultColour:boolean):void {
			var oldRed:number, oldGreen:number, oldBlue:number, oldOpacity:number;
			if (defaultColour) {
				ControllerGameGlobals.defaultR = red;
				ControllerGameGlobals.defaultG = green;
				ControllerGameGlobals.defaultB = blue;
				ControllerGameGlobals.defaultO = opacity;
			}
			if (this.selectedParts.length == 1) {
				if (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof PrismaticJoint || this.selectedParts[0] instanceof TextPart) {
					oldRed = this.selectedParts[0].red;
					oldGreen = this.selectedParts[0].green;
					oldBlue = this.selectedParts[0].blue;
					this.selectedParts[0].red = red;
					this.selectedParts[0].green = green;
					this.selectedParts[0].blue = blue;
					if (!(this.selectedParts[0] instanceof TextPart)) {
						oldOpacity = this.selectedParts[0].opacity;
						this.selectedParts[0].opacity = opacity;
					}
					if (oldRed != this.selectedParts[0].red || oldGreen != this.selectedParts[0].green || oldBlue != this.selectedParts[0].blue || (!(this.selectedParts[0] instanceof TextPart) && oldOpacity != this.selectedParts[0].opacity)) {
						this.AddAction(new ColourChangeAction(this.selectedParts[0], this.selectedParts[0].red - oldRed, this.selectedParts[0].green - oldGreen, this.selectedParts[0].blue - oldBlue, (this.selectedParts[0] instanceof TextPart ? 0 : this.selectedParts[0].opacity - oldOpacity)));
						ControllerGameGlobals.curRobotID = "";
						this.redrawRobot = true;
					}
				}
			} else if (this.selectedParts.length > 1) {
				var affectedParts:Array<any> = new Array();
				var oldReds:Array<any> = new Array();
				var oldGreens:Array<any> = new Array();
				var oldBlues:Array<any> = new Array();
				var oldOpacities:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof ShapePart || this.selectedParts[i] instanceof PrismaticJoint || this.selectedParts[i] instanceof TextPart) {
						if (this.selectedParts[i].red != red || this.selectedParts[i].green != green || this.selectedParts[i].blue != blue || (!(this.selectedParts[i] instanceof TextPart) && this.selectedParts[i].opacity != opacity)) {
							oldReds.push(this.selectedParts[i].red);
							oldGreens.push(this.selectedParts[i].green);
							oldBlues.push(this.selectedParts[i].blue);
							oldOpacities.push(this.selectedParts[i] instanceof TextPart ? 0 : this.selectedParts[i].opacity);
							this.selectedParts[i].red = red;
							this.selectedParts[i].green = green;
							this.selectedParts[i].blue = blue;
							if (!(this.selectedParts[i] instanceof TextPart)) this.selectedParts[i].opacity = opacity;
							affectedParts.push(this.selectedParts[i]);
						}
					}
				}
				if (affectedParts.length > 0) {
					ControllerGameGlobals.curRobotID = "";
					this.redrawRobot = true;
					this.AddAction(new MultiColourChangeAction(affectedParts, red, green, blue, opacity, oldReds, oldGreens, oldBlues, oldOpacities));
				}
			}
		}

		public textTextStart(e:Event):void {
			if (this.selectedParts.length == 1 && this.selectedParts[0] instanceof TextPart) {
				this.oldText = this.selectedParts[0].text;
			}
		}

		public textText(e:Event):void {
			this.textEntered(e);
			if (this.lastSelectedText instanceof TextPart) {
				this.newText = e.target;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			}
		}

		public textTextFinish(e:Event):void {
			if (this.lastSelectedText instanceof TextPart) {
				this.AddAction(new EnterTextAction(this.lastSelectedText, this.oldText, this.lastSelectedText.text));
			}
		}

		public sizeText(e:Event):void {
			if (this.lastSelectedText instanceof TextPart) {
				var oldSize:number = this.lastSelectedText.size;
				this.lastSelectedText.size = parseInt(e.target.text);
				if (this.lastSelectedText.size < 4) this.lastSelectedText.size = 4;
				if (this.lastSelectedText.size > 36) this.lastSelectedText.size = 36;
				e.target.text = this.lastSelectedText.size + "";
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
				if (oldSize != this.lastSelectedText.size) this.AddAction(new TextSizeChangeAction(this.lastSelectedText, this.lastSelectedText.size - oldSize));
			}
			this.m_sidePanel.TextAreaLostFocus();
		}

		public minLimitText(e:Event):void {
			var limit:number = Number(e.target.text.replace("\n", ""));
			if (e.target.text == "") limit = NaN;

			if (this.lastSelectedJoint instanceof RevoluteJoint) {
				if (isNaN(limit)) {
					limit = -Number.MAX_VALUE;
					e.target.text = "None";
				} else if (limit >= 0.0) {
					limit = 0;
					e.target.text = 0;
				}
				var oldLimit:number = (this.lastSelectedJoint as RevoluteJoint).motorLowerLimit;
				(this.lastSelectedJoint as RevoluteJoint).motorLowerLimit = limit;
				if (limit != oldLimit) this.AddAction(new LimitChangeAction(this.lastSelectedJoint, LimitChangeAction.MIN_TYPE, oldLimit, limit));
			}
			this.m_sidePanel.TextAreaLostFocus();
			ControllerGameGlobals.curRobotID = "";
		}

		public maxLimitText(e:Event):void {
			var limit:number = Number(e.target.text.replace("\n", ""));
			if (e.target.text == "") limit = NaN;

			if (this.lastSelectedJoint instanceof RevoluteJoint) {
				if (isNaN(limit)) {
					limit = Number.MAX_VALUE;
					e.target.text = "None";
				} else if (limit <= 0.0) {
					limit = 0;
					e.target.text = 0;
				}
				var oldLimit:number = (this.lastSelectedJoint as RevoluteJoint).motorUpperLimit;
				(this.lastSelectedJoint as RevoluteJoint).motorUpperLimit = limit;
				if (limit != oldLimit) this.AddAction(new LimitChangeAction(this.lastSelectedJoint, LimitChangeAction.MAX_TYPE, oldLimit, limit));
			}
			this.m_sidePanel.TextAreaLostFocus();
			ControllerGameGlobals.curRobotID = "";
		}

		public controlKeyText1(e:KeyboardEvent):void {
			if (e.currentTarget.enabled) {
				var str:String;
				var oldKey:number;
				if (this.selectedParts[0] instanceof RevoluteJoint) {
					oldKey = (this.selectedParts[0] as RevoluteJoint).motorCWKey;
					(this.selectedParts[0] as RevoluteJoint).motorCWKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.CW_TYPE, oldKey, e.keyCode));
				} else {
					oldKey = (this.selectedParts[0] as PrismaticJoint).pistonUpKey;
					(this.selectedParts[0] as PrismaticJoint).pistonUpKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.EXPAND_TYPE, oldKey, e.keyCode));
				}
				str = Input.getKeyString(e.keyCode);
				if (str == null) str = "Unk: " + e.keyCode;
				e.target.text = str;
				e.target.setSelection(0, 10);
				ControllerGameGlobals.curRobotID = "";
			}
		}

		public controlKeyText2(e:KeyboardEvent):void {
			if (e.currentTarget.enabled) {
				var str:String;
				var oldKey:number;
				if (this.selectedParts[0] instanceof RevoluteJoint) {
					oldKey = (this.selectedParts[0] as RevoluteJoint).motorCCWKey;
					(this.selectedParts[0] as RevoluteJoint).motorCCWKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.CCW_TYPE, oldKey, e.keyCode));
				} else {
					oldKey = (this.selectedParts[0] as PrismaticJoint).pistonDownKey;
					(this.selectedParts[0] as PrismaticJoint).pistonDownKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.CONTRACT_TYPE, oldKey, e.keyCode));
				}
				str = Input.getKeyString(e.keyCode);
				if (str == null) str = "Unk: " + e.keyCode;
				e.target.text = str;
				e.target.setSelection(0, 10);
				ControllerGameGlobals.curRobotID = "";
			}
		}

		public thrustKeyText(e:KeyboardEvent):void {
			if (e.currentTarget.enabled) {
				var str:String;
				var oldKey:number;
				if (this.selectedParts[0] instanceof Thrusters) {
					oldKey = (this.selectedParts[0] as Thrusters).thrustKey;
					(this.selectedParts[0] as Thrusters).thrustKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.THRUSTERS_TYPE, oldKey, e.keyCode));
				}
				str = Input.getKeyString(e.keyCode);
				if (str == null) str = "Unk: " + e.keyCode;
				e.target.text = str;
				e.target.setSelection(0, 10);
				ControllerGameGlobals.curRobotID = "";
			}
		}

		public fireKeyText(e:KeyboardEvent):void {
			if (e.currentTarget.enabled) {
				var str:String;
				var oldKey:number;
				if (this.selectedParts[0] instanceof Cannon) {
					oldKey = (this.selectedParts[0] as Cannon).fireKey;
					(this.selectedParts[0] as Cannon).fireKey = e.keyCode;
					if (oldKey != e.keyCode) this.AddAction(new ControlKeyAction(this.selectedParts[0], ControlKeyAction.CANNON_TYPE, oldKey, e.keyCode));
				}
				str = Input.getKeyString(e.keyCode);
				if (str == null) str = "Unk: " + e.keyCode;
				e.target.text = str;
				e.target.setSelection(0, 10);
				ControllerGameGlobals.curRobotID = "";
			}
		}

		public autoBox1(e:MouseEvent):void  {
			if (this.selectedParts[0] instanceof RevoluteJoint) {
				var sideEffect:boolean = (e.target.selected && (this.selectedParts[0] as RevoluteJoint).autoCCW);
				(this.selectedParts[0] as RevoluteJoint).autoCW = e.target.selected;
				if (e.target.selected) {
					(this.selectedParts[0] as RevoluteJoint).autoCCW = false;
					this.m_sidePanel.deselectBox2();
				}
				this.AddAction(new JointCheckboxAction(this.selectedParts[0], JointCheckboxAction.AUTO_CW_TYPE, e.target.selected, sideEffect));
			} else if (this.selectedParts[0] instanceof PrismaticJoint) {
				(this.selectedParts[0] as PrismaticJoint).autoOscillate = e.target.selected;
				this.AddAction(new JointCheckboxAction(this.selectedParts[0], JointCheckboxAction.AUTO_OSCILLATE_TYPE, e.target.selected));
			} else if (this.selectedParts[0] instanceof Thrusters) {
				(this.selectedParts[0] as Thrusters).autoOn = e.target.selected;
				this.AddAction(new JointCheckboxAction(this.selectedParts[0], JointCheckboxAction.AUTO_ON_TYPE, e.target.selected));
			}
			ControllerGameGlobals.curRobotID = "";
		}

		public autoBox2(e:MouseEvent):void  {
			if (this.selectedParts[0] instanceof RevoluteJoint) {
				var sideEffect:boolean = (e.target.selected && (this.selectedParts[0] as RevoluteJoint).autoCW);
				(this.selectedParts[0] as RevoluteJoint).autoCCW = e.target.selected;
				if (e.target.selected) {
					(this.selectedParts[0] as RevoluteJoint).autoCW = false;
					this.m_sidePanel.deselectBox1();
				}
				this.AddAction(new JointCheckboxAction(this.selectedParts[0], JointCheckboxAction.AUTO_CCW_TYPE, e.target.selected, sideEffect));
			}
			ControllerGameGlobals.curRobotID = "";
		}

		public motorBox(e:MouseEvent):void {
			if (this.selectedParts[0] instanceof RevoluteJoint) {
				(this.selectedParts[0] as RevoluteJoint).enableMotor = e.target.selected;
			} else if (this.selectedParts[0] instanceof PrismaticJoint) {
				(this.selectedParts[0] as PrismaticJoint).enablePiston = e.target.selected;
			}
			this.m_sidePanel.EnableMotorStuff(e.target.selected);
			ControllerGameGlobals.curRobotID = "";
			this.AddAction(new JointCheckboxAction(this.selectedParts[0], JointCheckboxAction.ENABLE_TYPE, e.target.selected));
		}

		public rigidBox(e:MouseEvent):void {
			if (this.selectedParts[0] instanceof RevoluteJoint) {
				(this.selectedParts[0] as RevoluteJoint).isStiff = !e.target.selected;
			} else if (this.selectedParts[0] instanceof PrismaticJoint) {
				(this.selectedParts[0] as PrismaticJoint).isStiff = !e.target.selected;
			}
			ControllerGameGlobals.curRobotID = "";
			this.AddAction(new JointCheckboxAction(this.selectedParts[0], JointCheckboxAction.RIGID_TYPE, e.target.selected));
		}

		public strengthSlider(e:Event):void {
			var oldStrength:number;
			if (this.selectedParts[0] instanceof RevoluteJoint) {
				oldStrength = (this.selectedParts[0] as RevoluteJoint).motorStrength;
				(this.selectedParts[0] as RevoluteJoint).motorStrength = e.target.value;
				if (oldStrength != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.STRENGTH_TYPE, e.target.value - oldStrength));
			} else if (this.selectedParts[0] instanceof PrismaticJoint) {
				oldStrength = (this.selectedParts[0] as PrismaticJoint).pistonStrength;
				(this.selectedParts[0] as PrismaticJoint).pistonStrength = e.target.value;
				if (oldStrength != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.STRENGTH_TYPE, e.target.value - oldStrength));
			}
			ControllerGameGlobals.curRobotID = "";
			this.m_sidePanel.SetStrength(e.target.value);
		}

		public speedSlider(e:Event):void {
			var oldSpeed:number;
			if (this.selectedParts[0] instanceof RevoluteJoint) {
				oldSpeed = (this.selectedParts[0] as RevoluteJoint).motorSpeed;
				(this.selectedParts[0] as RevoluteJoint).motorSpeed = e.target.value;
				if (oldSpeed != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.SPEED_TYPE, e.target.value - oldSpeed));
			} else if (this.selectedParts[0] instanceof PrismaticJoint) {
				oldSpeed = (this.selectedParts[0] as PrismaticJoint).pistonSpeed;
				(this.selectedParts[0] as PrismaticJoint).pistonSpeed = e.target.value;
				if (oldSpeed != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.SPEED_TYPE, e.target.value - oldSpeed));
			}
			ControllerGameGlobals.curRobotID = "";
			this.m_sidePanel.SetSpeed(e.target.value);
		}

		public thrustSlider(e:Event):void {
			var oldStrength:number;
			if (this.selectedParts[0] instanceof Thrusters) {
				oldStrength = (this.selectedParts[0] as Thrusters).strength;
				(this.selectedParts[0] as Thrusters).strength = e.target.value;
				if (oldStrength != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.STRENGTH_TYPE, e.target.value - oldStrength));
			}
			ControllerGameGlobals.curRobotID = "";
			this.m_sidePanel.SetThrust(e.target.value);
		}

		public cannonSlider(e:Event):void {
			var oldStrength:number;
			if (this.selectedParts[0] instanceof Cannon) {
				oldStrength = (this.selectedParts[0] as Cannon).strength;
				(this.selectedParts[0] as Cannon).strength = e.target.value;
				if (oldStrength != e.target.value) this.AddAction(new ChangeSliderAction(this.selectedParts[0], ChangeSliderAction.STRENGTH_TYPE, e.target.value - oldStrength));
			}
			ControllerGameGlobals.curRobotID = "";
			this.m_sidePanel.SetCannon(e.target.value);
		}

		public zoomInButton(e:MouseEvent):void {
			this.Zoom(true);
		}

		public zoomOutButton(e:MouseEvent):void {
			this.Zoom(false);
		}

		public clearButton(e:MouseEvent):void {
			if (this.simStarted) return;
			if (this.selectingCondition) return;
			var deletedParts:Array<any> = this.allParts.filter(this.PartIsEditable);
			for (var i:number = 0; i < deletedParts.length; i++) {
				if (deletedParts[i] instanceof ShapePart || deletedParts[i] instanceof TextPart) {
					this.DeletePart(deletedParts[i], false);
				}
			}
			if (deletedParts.length != 0) {
				if (ControllerGameGlobals.curRobotEditable) this.AddAction(new ClearAction(deletedParts));
				this.CheckIfPartsFit();
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			}
			if (!ControllerGameGlobals.curRobotEditable) ControllerGameGlobals.curRobotEditable = true;
			if (this.m_sidePanel && this.m_sidePanel.visible) this.m_sidePanel.visible = false;
		}

		public undoButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.curRobotEditable && this.lastAction != -1 && !this.simStarted) {
				this.actions[this.lastAction].UndoAction();
				this.lastAction--;
				this.curAction = -1;
				ControllerGameGlobals.curRobotID = "";
				this.CheckIfPartsFit();
				if (this.selectedParts.length == 0) this.m_sidePanel.visible = false;
				this.RefreshSidePanel();
				this.redrawRobot = true;
			}
		}

		public redoButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (ControllerGameGlobals.curRobotEditable && this.lastAction < this.actions.length - 1 && !this.simStarted) {
				this.actions[this.lastAction + 1].RedoAction();
				this.lastAction++;
				this.curAction = -1;
				ControllerGameGlobals.curRobotID = "";
				this.CheckIfPartsFit();
				if (this.selectedParts.length == 0) this.m_sidePanel.visible = false;
				this.RefreshSidePanel();
				this.redrawRobot = true;
			}
		}

		public cutButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (this.simStarted) return;
			this.copiedJoint = null;
			this.copiedThrusters = null;
			if (this.selectedParts.length == 1) {
				ControllerGameGlobals.clipboardParts = new Array();
				if (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof TextPart) {
					ControllerGameGlobals.clipboardParts.push(this.selectedParts[0].MakeCopy());
				} else if (this.selectedParts[0] instanceof JointPart) {
					this.copiedJoint = this.selectedParts[0];
				} else if (this.selectedParts[0] instanceof Thrusters) {
					this.copiedThrusters = this.selectedParts[0];
				}
				this.DeletePart(this.selectedParts[0]);
				this.m_sidePanel.visible = false;
				this.curAction = -1;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			} else if (this.selectedParts.length > 1) {
				ControllerGameGlobals.clipboardParts = new Array();
				var partMapping:Array<any> = new Array();
				var affectedJoints:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof ShapePart) {
						var copiedPart:ShapePart = (this.selectedParts[i] as ShapePart).MakeCopy();
						ControllerGameGlobals.clipboardParts.push(copiedPart);
						partMapping.push(copiedPart);
						affectedJoints = affectedJoints.concat(this.selectedParts[i].GetActiveJoints());
						this.DeletePart(this.selectedParts[i], false, false);
					} else if (this.selectedParts[i] instanceof TextPart) {
						ControllerGameGlobals.clipboardParts.push((this.selectedParts[i] as TextPart).MakeCopy());
						partMapping.push(-1);
						this.DeletePart(this.selectedParts[i], false, false);
					} else {
						partMapping.push(-1);
					}
				}
				for (i = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof JointPart) {
						var index1:number = -1, index2:number = -1;
						for (var j:number = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == (this.selectedParts[i] as JointPart).part1) index1 = j;
							if (this.selectedParts[j] == (this.selectedParts[i] as JointPart).part2) index2 = j;
						}
						if (index1 != -1 && index2 != -1) ControllerGameGlobals.clipboardParts.push((this.selectedParts[i] as JointPart).MakeCopy(partMapping[index1], partMapping[index2]));
						this.DeletePart(this.selectedParts[i], false, false);
					} else if (this.selectedParts[i] instanceof Thrusters) {
						index1 = -1;
						for (j = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == (this.selectedParts[i] as Thrusters).shape) index1 = j;
						}
						if (index1 != -1) ControllerGameGlobals.clipboardParts.push((this.selectedParts[i] as Thrusters).MakeCopy(partMapping[index1]));
						this.DeletePart(this.selectedParts[i], false, false);
					}
				}
				var deletedParts:Array<any> = Util.RemoveDuplicates(this.selectedParts.concat(affectedJoints));
				this.AddAction(new ClearAction(deletedParts));
				this.selectedParts = new Array();
				this.m_sidePanel.visible = false;
				this.CheckIfPartsFit();
				this.curAction = -1;
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			}
		}

		public copyButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (this.simStarted) return;
			this.copiedJoint = null;
			this.copiedThrusters = null;
			if (this.selectedParts.length == 1) {
				ControllerGameGlobals.clipboardParts = new Array();
				if (this.selectedParts[0] instanceof ShapePart || this.selectedParts[0] instanceof TextPart) {
					ControllerGameGlobals.clipboardParts.push(this.selectedParts[0].MakeCopy());
				} else if (this.selectedParts[0] instanceof JointPart) {
					this.copiedJoint = this.selectedParts[0];
				} else if (this.selectedParts[0] instanceof Thrusters) {
					this.copiedThrusters = this.selectedParts[0];
				}
				this.curAction = -1;
			} else if (this.selectedParts.length > 1) {
				ControllerGameGlobals.clipboardParts = new Array();
				var partMapping:Array<any> = new Array();
				for (var i:number = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof ShapePart) {
						var copiedPart:ShapePart = (this.selectedParts[i] as ShapePart).MakeCopy();
						ControllerGameGlobals.clipboardParts.push(copiedPart);
						partMapping.push(copiedPart);
					} else if (this.selectedParts[i] instanceof TextPart) {
						ControllerGameGlobals.clipboardParts.push((this.selectedParts[i] as TextPart).MakeCopy());
						partMapping.push(-1);
					} else {
						partMapping.push(-1);
					}
				}
				for (i = 0; i < this.selectedParts.length; i++) {
					if (this.selectedParts[i] instanceof JointPart) {
						var index1:number = -1, index2:number = -1;
						for (var j:number = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == (this.selectedParts[i] as JointPart).part1) index1 = j;
							if (this.selectedParts[j] == (this.selectedParts[i] as JointPart).part2) index2 = j;
						}
						if (index1 != -1 && index2 != -1) ControllerGameGlobals.clipboardParts.push((this.selectedParts[i] as JointPart).MakeCopy(partMapping[index1], partMapping[index2]));
					} else if (this.selectedParts[i] instanceof Thrusters) {
						index1 = -1;
						for (j = 0; j < this.selectedParts.length; j++) {
							if (this.selectedParts[j] == (this.selectedParts[i] as Thrusters).shape) index1 = j;
						}
						if (index1 != -1) ControllerGameGlobals.clipboardParts.push((this.selectedParts[i] as Thrusters).MakeCopy(partMapping[index1]));
					}
				}
				this.curAction = -1;
			}
		}

		public pasteButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (!ControllerGameGlobals.curRobotEditable) return;
			if (this.simStarted) return;
			var hasCircles:boolean = false;
			var hasRects:boolean = false;
			var hasTriangles:boolean = false;
			var hasFJs:boolean = false;
			var hasRJs:boolean = false;
			var hasSJs:boolean = false;
			var hasThrusters:boolean = false;
			var hasCannons:boolean = false;
			var hasStatic:boolean = false;
			for (var i:number = 0; i < ControllerGameGlobals.clipboardParts.length; i++) {
				if (ControllerGameGlobals.clipboardParts[i].isStatic) hasStatic = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof Circle) hasCircles = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof Rectangle) hasRects = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof Triangle) hasTriangles = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof FixedJoint) hasFJs = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof RevoluteJoint) hasRJs = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof PrismaticJoint) hasSJs = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof Thrusters) hasThrusters = true;
				if (ControllerGameGlobals.clipboardParts[i] instanceof Cannon) hasCannons = true;
			}
			if (this instanceof ControllerChallenge && ControllerChallenge.playChallengeMode && ((hasStatic && !ControllerChallenge.challenge.fixateAllowed) || (hasCircles && !ControllerChallenge.challenge.circlesAllowed) || (hasRects && !ControllerChallenge.challenge.rectanglesAllowed) || (hasTriangles && !ControllerChallenge.challenge.trianglesAllowed) || (hasFJs && !ControllerChallenge.challenge.fixedJointsAllowed) || (hasRJs && !ControllerChallenge.challenge.rotatingJointsAllowed) || (hasSJs && !ControllerChallenge.challenge.slidingJointsAllowed) || (hasThrusters && !ControllerChallenge.challenge.thrustersAllowed) || (hasCannons && !ControllerChallenge.challenge.cannonsAllowed))) {
				this.m_fader.visible = true;
				this.ShowDialog3("Sorry, some of the copied parts are not allowed in this challenge!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
				Main.ShowMouse();
				return;
			} else if (/*!Main.premiumMode && (hasThrusters || copiedThrusters)*/ false) {
				this.m_fader.visible = true;
				this.ShowDialog3("Sorry, only supporters are allowed to paste thrusters!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
				Main.ShowMouse();
				return;
			} else if (/*!Main.premiumMode && hasCannons*/ false) {
				this.m_fader.visible = true;
				this.ShowDialog3("Sorry, only supporters are allowed to paste cannons!");
				this.m_progressDialog.ShowOKButton();
				this.m_progressDialog.StopTimer();
				Main.ShowMouse();
				return;
			}
			if (ControllerGameGlobals.clipboardParts.length == 1 && ControllerGameGlobals.clipboardParts[0] instanceof ShapePart) {
				ControllerGameGlobals.clipboardParts[0].Move(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
				this.allParts.push(ControllerGameGlobals.clipboardParts[0]);
				this.selectedParts = new Array();
				this.selectedParts.push(ControllerGameGlobals.clipboardParts[0]);
				this.draggingPart = ControllerGameGlobals.clipboardParts[0];
				this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
				this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
				this.draggingParts = this.draggingPart.GetAttachedParts();
				this.draggingPart.dragXOff = 0;
				this.draggingPart.dragYOff = 0;
				if (ControllerGameGlobals.clipboardParts[0] instanceof Cannon) this.m_sidePanel.ShowCannonPanel(ControllerGameGlobals.clipboardParts[0]);
				else this.m_sidePanel.ShowObjectPanel(ControllerGameGlobals.clipboardParts[0]);
				this.AddAction(new CreateAction(ControllerGameGlobals.clipboardParts[0]));
				ControllerGameGlobals.clipboardParts[0] = ControllerGameGlobals.clipboardParts[0].MakeCopy();
				this.curAction = ControllerGameGlobals.PASTE;
				ControllerGameGlobals.curRobotID = "";
			} else if (this.copiedJoint) {
				if (this.copiedJoint instanceof FixedJoint) {
					this.curAction = ControllerGameGlobals.NEW_FIXED_JOINT;
				} else if (this.copiedJoint instanceof RevoluteJoint) {
					this.curAction = ControllerGameGlobals.NEW_REVOLUTE_JOINT;
				} else {
					this.curAction = ControllerGameGlobals.NEW_PRISMATIC_JOINT;
				}
				this.actionStep = 0;
			} else if (this.copiedThrusters) {
				this.curAction = ControllerGameGlobals.NEW_THRUSTERS;
			} else {
				this.draggingPart = null;
				this.m_sidePanel.visible = false;
				this.selectedParts = new Array();
				this.draggingParts = new Array();
				for (i = 0; i < ControllerGameGlobals.clipboardParts.length; i++) {
					if (ControllerGameGlobals.clipboardParts[i] instanceof ShapePart) {
						if (!this.draggingPart || this.draggingPart instanceof TextPart || ControllerGameGlobals.clipboardParts[i].GetMass() > (this.draggingPart as ShapePart).GetMass()) this.draggingPart = ControllerGameGlobals.clipboardParts[i];
					} else if (ControllerGameGlobals.clipboardParts[i] instanceof TextPart && !this.draggingPart) {
						this.draggingPart = ControllerGameGlobals.clipboardParts[i];
					}
				}

				var oldClipboardParts:Array<any> = new Array();
				for (i = 0; i < ControllerGameGlobals.clipboardParts.length; i++) {
					oldClipboardParts.push(ControllerGameGlobals.clipboardParts[i]);
				}
				for (i = 0; i < ControllerGameGlobals.clipboardParts.length; i++) {
					if (ControllerGameGlobals.clipboardParts[i] instanceof ShapePart) {
						ControllerGameGlobals.clipboardParts[i].dragXOff = (this.draggingPart as ShapePart).centerX - ControllerGameGlobals.clipboardParts[i].centerX;
						ControllerGameGlobals.clipboardParts[i].dragYOff = (this.draggingPart as ShapePart).centerY - ControllerGameGlobals.clipboardParts[i].centerY;
						this.allParts.push(ControllerGameGlobals.clipboardParts[i]);
						this.selectedParts.push(ControllerGameGlobals.clipboardParts[i]);
						this.draggingParts = Util.RemoveDuplicates(this.draggingParts.concat(ControllerGameGlobals.clipboardParts[i].GetAttachedParts()));
						ControllerGameGlobals.clipboardParts[i] = ControllerGameGlobals.clipboardParts[i].MakeCopy();
						if (oldClipboardParts[i] != this.draggingPart) oldClipboardParts[i].Move(oldClipboardParts[i].centerX - (this.draggingPart as ShapePart).centerX + ControllerGameGlobals.mouseXWorldPhys, oldClipboardParts[i].centerY - (this.draggingPart as ShapePart).centerY + ControllerGameGlobals.mouseYWorldPhys);
					} else if (ControllerGameGlobals.clipboardParts[i] instanceof TextPart) {
						if (this.draggingPart instanceof ShapePart) {
							ControllerGameGlobals.clipboardParts[i].dragXOff = (this.draggingPart as ShapePart).centerX - ControllerGameGlobals.clipboardParts[i].x;
							ControllerGameGlobals.clipboardParts[i].dragYOff = (this.draggingPart as ShapePart).centerY - ControllerGameGlobals.clipboardParts[i].y;
						} else {
							ControllerGameGlobals.clipboardParts[i].dragXOff = (this.draggingPart as TextPart).x - ControllerGameGlobals.clipboardParts[i].x;
							ControllerGameGlobals.clipboardParts[i].dragYOff = (this.draggingPart as TextPart).y - ControllerGameGlobals.clipboardParts[i].y;
						}
						this.allParts.push(ControllerGameGlobals.clipboardParts[i]);
						this.selectedParts.push(ControllerGameGlobals.clipboardParts[i]);
						this.draggingParts = this.draggingParts.concat(ControllerGameGlobals.clipboardParts[i].GetAttachedParts());
						ControllerGameGlobals.clipboardParts[i] = ControllerGameGlobals.clipboardParts[i].MakeCopy();
						if (oldClipboardParts[i] != this.draggingPart) {
							if (this.draggingPart instanceof ShapePart) {
								oldClipboardParts[i].Move(oldClipboardParts[i].x - (this.draggingPart as ShapePart).centerX + ControllerGameGlobals.mouseXWorldPhys, oldClipboardParts[i].y - (this.draggingPart as ShapePart).centerY + ControllerGameGlobals.mouseYWorldPhys);
							} else {
								oldClipboardParts[i].Move(oldClipboardParts[i].x - (this.draggingPart as TextPart).x + ControllerGameGlobals.mouseXWorldPhys, oldClipboardParts[i].y - (this.draggingPart as TextPart).y + ControllerGameGlobals.mouseYWorldPhys);
							}
						}
					}
				}
				for (i = 0; i < ControllerGameGlobals.clipboardParts.length; i++) {
					if (ControllerGameGlobals.clipboardParts[i] instanceof JointPart) {
						ControllerGameGlobals.clipboardParts[i].dragXOff = (this.draggingPart as ShapePart).centerX - ControllerGameGlobals.clipboardParts[i].anchorX;
						ControllerGameGlobals.clipboardParts[i].dragYOff = (this.draggingPart as ShapePart).centerY - ControllerGameGlobals.clipboardParts[i].anchorY;
						this.allParts.push(ControllerGameGlobals.clipboardParts[i]);
						this.selectedParts.push(ControllerGameGlobals.clipboardParts[i]);
						var index1:number = -1, index2:number = -1;
						for (var j:number = 0; j < oldClipboardParts.length; j++) {
							if (oldClipboardParts[j] == (ControllerGameGlobals.clipboardParts[i] as JointPart).part1) index1 = j;
							if (oldClipboardParts[j] == (ControllerGameGlobals.clipboardParts[i] as JointPart).part2) index2 = j;
						}
						ControllerGameGlobals.clipboardParts[i] = ControllerGameGlobals.clipboardParts[i].MakeCopy(ControllerGameGlobals.clipboardParts[index1], ControllerGameGlobals.clipboardParts[index2]);
						oldClipboardParts[i].Move(oldClipboardParts[i].anchorX - (this.draggingPart as ShapePart).centerX + ControllerGameGlobals.mouseXWorldPhys, oldClipboardParts[i].anchorY - (this.draggingPart as ShapePart).centerY + ControllerGameGlobals.mouseYWorldPhys);
					} else if (ControllerGameGlobals.clipboardParts[i] instanceof Thrusters) {
						ControllerGameGlobals.clipboardParts[i].dragXOff = (this.draggingPart as ShapePart).centerX - ControllerGameGlobals.clipboardParts[i].centerX;
						ControllerGameGlobals.clipboardParts[i].dragYOff = (this.draggingPart as ShapePart).centerY - ControllerGameGlobals.clipboardParts[i].centerY;
						this.allParts.push(ControllerGameGlobals.clipboardParts[i]);
						this.selectedParts.push(ControllerGameGlobals.clipboardParts[i]);
						index1 = -1;
						for (j = 0; j < oldClipboardParts.length; j++) {
							if (oldClipboardParts[j] == (ControllerGameGlobals.clipboardParts[i] as Thrusters).shape) index1 = j;
						}
						ControllerGameGlobals.clipboardParts[i] = ControllerGameGlobals.clipboardParts[i].MakeCopy(ControllerGameGlobals.clipboardParts[index1]);
						oldClipboardParts[i].Move(oldClipboardParts[i].centerX - (this.draggingPart as ShapePart).centerX + ControllerGameGlobals.mouseXWorldPhys, oldClipboardParts[i].centerY - (this.draggingPart as ShapePart).centerY + ControllerGameGlobals.mouseYWorldPhys);
					}
				}
				if (this.draggingPart) {
					this.initDragX = ControllerGameGlobals.mouseXWorldPhys;
					this.initDragY = ControllerGameGlobals.mouseYWorldPhys;
					this.draggingPart.Move(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
					this.m_sidePanel.ShowMultiSelectPanel(this.selectedParts);
					this.AddAction(new MassCreateAction(this.selectedParts));
					this.curAction = ControllerGameGlobals.PASTE;
					ControllerGameGlobals.curRobotID = "";
				}
			}
		}

		public centerBox(e:MouseEvent):void {
			ControllerGameGlobals.snapToCenter = !ControllerGameGlobals.snapToCenter;
		}

		public jointBox(e:MouseEvent):void {
			ControllerGameGlobals.showJoints = !ControllerGameGlobals.showJoints
			this.redrawRobot = true;
		}

		public globalOutlineBox(e:MouseEvent):void {
			ControllerGameGlobals.showOutlines = !ControllerGameGlobals.showOutlines;
			this.redrawRobot = true;
		}

		public colourBox(e:MouseEvent):void {
			ControllerGameGlobals.showColours = !ControllerGameGlobals.showColours;
			if (ControllerGameGlobals.showColours) this.draw.m_fillAlpha = 1.0;
			else this.draw.m_fillAlpha = 0.5;
			this.redrawRobot = true;
		}

		public centerOnSelectedBox(e:MouseEvent):void {
			ControllerGameGlobals.centerOnSelected = !ControllerGameGlobals.centerOnSelected;
			if (ControllerGameGlobals.centerOnSelected && this.selectedParts.length == 1) {
				this.CenterOnSelected();
			}
		}

		public ConfirmNewRobot(e:MouseEvent):void {
			Main.changeControllers = true;
			Main.nextControllerType = -1;
			ControllerGameGlobals.playingReplay = false;
			ControllerGameGlobals.viewingUnsavedReplay = false;
		}

		public loginButton(e:MouseEvent, displayMessage:boolean = false, backToSave:boolean = false, saveLoadWindowOpen:boolean = false):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				this.m_fader.visible = true;
				if (this.m_loginWindow) this.removeChild(this.m_loginWindow);
				this.m_loginWindow = new LoginWindow(this);
				if (displayMessage) this.m_loginWindow.displayMessage();
				this.addChild(this.m_loginWindow);
				this.backToSaveWindow = backToSave;
			}
		}

		public logoutButton(e:MouseEvent):void {
			this.m_fader.visible = true;
			this.ShowConfirmDialog("Are you sure you want to log " + ControllerGameGlobals.userName +  " out?", 12);
		}

		public ConfirmLogout(e:MouseEvent):void {
			Main.premiumMode = false;
			ControllerGameGlobals.userName = "_Public";
			this.m_guiPanel.ShowLogin();
			this.ShowDialog3("You are now logged out.");
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
			this.m_fader.visible = true;
		}

		public loginHidden(e:Event, success:boolean):void {
			if (this.clickedSave) {
				this.clickedSave = false;
				this.saveButton(new MouseEvent(""));
			} else if (this.clickedSaveReplay) {
				this.clickedSaveReplay = false;
				this.saveReplayButton(new MouseEvent(""));
			} else if (this.clickedSaveChallenge) {
				this.clickedSaveChallenge = false;
				this.saveButton(new MouseEvent(""));
			} else if (this.clickedSubmitScore) {
				this.AddSyncPoint();
				if (ControllerGameGlobals.viewingUnsavedReplay) Database.SaveReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, ControllerGameGlobals.replay, "_ScoreReplay", "This replay instanceof saved for a score", ControllerGameGlobals.curRobotID, new Robot(this.allParts, ControllerSandbox.settings), (this.ChallengeOver() ? this.GetScore() : -1), ControllerGameGlobals.curChallengeID, 1, this.finishSavingReplay);
				else Database.SaveReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, new Replay(this.cameraMovements, this.syncPoints, this.keyPresses, this.frameCounter, Database.VERSION_STRING_FOR_REPLAYS), "_ScoreReplay", "This replay instanceof saved for a score", ControllerGameGlobals.curRobotID, new Robot(this.allParts, ControllerSandbox.settings), (this.ChallengeOver() ? this.GetScore() : -1), ControllerGameGlobals.curChallengeID, 1, this.finishSavingReplay);
				this.m_scoreWindow.ShowFader();
				this.ShowDialog("Submitting score...");
				Main.ShowHourglass();
			} else if (this.clickedReport) {
				this.clickedReport = false;
				this.reportButton(new MouseEvent(""));
			} else if (this.backToSaveWindow) {
				this.m_fader.visible = true;
				if (this.m_chooserWindow.visible) {
					if (success) {
						this.m_chooserWindow.reportClicked(new MouseEvent(""));
					} else {
						this.m_chooserWindow.HideFader();
					}
				} else {
					this.m_chooserWindow.visible = true;
					if (this.m_chooserWindow.dataType == SaveLoadWindow.HIGH_SCORE_TYPE) {
						Database.GetScoreData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.highScoresChallenge, this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 1, this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2, (success && this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2 ? Database.SORT_BY_SCORE : Database.highScoresSortType), (success && this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2 ? 1 : Database.curScorePage), (success && this.m_chooserWindow.m_scoreTypeBox && this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2 ? "" : Database.curSearch), this.finishGettingScoreData);
						this.ShowDialog("Getting scores...");
					} else if (this.m_chooserWindow.dataType == SaveLoadWindow.LOAD_ROBOT_TYPE) {
						Database.GetRobotData(ControllerGameGlobals.userName, ControllerGameGlobals.password, !this.m_chooserWindow.yourRobotsBox.selected, (success && this.m_chooserWindow.yourRobotsBox.selected ? Database.SORT_BY_EDIT_TIME : Database.curSortType), (success && this.m_chooserWindow.yourRobotsBox.selected ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), (success && this.m_chooserWindow.yourRobotsBox.selected ? 1 : Database.curRobotPage), (success && this.m_chooserWindow.m_scoreTypeBox && this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2 ? "" : Database.curSearch), this.finishGettingLoadRobotData);
						this.ShowDialog("Getting robots...");
					} else if (this.m_chooserWindow.dataType == SaveLoadWindow.LOAD_CHALLENGE_TYPE) {
						if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
						Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, !this.m_chooserWindow.yourRobotsBox.selected, (success && this.m_chooserWindow.yourRobotsBox.selected ? Database.SORT_BY_EDIT_TIME : Database.curSortType), (success && this.m_chooserWindow.yourRobotsBox.selected ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), (success && this.m_chooserWindow.yourRobotsBox.selected ? 1 : Database.curReplayPage), (success && this.m_chooserWindow.m_scoreTypeBox && this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2 ? "" : Database.curSearch), this.finishGettingLoadChallengeData);
						this.ShowDialog("Getting challenges...");
					} else {
						if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
						Database.GetReplayData(ControllerGameGlobals.userName, ControllerGameGlobals.password, !this.m_chooserWindow.yourRobotsBox.selected, (success && this.m_chooserWindow.yourRobotsBox.selected ? Database.SORT_BY_EDIT_TIME : Database.curSortType), (success && this.m_chooserWindow.yourRobotsBox.selected ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), (success && this.m_chooserWindow.yourRobotsBox.selected ? 1 : Database.curReplayPage), (success && this.m_chooserWindow.m_scoreTypeBox && this.m_chooserWindow.m_scoreTypeBox.selectedIndex == 2 ? "" : Database.curSearch), this.finishGettingLoadReplayData);
						this.ShowDialog("Getting replays...");
					}
					this.m_chooserWindow.ShowFader();
					Main.ShowHourglass();
				}
			}
		}

		public viewReplayButton(e:MouseEvent):void {
			if (ControllerGameGlobals.viewingUnsavedReplay) {
				this.m_fader.visible = false;
				this.m_scoreWindow.visible = false;
				this.resetButton(e);
			} else {
				this.resetButton(e);
				ControllerGameGlobals.replay = new Replay(this.cameraMovements, this.syncPoints, this.keyPresses, this.frameCounter, Database.VERSION_STRING_FOR_REPLAYS);
				ControllerGameGlobals.replayParts = this.allParts.filter(this.IsPartOfRobot);
				ControllerGameGlobals.playingReplay = true;
				Main.changeControllers = true;
				ControllerGameGlobals.viewingUnsavedReplay = true;
			}
		}

		public newButton(e:MouseEvent):void {
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				var partsExist:boolean = false;
				for (var i:number = 0; i < this.allParts.length; i++) {
					if (this.allParts[i].isEditable) {
						partsExist = true;
						break;
					}
				}
				if (this instanceof ControllerTutorial || this instanceof ControllerHomeMovies || this instanceof ControllerRubeGoldberg || this instanceof ControllerNewFeatures || this instanceof ControllerChallengeEditor || (ControllerGameGlobals.curRobotID != "" && (!(this instanceof ControllerChallenge) || ControllerGameGlobals.curChallengeID != "")) || (!partsExist && !(this instanceof ControllerChallenge))) {
					this.ConfirmNewRobot(e);
				} else {
					this.m_fader.visible = true;
					if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
					this.ShowConfirmDialog("Exit to main menu?     (Unsaved changes will be lost)", 4);
				}
			}
		}

		public saveButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				if (!ControllerGameGlobals.curRobotEditable || ControllerGameGlobals.playingReplay) return;
				if (true || ControllerGameGlobals.userName != "_Public") {
					if (/*!Main.premiumMode*/ false) {
						for (var i:number = 0; i < this.allParts.length; i++) {
							if (this.allParts[i] instanceof Thrusters) {
								this.m_fader.visible = true;
								this.ShowDialog3("Sorry, only supporters are allowed to save robots containing thrusters!");
								this.m_progressDialog.ShowOKButton();
								this.m_progressDialog.StopTimer();
								Main.ShowMouse();
								return;
							}
							if (this.allParts[i] instanceof Cannon) {
								this.m_fader.visible = true;
								this.ShowDialog3("Sorry, only supporters are allowed to save robots containing cannons!");
								this.m_progressDialog.ShowOKButton();
								this.m_progressDialog.StopTimer();
								Main.ShowMouse();
								return;
							}
						}
					}
					if (this instanceof ControllerChallenge && !ControllerChallenge.playChallengeMode) {
						if (this.m_restrictionsDialog) this.removeChild(this.m_restrictionsDialog);
						this.m_restrictionsDialog = new RestrictionsWindow(this as ControllerChallenge);
						this.addChild(this.m_restrictionsDialog);
						this.saveAfterRestrictions = true;
					} else {
						//Database.GetRobotData(userName, password, false, Database.curSortType, (Database.curSortPeriod == Database.SORT_PERIOD_FEATURED ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), 1, "", finishGettingSaveRobotData);
						//ShowDialog("Getting robots...");
						//Main.ShowHourglass();
						Database.ExportRobot(new Robot(this.allParts.filter(this.PartIsEditable), ControllerSandbox.settings, this.draw.m_drawXOff, this.draw.m_drawYOff, this.m_physScale), "", "", 1, 1, 0, this.finishExporting);
					}
					this.m_fader.visible = true;
					this.curAction = -1;
				} else {
					this.clickedSave = true;
					this.loginButton(e, true, false);
				}
			}
		}

		public loadAndInsertButton(e:MouseEvent):void {
			if (ControllerGameGlobals.curRobotEditable && !this.selectingCondition && !ControllerGameGlobals.playingReplay) {
				ControllerGameGlobals.loadAndInsert = true;
				this.loadRobotButton(e);
			}
		}

		public loadButton(e:MouseEvent, makeThemRate:boolean = true):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else if (makeThemRate && ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic && !ControllerGameGlobals.ratedCurReplay && !LSOManager.HasRatedReplay(ControllerGameGlobals.curReplayID)) {
				ControllerGameGlobals.ratedCurReplay = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 1, 1);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic && !ControllerGameGlobals.ratedCurChallenge && !LSOManager.HasRatedChallenge(ControllerGameGlobals.curChallengeID)) {
				ControllerGameGlobals.ratedCurChallenge = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 2, 1);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				if (this.simStarted) {
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic && !ControllerGameGlobals.ratedCurRobot && !LSOManager.HasRatedRobot(ControllerGameGlobals.curRobotID)) {
				ControllerGameGlobals.ratedCurRobot = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 0, 1);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				if (this.simStarted) {
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else {
				this.m_fader.visible = true;
				if (this.m_loadWindow) this.removeChild(this.m_loadWindow);
				this.m_loadWindow = new LoadWindow(this);
				this.addChild(this.m_loadWindow);
			}
		}

		public loadRobotButton(e:MouseEvent, makeThemRate:boolean = true):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else if (makeThemRate && ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic && !ControllerGameGlobals.ratedCurReplay && !LSOManager.HasRatedReplay(ControllerGameGlobals.curReplayID)) {
				ControllerGameGlobals.ratedCurReplay = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 1, 2);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic && !ControllerGameGlobals.ratedCurChallenge && !LSOManager.HasRatedChallenge(ControllerGameGlobals.curChallengeID)) {
				ControllerGameGlobals.ratedCurChallenge = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 2, 2);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				if (this.simStarted) {
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic && !ControllerGameGlobals.ratedCurRobot && !LSOManager.HasRatedRobot(ControllerGameGlobals.curRobotID)) {
				ControllerGameGlobals.ratedCurRobot = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 0, 2);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else {
				Database.GetRobotData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.curShared, Database.curSortType, Database.curSortPeriod, (Database.curShared ? Database.curRobotPage : 1), "", this.finishGettingLoadRobotData);
				this.m_fader.visible = true;
				this.ShowDialog("Getting robots...");
				Main.ShowHourglass();
				this.curAction = -1;
			}
		}

		public finishSaving(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_SAVE_ROBOT) return;
			var robotID:String = Database.FinishSavingRobot(e);
			if (robotID != "") {
				ControllerGameGlobals.curRobotID = robotID;
				ControllerGameGlobals.ratedCurRobot = true;
				ControllerGameGlobals.curRobotPublic = ControllerGameGlobals.potentialRobotPublic;
				ControllerGameGlobals.curRobotFeatured = ControllerGameGlobals.potentialRobotFeatured;
				this.m_progressDialog.SetMessage("Save successful!");
				this.m_progressDialog.HideInXSeconds(1);
				this.m_chooserWindow.visible = false;
				this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = null;
				this.m_fader.visible = false;
			}
		}

		public finishGettingSaveRobotData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_ROBOT_DATA) return;
			if (Database.FinishGettingRobotData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.SAVE_ROBOT_TYPE);
				this.addChild(this.m_chooserWindow);
			}
		}

		public finishGettingLoadRobotData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_ROBOT_DATA) return;
			if (Database.FinishGettingRobotData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_ROBOT_TYPE);
				this.addChild(this.m_chooserWindow);
			}
		}

		public finishLoading(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOAD_ROBOT) return;
			var robot:Robot = Database.FinishLoadingRobot(e);
			this.processLoadedRobot(robot);
		}

		public processLoadedRobot(robot:Robot):void {
			if (robot) {
				var newParts:Array<any> = robot.allParts;
				if (ControllerGameGlobals.loadAndInsert) {
					ControllerGameGlobals.loadAndInsert = false;
					var hasCircles:boolean = false;
					var hasRects:boolean = false;
					var hasTriangles:boolean = false;
					var hasFJs:boolean = false;
					var hasRJs:boolean = false;
					var hasSJs:boolean = false;
					var hasThrusters:boolean = false;
					var hasCannons:boolean = false;
					var hasStatic:boolean = false;
					for (var i:number = 0; i < newParts.length; i++) {
						if (newParts[i].isStatic) hasStatic = true;
						if (newParts[i] instanceof Circle) hasCircles = true;
						if (newParts[i] instanceof Rectangle) hasRects = true;
						if (newParts[i] instanceof Triangle) hasTriangles = true;
						if (newParts[i] instanceof FixedJoint) hasFJs = true;
						if (newParts[i] instanceof RevoluteJoint) hasRJs = true;
						if (newParts[i] instanceof PrismaticJoint) hasSJs = true;
						if (newParts[i] instanceof Thrusters) hasThrusters = true;
						if (newParts[i] instanceof Cannon) hasCannons = true;
					}
					if (this instanceof ControllerChallenge && ((hasStatic && !ControllerChallenge.challenge.fixateAllowed) || (hasCircles && !ControllerChallenge.challenge.circlesAllowed) || (hasRects && !ControllerChallenge.challenge.rectanglesAllowed) || (hasTriangles && !ControllerChallenge.challenge.trianglesAllowed) || (hasFJs && !ControllerChallenge.challenge.fixedJointsAllowed) || (hasRJs && !ControllerChallenge.challenge.rotatingJointsAllowed) || (hasSJs && !ControllerChallenge.challenge.slidingJointsAllowed) || (hasThrusters && !ControllerChallenge.challenge.thrustersAllowed) || (hasCannons && !ControllerChallenge.challenge.cannonsAllowed))) {
						this.m_fader.visible = true;
						ControllerGameGlobals.loadAndInsert = true;
						this.ShowDialog3("Sorry, that robot contains parts that are not allowed in this challenge!");
						this.m_progressDialog.ShowOKButton();
						this.m_progressDialog.StopTimer();
						Main.ShowMouse();
						return;
					} else {
						ControllerGameGlobals.curRobotID = "";
						this.allParts = this.allParts.concat(newParts);
						this.CheckIfPartsFit();
						this.m_progressDialog.SetMessage("Load successful!");
						this.m_progressDialog.HideInXSeconds(1);
						if (this.m_chooserWindow) {
							this.m_chooserWindow.visible = false;
							this.removeChild(this.m_chooserWindow);
							this.m_chooserWindow = null;
						}
						this.m_fader.visible = false;
						ControllerGameGlobals.curRobotEditable = (ControllerGameGlobals.potentialRobotEditable/* && ((!hasThrusters && !hasCannons) || Main.premiumMode)*/);
						ControllerGameGlobals.curRobotPublic = false;
						ControllerGameGlobals.curRobotFeatured = false;
						this.redrawRobot = true;
						this.CenterOnLoadedRobot();
					}
				} else {
					ControllerGameGlobals.curRobotID = ControllerGameGlobals.potentialRobotID;
					ControllerGameGlobals.ratedCurRobot = false;
					ControllerGameGlobals.curRobotEditable = (ControllerGameGlobals.potentialRobotEditable/* && ((!hasThrusters && !hasCannons) || Main.premiumMode)*/);
					ControllerGameGlobals.curRobotPublic = ControllerGameGlobals.potentialRobotPublic;
					ControllerGameGlobals.curRobotFeatured = ControllerGameGlobals.potentialRobotFeatured;
					ControllerGameGlobals.curReplayID = "";
					ControllerGameGlobals.loadedParts = newParts;
					Main.changeControllers = true;
					ControllerGameGlobals.playingReplay = false;
					ControllerGameGlobals.initX = robot.cameraX;
					ControllerGameGlobals.initY = robot.cameraY;
					ControllerGameGlobals.initZoom = robot.zoomLevel;
					if (robot.challenge) {
						Main.nextControllerType = 1;
						ControllerChallenge.challenge = robot.challenge;
						ControllerChallenge.playChallengeMode = true;
						ControllerChallenge.playOnlyMode = true;
						ControllerSandbox.settings = robot.challenge.settings;
						ControllerGameGlobals.curChallengeID = ControllerGameGlobals.potentialChallengeID;
						ControllerGameGlobals.ratedCurChallenge = false;
						ControllerGameGlobals.curChallengePublic = false;
						ControllerGameGlobals.curChallengeFeatured = false;
						ControllerGameGlobals.justLoadedRobotWithChallenge = true;
					} else {
						Main.nextControllerType = 0;
						ControllerSandbox.settings = robot.settings;
						ControllerGameGlobals.curChallengeID = "";
					}
				}
			}
		}

		public finishDeleting(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_DELETE_ROBOT) return;
			var id:String = Database.FinishDeletingRobot(e);
			if (id != "") {
				if (ControllerGameGlobals.curRobotID == id) ControllerGameGlobals.curRobotID = "";
				this.m_progressDialog.SetMessage("Delete successful!");
				this.m_progressDialog.HideInXSeconds(1);
				var type:number = this.m_chooserWindow.dataType;
				this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, type);
				this.addChild(this.m_chooserWindow);
				this.removeChild(this.m_progressDialog);
				this.addChild(this.m_progressDialog);
			}
		}

		public finishExporting(exportStr:String, robotStr:String):void {
			if (this.m_chooserWindow) this.m_chooserWindow.visible = false;
			if (this.m_exportDialog) this.removeChild(this.m_exportDialog);
			this.m_exportDialog = new ExportWindow(this, exportStr, robotStr);
			this.m_fader.visible = true;
			this.addChild(this.m_exportDialog);
		}

		public saveReplayButton(e:MouseEvent):void {
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				this.pauseButton(e);
				if (this.canSaveReplay) {
					if (true || ControllerGameGlobals.userName != "_Public") {
						//if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
						//Database.GetReplayData(userName, password, false, Database.curSortType, (Database.curSortPeriod == Database.SORT_PERIOD_FEATURED ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), 1, "", finishGettingSaveReplayData);
						//ShowDialog("Getting replays...");
						//Main.ShowHourglass();
						//m_fader.visible = true;
						this.AddSyncPoint();
						if (ControllerGameGlobals.viewingUnsavedReplay) Database.ExportReplay(ControllerGameGlobals.replay, "", "", ControllerGameGlobals.curRobotID, new Robot(this.allParts, ControllerSandbox.settings), -1, "", 1, this.finishExporting);
						else Database.ExportReplay(new Replay(this.cameraMovements, this.syncPoints, this.keyPresses, this.frameCounter, Database.VERSION_STRING_FOR_REPLAYS), "", "", ControllerGameGlobals.curRobotID, new Robot(this.allParts, ControllerSandbox.settings), -1, "", 1, this.finishExporting);
					} else {
						this.clickedSaveReplay = true;
						this.loginButton(e, true, false);
					}
				} else {
					this.m_fader.visible = true;
					if (this.frameCounter >= 9000) this.ShowDialog3("Sorry, you can only save replays that are under 5 minutes in length.");
					else this.ShowDialog3("Sorry, you can only save replays that contain 500 or fewer cannonballs.");
					this.m_progressDialog.ShowOKButton();
					this.m_progressDialog.StopTimer();
				}
			}
		}

		public loadReplayButton(e:MouseEvent, makeThemRate:boolean = true):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else if (makeThemRate && ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic && !ControllerGameGlobals.ratedCurReplay && !LSOManager.HasRatedReplay(ControllerGameGlobals.curReplayID)) {
				ControllerGameGlobals.ratedCurReplay = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 1, 3);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic && !ControllerGameGlobals.ratedCurChallenge && !LSOManager.HasRatedChallenge(ControllerGameGlobals.curChallengeID)) {
				ControllerGameGlobals.ratedCurChallenge = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 2, 3);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				if (this.simStarted) {
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic && !ControllerGameGlobals.ratedCurRobot && !LSOManager.HasRatedRobot(ControllerGameGlobals.curRobotID)) {
				ControllerGameGlobals.ratedCurRobot = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 0, 3);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else {
				if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
				Database.GetReplayData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.curShared, Database.curSortType, Database.curSortPeriod, (Database.curShared ? Database.curReplayPage : 1), "", this.finishGettingLoadReplayData);
				this.ShowDialog("Getting replays...");
				Main.ShowHourglass();
				this.m_fader.visible = true;
				this.curAction = -1;
			}
		}

		public loadChallengeButton(e:MouseEvent, makeThemRate:boolean = true):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else if (makeThemRate && ControllerGameGlobals.playingReplay && ControllerGameGlobals.curReplayID != "" && ControllerGameGlobals.curReplayPublic && !ControllerGameGlobals.ratedCurReplay && !LSOManager.HasRatedReplay(ControllerGameGlobals.curReplayID)) {
				ControllerGameGlobals.ratedCurReplay = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 1, 4);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curChallengeID != "" && ControllerGameGlobals.curChallengePublic && !ControllerGameGlobals.ratedCurChallenge && !LSOManager.HasRatedChallenge(ControllerGameGlobals.curChallengeID)) {
				ControllerGameGlobals.ratedCurChallenge = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 2, 4);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				if (this.simStarted) {
					this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
					this.paused = true;
				}
			} else if (makeThemRate && !ControllerGameGlobals.playingReplay && ControllerGameGlobals.curRobotID != "" && ControllerGameGlobals.curRobotPublic && !ControllerGameGlobals.ratedCurRobot && !LSOManager.HasRatedRobot(ControllerGameGlobals.curRobotID)) {
				ControllerGameGlobals.ratedCurRobot = true;
				if (this.m_rateDialog) this.removeChild(this.m_rateDialog);
				this.m_rateDialog = new RateWindow(this, 0, 4);
				this.addChild(this.m_rateDialog);
				this.m_fader.visible = true;
				this.m_guiPanel.ShowPausePanel(!ControllerGameGlobals.playingReplay);
				this.paused = true;
			} else {
				if (Database.curSortPeriod == Database.SORT_PERIOD_PROP) Database.curSortPeriod = Database.SORT_PERIOD_ALLTIME;
				Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, Database.curShared, Database.curSortType, Database.curSortPeriod, (Database.curShared ? Database.curReplayPage : 1), "", this.finishGettingLoadChallengeData);
				this.ShowDialog("Getting challenges...");
				Main.ShowHourglass();
				this.m_fader.visible = true;
				this.curAction = -1;
			}
		}

		public LoadReplayNow(replayID:String):void {
			Database.LoadReplayByID(replayID, this.finishLoadingReplay);
			this.ShowDialog("Loading Replay...");
			this.m_fader.visible = true;
		}

		public LoadRobotNow(robotID:String):void {
			Database.LoadRobotByID(robotID, this.finishLoading);
			this.ShowDialog("Loading Robot...");
			this.m_fader.visible = true;
		}

		public LoadChallengeNow(challengeID:String):void {
			Database.LoadChallengeByID(challengeID, this.finishLoadingChallenge);
			this.ShowDialog("Loading Challenge...");
			this.m_fader.visible = true;
		}

		public highScoresButton(e:MouseEvent):void {
			if (this.selectingCondition) return;
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				if (ControllerGameGlobals.curChallengeID == "") {
					Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, true, Database.curSortType, Database.curSortPeriod, Database.curChallengePage, "", this.finishGettingLoadChallengeForScoreData);
					this.ShowDialog("Getting challenges...");
				} else {
					Database.GetScoreData(ControllerGameGlobals.userName, ControllerGameGlobals.password, ControllerGameGlobals.curChallengeID, Database.highScoresDaily, Database.highScoresPersonal, Database.highScoresSortType, Database.curScorePage, "", this.finishGettingScoreData);
					this.ShowDialog("Getting high scores...");
				}
				Main.ShowHourglass();
				this.m_fader.visible = true;
				this.curAction = -1;
			}
		}

		public submitButton(e:MouseEvent):void {
			if (Main.inIFrame) {
				this.m_fader.visible = true;
				this.ShowConfirmDialog("Redirect to incredibots2.com?", 7);
			} else {
				if (!ControllerGameGlobals.curRobotEditable) return;
				if (ControllerGameGlobals.userName != "_Public") {
					this.AddSyncPoint();
					if (ControllerGameGlobals.viewingUnsavedReplay) Database.SaveReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, ControllerGameGlobals.replay, "_ScoreReplay", "This replay instanceof saved for a score", ControllerGameGlobals.curRobotID, new Robot(this.allParts, ControllerSandbox.settings), (this.ChallengeOver() ? this.GetScore() : -1), ControllerGameGlobals.curChallengeID, 1, this.finishSavingReplay);
					else Database.SaveReplay(ControllerGameGlobals.userName, ControllerGameGlobals.password, new Replay(this.cameraMovements, this.syncPoints, this.keyPresses, this.frameCounter, Database.VERSION_STRING_FOR_REPLAYS), "_ScoreReplay", "This replay instanceof saved for a score", ControllerGameGlobals.curRobotID, new Robot(this.allParts, ControllerSandbox.settings), (this.ChallengeOver() ? this.GetScore() : -1), ControllerGameGlobals.curChallengeID, 1, this.finishSavingReplay);
					this.m_scoreWindow.ShowFader();
					this.ShowDialog("Submitting score...");
					this.clickedSubmitScore = true;
				} else {
					this.clickedSubmitScore = true;
					this.loginButton(e, true, false);
				}
			}
		}

		public finishAddingUser(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_ADD_USER) return;
			var retVal:String = Database.FinishAddingUser(e);
			if (retVal != "") {
				this.m_progressDialog.SetMessage("Success!");
				this.m_progressDialog.HideInXSeconds(1);
				if (this.m_loginWindow) this.m_loginWindow.visible = false;
				this.m_newUserWindow.visible = false;
				if (!this.m_scoreWindow || !this.m_scoreWindow.visible) this.m_fader.visible = false;
				Main.premiumMode = false;
				ControllerGameGlobals.userName = retVal.substring(retVal.indexOf("user: ") + 6, retVal.indexOf("password: ") - 1);
				ControllerGameGlobals.password = retVal.substring(retVal.indexOf("password: ") + 10, retVal.indexOf("session: ") - 1);
				ControllerGameGlobals.sessionID = retVal.substr(retVal.indexOf("session: ") + 9);
				this.m_guiPanel.ShowLogout();
				this.loginHidden(e, true);
			}
		}

		public finishLoggingIn(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOGIN) return;
			var retVal:String = Database.FinishLoggingIn(e);
			if (retVal != "") {
				this.m_progressDialog.SetMessage("Success!");
				this.m_progressDialog.HideInXSeconds(1);
				this.m_loginWindow.visible = false;
				if (!this.m_scoreWindow || !this.m_scoreWindow.visible) this.m_fader.visible = false;
				if (retVal.indexOf("premium") == 0) Main.premiumMode = true;
				else Main.premiumMode = false;
				ControllerGameGlobals.userName = retVal.substring(retVal.indexOf("user: ") + 6, retVal.indexOf("password: ") - 1);
				ControllerGameGlobals.password = retVal.substring(retVal.indexOf("password: ") + 10, retVal.indexOf("session: ") - 1);
				ControllerGameGlobals.sessionID = retVal.substr(retVal.indexOf("session: ") + 9);
				//m_guiPanel.ShowFeatureButton();
				this.m_guiPanel.ShowLogout();
				this.loginHidden(e, true);
			}
			Main.ShowMouse();
		}

		public finishSavingReplay(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_SAVE_REPLAY) return;
			var robotID:String = Database.FinishSavingReplay(e);
			if (robotID != "") {
				ControllerGameGlobals.curRobotID = robotID;
				ControllerGameGlobals.ratedCurRobot = true;
				ControllerGameGlobals.curRobotPublic = false;
				this.m_progressDialog.SetMessage("Save successful!");
				this.m_progressDialog.HideInXSeconds(1);
				if (this.m_chooserWindow) {
					this.m_chooserWindow.visible = false;
					this.removeChild(this.m_chooserWindow);
					this.m_chooserWindow = null;
				}
				if (!this.m_scoreWindow || !this.m_scoreWindow.visible) this.m_fader.visible = false;
				else {
					if (this.clickedSubmitScore) {
						this.clickedSubmitScore = false;
						this.m_progressDialog.visible = false;
						this.highScoresButton(new MouseEvent(""));
					} else {
						this.m_scoreWindow.HideFader();
						Main.ShowMouse();
					}
				}
			}
		}

		public finishGettingSaveReplayData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_REPLAY_DATA) return;
			if (Database.FinishGettingReplayData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.SAVE_REPLAY_TYPE);
				this.addChild(this.m_chooserWindow);
				this.m_fader.visible = true;
			}
		}

		public finishGettingLoadReplayData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_REPLAY_DATA) return;
			if (Database.FinishGettingReplayData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_REPLAY_TYPE);
				this.addChild(this.m_chooserWindow);
				this.m_fader.visible = true;
			}
		}

		public finishLoadingReplay(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOAD_REPLAY) return;
			var replayAndRobot:Array<any> = Database.FinishLoadingReplay(e);
			this.processLoadedReplay(replayAndRobot);
		}

		public processLoadedReplay(replayAndRobot:Array<any>):void {
			if (replayAndRobot) {
				ControllerGameGlobals.replay = replayAndRobot[0];
				if (ControllerGameGlobals.replay.version != Database.VERSION_STRING_FOR_REPLAYS) {
					if (ControllerGameGlobals.replayDirectlyLinked) {
						if (Main.inIFrame) Main.BrowserRedirect("http://incredibots.com/old/" + ControllerGameGlobals.replay.version + "/incredibots.php?replayID=" + ControllerGameGlobals.potentialReplayID);
						else Main.BrowserRedirect("http://incredibots.com/old/" + ControllerGameGlobals.replay.version + "/?replayID=" + ControllerGameGlobals.potentialReplayID);
					} else {
						this.ShowConfirmDialog("This replay was saved using an older version of IncrediBots.  Redirect there now?", 6);
						Main.ShowMouse();
					}
				} else {
					var robot:Robot = replayAndRobot[1];
					ControllerGameGlobals.replayParts = robot.allParts;
					ControllerSandbox.settings = robot.settings;
					ControllerGameGlobals.playingReplay = true;
					ControllerGameGlobals.viewingUnsavedReplay = false;
					Main.changeControllers = true;
					Main.nextControllerType = 0;
					ControllerGameGlobals.curRobotID = ControllerGameGlobals.potentialRobotID;
					ControllerGameGlobals.ratedCurReplay = true;
					ControllerGameGlobals.curReplayID = ControllerGameGlobals.potentialReplayID;
					ControllerGameGlobals.ratedCurReplay = false;
					ControllerGameGlobals.curReplayPublic = ControllerGameGlobals.potentialReplayPublic;
					ControllerGameGlobals.curReplayFeatured = ControllerGameGlobals.potentialReplayFeatured;
					ControllerGameGlobals.curChallengeID = "";
					ControllerGameGlobals.curChallengePublic = false;
					ControllerGameGlobals.curChallengeFeatured = false;
				}
			}
		}

		public finishDeletingReplay(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_DELETE_REPLAY) return;
			if (Database.FinishDeletingReplay(e)) {
				this.m_progressDialog.SetMessage("Delete successful!");
				this.m_progressDialog.HideInXSeconds(1);
				var type:number = this.m_chooserWindow.dataType;
				this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, type);
				this.addChild(this.m_chooserWindow);
				this.removeChild(this.m_progressDialog);
				this.addChild(this.m_progressDialog);
			}
		}

		public finishSavingChallenge(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_SAVE_CHALLENGE) return;
			var challengeID:String = Database.FinishSavingChallenge(e);
			if (challengeID != "") {
				ControllerGameGlobals.curChallengeID = challengeID;
				ControllerGameGlobals.ratedCurChallenge = true;
				ControllerGameGlobals.curChallengePublic = false;
				ControllerGameGlobals.curChallengeFeatured = false;
				this.m_progressDialog.SetMessage("Save successful!");
				this.m_progressDialog.HideInXSeconds(1);
				if (this.m_chooserWindow) {
					this.m_chooserWindow.visible = false;
					this.removeChild(this.m_chooserWindow);
					this.m_chooserWindow = null;
				}
				if (!this.m_scoreWindow || !this.m_scoreWindow.visible) this.m_fader.visible = false;
				else {
					this.m_scoreWindow.HideFader();
					Main.ShowMouse();
				}
			}
		}

		public finishLoadingChallenge(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_LOAD_CHALLENGE) return;
			var challenge:Challenge = Database.FinishLoadingChallenge(e);
			this.processLoadedChallenge(challenge);
		}

		public processLoadedChallenge(challenge:Challenge):void {
			if (challenge) {
				Main.changeControllers = true;
				Main.nextControllerType = 1;
				ControllerGameGlobals.playingReplay = false;

				ControllerChallenge.challenge = challenge;
				ControllerChallenge.playChallengeMode = !ControllerGameGlobals.potentialChallengeEditable;
				ControllerChallenge.playOnlyMode = !ControllerGameGlobals.potentialChallengeEditable;
				ControllerSandbox.settings = challenge.settings;
				ControllerGameGlobals.curChallengeID = ControllerGameGlobals.potentialChallengeID;
				ControllerGameGlobals.ratedCurChallenge = false;
				ControllerGameGlobals.curChallengePublic = ControllerGameGlobals.potentialChallengePublic;
				ControllerGameGlobals.curChallengeFeatured = ControllerGameGlobals.potentialChallengeFeatured;
				ControllerGameGlobals.curRobotID = "";
				ControllerGameGlobals.curReplayID = "";
				ControllerGameGlobals.loadedParts = challenge.allParts;
				ControllerGameGlobals.initX = challenge.cameraX;
				ControllerGameGlobals.initY = challenge.cameraY;
				ControllerGameGlobals.initZoom = challenge.zoomLevel;
			}
		}

		public finishGettingSaveChallengeData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_CHALLENGE_DATA) return;
			if (Database.FinishGettingChallengeData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.SAVE_CHALLENGE_TYPE);
				this.addChild(this.m_chooserWindow);
				this.m_fader.visible = true;
			}
		}

		public finishGettingLoadChallengeData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_CHALLENGE_DATA) return;
			if (Database.FinishGettingChallengeData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.LOAD_CHALLENGE_TYPE);
				this.addChild(this.m_chooserWindow);
				this.m_fader.visible = true;
			}
		}

		public finishGettingLoadChallengeForScoreData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_CHALLENGE_DATA) return;
			if (Database.FinishGettingChallengeData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_challengeWindow) this.removeChild(this.m_challengeWindow);
				this.m_challengeWindow = new ChooseChallengeWindow(this);
				this.addChild(this.m_challengeWindow);
				this.m_fader.visible = true;
			}
		}

		public finishDeletingChallenge(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_DELETE_CHALLENGE) return;
			if (Database.FinishDeletingChallenge(e)) {
				this.m_progressDialog.SetMessage("Delete successful!");
				this.m_progressDialog.HideInXSeconds(1);
				var type:number = this.m_chooserWindow.dataType;
				this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, type);
				this.addChild(this.m_chooserWindow);
				this.removeChild(this.m_progressDialog);
				this.addChild(this.m_progressDialog);
			}
		}

		public finishGettingScoreData(e:Event):void {
			if (!Database.waitingForResponse || Database.curTransactionType != Database.ACTION_GET_SCORE_DATA) return;
			if (Database.FinishGettingScoreData(e)) {
				this.m_progressDialog.visible = false;
				if (this.m_chooserWindow) this.removeChild(this.m_chooserWindow);
				this.m_chooserWindow = new SaveLoadWindow(this, SaveLoadWindow.HIGH_SCORE_TYPE);
				this.addChild(this.m_chooserWindow);
				this.m_fader.visible = true;
			}
		}

		public ConfirmSaveRobot(e:MouseEvent):void {
			this.m_chooserWindow.saveRobotButtonPressed(e, true);
		}

		public ConfirmSaveReplay(e:MouseEvent):void {
			this.m_chooserWindow.saveReplayButtonPressed(e, true);
		}

		public ConfirmSaveChallenge(e:MouseEvent):void {
			this.m_chooserWindow.saveChallengeButtonPressed(e, true);
		}

		public ConfirmDeleteRobot(e:MouseEvent):void {
			this.m_chooserWindow.deleteRobotButtonPressed(e, true);
		}

		public ConfirmDeleteReplay(e:MouseEvent):void {
			this.m_chooserWindow.deleteReplayButtonPressed(e, true);
		}

		public ConfirmDeleteChallenge(e:MouseEvent):void {
			this.m_chooserWindow.deleteChallengeButtonPressed(e, true);
		}

		public ShowImportWindow(type:number):void {
			if (this.m_importDialog) this.removeChild(this.m_importDialog);
			this.m_importDialog = new ImportWindow(this, type);
			this.m_fader.visible = true;
			this.addChild(this.m_importDialog);
		}

		public ShowConfirmDialog(msg:String, type:number):void {
			if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
			this.m_progressDialog = new DialogWindow(this, msg, true, false, (type == 8));
			this.addChild(this.m_progressDialog);
			this.m_progressDialog.ShowOKAndCancelButton(type);
		}

		public ShowDisabledDialog():void {
			this.m_fader.visible = true;
			if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
			this.m_progressDialog = new DialogWindow(this, "That feature has been disabled for this level.", true);
			this.m_progressDialog.ShowOKButton();
			this.m_progressDialog.StopTimer();
			this.addChild(this.m_progressDialog);
		}

		public ShowDialog(msg:String):void {
			if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
			this.m_progressDialog = new DialogWindow(this, msg);
			this.addChild(this.m_progressDialog);
		}

		public ShowDialog2(msg:String):void {
			if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
			this.m_progressDialog = new DialogWindow(this, msg, true, true);
			this.addChild(this.m_progressDialog);
		}

		public ShowDialog3(msg:String):void {
			if (this.m_progressDialog) this.removeChild(this.m_progressDialog);
			this.m_progressDialog = new DialogWindow(this, msg, true);
			this.addChild(this.m_progressDialog);
		}

		public ShowTutorialWindow(phraseNum:number, x:number, y:number, moreButton:boolean = false):void {
			if (this.m_tutorialDialog) this.removeChild(this.m_tutorialDialog);
			this.m_tutorialDialog = new TutorialWindow(this, x, y, phraseNum, moreButton);
			this.addChild(this.m_tutorialDialog);
		}

		public CloseTutorialDialog(phraseNum:number):void {
			this.m_tutorialDialog.visible = false;
		}

		public ShowLinkDialog(msg1:String, msg2:String, isEmbedReplay:boolean = false, id:String = "", isEmbedChallenge:boolean = false):void {
			if (this.m_linkDialog) this.removeChild(this.m_linkDialog);
			this.m_linkDialog = new LinkWindow(this, msg1, msg2, isEmbedReplay, id, isEmbedChallenge);
			this.addChild(this.m_linkDialog);
		}

		public DialogOK(e:Event):void {
			this.m_progressDialog.visible = false;
			if (this.m_chooserWindow && this.m_chooserWindow.visible) this.m_chooserWindow.HideFader();
			if (this.m_challengeWindow && this.m_challengeWindow.visible) this.m_challengeWindow.HideFader();
			if (this.m_newUserWindow && this.m_newUserWindow.visible) this.m_newUserWindow.HideFader();
			if (this.m_loginWindow && this.m_loginWindow.visible) this.m_loginWindow.HideFader();
			if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.HideFader();
			if (this.m_restrictionsDialog && this.m_restrictionsDialog.visible) this.m_restrictionsDialog.HideFader();
			if (this.m_conditionsDialog && this.m_conditionsDialog.visible) this.m_conditionsDialog.HideFader();
		}

		public HideDialog(e:Event):void {
			if (Database.nonfatalErrorOccurred) {
				Database.nonfatalErrorOccurred = false;
				if (this.m_chooserWindow) this.m_chooserWindow.HideFader();
				if (this.m_challengeWindow) this.m_challengeWindow.HideFader();
				if (this.m_newUserWindow && this.m_newUserWindow.visible) this.m_newUserWindow.HideFader();
				else if (this.m_loginWindow) this.m_loginWindow.HideFader();
			} else {
				this.m_fader.visible = false;
				if (this.m_chooserWindow && this.m_chooserWindow.visible) {
					this.m_fader.visible = true;
					this.m_chooserWindow.HideFader();
				}
				if (this.m_challengeWindow && this.m_challengeWindow.visible) {
					this.m_fader.visible = true;
					this.m_challengeWindow.HideFader();
				}
				if (this.m_newUserWindow && this.m_newUserWindow.visible) this.m_newUserWindow.visible = false;
				else if (this.m_loginWindow && this.m_loginWindow.visible) this.m_loginWindow.visible = false;
				else if (this.m_scoreWindow && this.m_scoreWindow.visible) {
					this.m_fader.visible = true;
					this.m_scoreWindow.HideFader();
				} else if (this.m_postReplayWindow && this.m_postReplayWindow.visible) {
					this.m_fader.visible = true;
					this.m_postReplayWindow.HideFader();
				}
			}
			this.m_progressDialog.visible = false;
			if (ControllerGameGlobals.failedChallenge) this.resetButton(new MouseEvent(""));
			ControllerGameGlobals.failedChallenge = false;
		}

		public HideLinkDialog(e:Event):void {
			this.m_linkDialog.visible = false;
			if (this.m_chooserWindow && this.m_chooserWindow.visible) {
				this.m_chooserWindow.HideFader();
			} else {
				this.m_fader.visible = false;
			}
		}

		public HideExportDialog(e:Event):void {
			this.m_exportDialog.visible = false;
			if (this.m_chooserWindow && this.m_chooserWindow.visible) {
				this.m_chooserWindow.HideFader();
			}
			this.m_fader.visible = false;
		}

		public HideImportDialog(e:Event):void {
			this.m_importDialog.visible = false;
			this.m_fader.visible = false;
		}

		public HideConfirmDialog(e:Event):void {
			this.m_progressDialog.visible = false;
			if (this.m_chooserWindow && this.m_chooserWindow.visible) this.m_chooserWindow.HideFader();
			else if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.HideFader();
			else this.m_fader.visible = false;
		}

		public ShowPostReplayWindow():void {
			if (this.m_postReplayWindow) this.removeChild(this.m_postReplayWindow);
			this.m_postReplayWindow = new PostReplayWindow(this);
			this.addChild(this.m_postReplayWindow);
			this.m_fader.visible = true;
		}

		public DeletePart(part:Part, addAction:boolean = true, clearFromSelected:boolean = true):void {
			this.allParts = Util.RemoveFromArray(part, this.allParts);
			if (clearFromSelected) this.selectedParts = Util.RemoveFromArray(part, this.selectedParts);
			part.isEnabled = false;

			var affectedJoints:Array<any> = new Array();
			if (part instanceof ShapePart) {
				var jointFound:boolean;
				do {
					jointFound = false;
					for (var i:number = 0; i < this.allParts.length; i++) {
						if (jointFound) {
							if (i != this.allParts.length - 1) {
								this.allParts[i] = this.allParts[i + 1];
							}
						} else if (this.allParts[i] instanceof JointPart) {
							var p:JointPart = (this.allParts[i] as JointPart);
							if (p.part1 == part || p.part2 == part) {
								jointFound = true;
								affectedJoints.push(p);
								p.isEnabled = false;
								if (clearFromSelected) this.selectedParts = Util.RemoveFromArray(p, this.selectedParts);
								if (i != this.allParts.length - 1) this.allParts[i] = this.allParts[i + 1];
							}
						} else if (this.allParts[i] instanceof Thrusters) {
							var t:Thrusters = (this.allParts[i] as Thrusters);
							if (t.shape == part) {
								jointFound = true;
								affectedJoints.push(t);
								t.isEnabled = false;
								if (clearFromSelected) this.selectedParts = Util.RemoveFromArray(t, this.selectedParts);
								if (i != this.allParts.length - 1) this.allParts[i] = this.allParts[i + 1];
							}
						}
					}
					if (jointFound) this.allParts.pop();
				} while (jointFound);
			} else if (part instanceof TextPart) {
				(part as TextPart).m_textField.visible = false;
			}
			if (addAction) this.AddAction(new DeleteAction(part, affectedJoints));
			this.CheckIfPartsFit();
			ControllerGameGlobals.curRobotID = "";
		}

		// Private Part:

		private CreateWorld():void {
			var worldAABB:b2AABB = new b2AABB();
			worldAABB.lowerBound.Set(-300.0, -200.0);
			worldAABB.upperBound.Set(300.0, 200.0);

			// Construct a world object
			this.m_world = new b2World(worldAABB, this.GetGravity(), true);

			var filter:ContactFilter = new ContactFilter();
			this.m_world.SetContactFilter(filter);
			var listener:ContactListener = new ContactListener(this);
			this.m_world.SetContactListener(listener);
		}

		protected GetGravity():b2Vec2 {
			return new b2Vec2(0.0, 15.0);
		}

		private TooManyShapes():boolean {
			return (this.allParts.filter(this.PartIsPhysical).length > 500);
		}

		protected IsPartOfRobot(p:Part, index:number, array:Array<any>):boolean {
			return p.drawAnyway;
		}

		protected PartIsEditable(p:Part, index:number, array:Array<any>):boolean {
			return p.isEditable;
		}

		private PartIsShape(p:Part, index:number, array:Array<any>):boolean {
			return (p instanceof ShapePart);
		}

		private PartIsPhysical(p:Part, index:number, array:Array<any>):boolean {
			return (p instanceof ShapePart || p instanceof PrismaticJoint);
		}

		protected FindCenterOfRobot():ShapePart {
			var heaviestGroup:Array<any> = null;
			var massOfHeaviestGroup:number = 0;
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i].isEditable && this.allParts[i] instanceof ShapePart && this.allParts[i].isEnabled && this.allParts[i].m_collisionGroup == -(i + 1)) {
					var attachedParts:Array<any> = this.allParts[i].GetAttachedParts().filter(this.PartIsShape);
					var groupMass:number = 0;
					var bodiesUsed:Array<any> = new Array();
					var partsUsed:Array<any> = new Array();
					for (var j:number = 0; j < attachedParts.length; j++) {
						if (!Util.ObjectInArray(attachedParts[j].GetBody(), bodiesUsed)) {
							groupMass += attachedParts[j].GetMass();
							bodiesUsed.push(attachedParts[j].GetBody());
							partsUsed.push(attachedParts[j]);
						}
					}
					if (groupMass > massOfHeaviestGroup) {
						massOfHeaviestGroup = groupMass;
						heaviestGroup = partsUsed;
					}
				}
			}

			if (!heaviestGroup) return null;

			var bestIndex:number = -1;
			var bestMass:number = 0;
			for (i = 0; i < heaviestGroup.length; i++) {
				var mass:number = heaviestGroup[i].GetMass();
				if (mass > bestMass) {
					bestMass = mass;
					bestIndex = i;
				}
			}
			if (bestIndex == -1) return null;
			return heaviestGroup[bestIndex];
		}

		private Zoom(zoomIn:boolean):void {
			var oldScale:number = this.m_physScale;
			var centerX:number = (ControllerGameGlobals.ZOOM_FOCUS_X + this.draw.m_drawXOff) / this.m_physScale;
			var centerY:number = (ControllerGameGlobals.ZOOM_FOCUS_Y + this.draw.m_drawYOff) / this.m_physScale;
			if (zoomIn) {
				this.m_physScale *= 4.0 / 3.0;
				if (this.m_physScale > ControllerGameGlobals.MAX_ZOOM_VAL) this.m_physScale = ControllerGameGlobals.MAX_ZOOM_VAL;
			} else {
				this.m_physScale *= 3.0 / 4.0;
				if (this.m_physScale < ControllerGameGlobals.MIN_ZOOM_VAL) this.m_physScale = ControllerGameGlobals.MIN_ZOOM_VAL;
			}
			this.draw.m_drawXOff = centerX * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_X;
			this.draw.m_drawYOff = centerY * this.m_physScale - ControllerGameGlobals.ZOOM_FOCUS_Y;

			if (oldScale != this.m_physScale) this.hasZoomed = true;
			if (this.simStarted) this.cameraMovements.push(new CameraMovement(this.frameCounter, (this.autoPanning ? Number.POSITIVE_INFINITY : this.draw.m_drawXOff), (this.autoPanning ? Number.POSITIVE_INFINITY : this.draw.m_drawYOff), this.m_physScale));
		}

		private MaybeCreateJoint():void {
			var candidateParts:Array<any> = new Array();

			var jointX:number = ControllerGameGlobals.mouseXWorldPhys;
			var jointY:number = ControllerGameGlobals.mouseYWorldPhys;
			var snapPart:ShapePart = this.FindPartToSnapTo();
			if (ControllerGameGlobals.snapToCenter && snapPart) {
				jointX = snapPart.centerX;
				jointY = snapPart.centerY;
			}

			for (var i:number = this.allParts.length - 1; i >= 0; i--) {
				if (this.allParts[i] instanceof ShapePart && this.allParts[i].isEditable && this.allParts[i].isEnabled) {
					var part:ShapePart = ShapePart(this.allParts[i]);
					if (part.InsideShape(jointX, jointY, this.m_physScale)) {
						candidateParts.push(part);
					}
				}
			}

			if (candidateParts.length == 2) {
				if (this.curAction == ControllerGameGlobals.NEW_REVOLUTE_JOINT) {
					var rjoint:RevoluteJoint = new RevoluteJoint(candidateParts[0], candidateParts[1], jointX, jointY);
					if (this.copiedJoint instanceof RevoluteJoint) rjoint.SetJointProperties(this.copiedJoint as RevoluteJoint);
					this.allParts.push(rjoint);
					this.AddAction(new CreateAction(rjoint));
					this.m_sidePanel.ShowJointPanel(rjoint);
					this.selectedParts = new Array();
					this.selectedParts.push(rjoint);
					this.curAction = -1;
					if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
					this.PlayJointSound();
				} else if (this.curAction == ControllerGameGlobals.NEW_FIXED_JOINT) {
					var fjoint:JointPart = new FixedJoint(candidateParts[0], candidateParts[1], jointX, jointY);
					this.allParts.push(fjoint);
					this.AddAction(new CreateAction(fjoint));
					this.m_sidePanel.ShowJointPanel(fjoint);
					this.selectedParts = new Array();
					this.selectedParts.push(fjoint);
					this.curAction = -1;
					if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
					this.PlayJointSound();
				}
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
			} else if (candidateParts.length > 2) {
				this.potentialJointPart1 = candidateParts[0];
				this.potentialJointPart2 = candidateParts[1];
				this.potentialJointPart1.highlightForJoint = true;
				this.potentialJointPart2.highlightForJoint = true;
				this.candidateJointX = jointX;
				this.candidateJointY = jointY;
				this.candidateJointType = this.curAction;
				this.candidateJointParts = candidateParts;
				this.curAction = ControllerGameGlobals.FINALIZING_JOINT;
			} else {
				this.curAction = -1;
				this.redrawRobot = true;
			}
		}

		private MaybeCreateThrusters():void {
			var candidateParts:Array<any> = new Array();

			var jointX:number = ControllerGameGlobals.mouseXWorldPhys;
			var jointY:number = ControllerGameGlobals.mouseYWorldPhys;
			var snapPart:ShapePart = this.FindPartToSnapTo();
			if (ControllerGameGlobals.snapToCenter && snapPart) {
				jointX = snapPart.centerX;
				jointY = snapPart.centerY;
			}

			for (var i:number = this.allParts.length - 1; i >= 0; i--) {
				if (this.allParts[i] instanceof ShapePart && this.allParts[i].isEditable && this.allParts[i].isEnabled) {
					var part:ShapePart = ShapePart(this.allParts[i]);
					if (part.InsideShape(jointX, jointY, this.m_physScale)) {
						candidateParts.push(part);
					}
				}
			}

			if (candidateParts.length == 1) {
				var t:Thrusters = new Thrusters(candidateParts[0], jointX, jointY);
				if (this.copiedThrusters) {
					t.strength = this.copiedThrusters.strength;
					t.angle = this.copiedThrusters.angle;
					t.thrustKey = this.copiedThrusters.thrustKey;
					t.autoOn = this.copiedThrusters.autoOn;
				}
				this.allParts.push(t);
				this.AddAction(new CreateAction(t));
				this.m_sidePanel.ShowThrustersPanel(t);
				this.selectedParts = new Array();
				this.selectedParts.push(t);
				this.curAction = -1;
				if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
				ControllerGameGlobals.curRobotID = "";
				this.redrawRobot = true;
				this.PlayJointSound();
			} else if (candidateParts.length > 1) {
				this.potentialJointPart1 = candidateParts[0];
				this.potentialJointPart1.highlightForJoint = true;
				this.candidateJointX = jointX;
				this.candidateJointY = jointY;
				this.candidateJointType = this.curAction;
				this.candidateJointParts = candidateParts;
				this.curAction = ControllerGameGlobals.FINALIZING_JOINT;
			} else {
				this.curAction = -1;
				this.redrawRobot = true;
			}
		}

		private MaybeStartCreatingPrismaticJoint():void {
			var candidateParts:Array<any> = new Array();

			var jointX:number = ControllerGameGlobals.mouseXWorldPhys;
			var jointY:number = ControllerGameGlobals.mouseYWorldPhys;
			var snapPart:ShapePart = this.FindPartToSnapTo();
			if (ControllerGameGlobals.snapToCenter && snapPart) {
				jointX = snapPart.centerX;
				jointY = snapPart.centerY;
			}

			for (var i:number = this.allParts.length - 1; i >= 0; i--) {
				if (this.allParts[i] instanceof ShapePart && this.allParts[i].isEditable && this.allParts[i].isEnabled) {
					var part:ShapePart = ShapePart(this.allParts[i]);
					if (part.InsideShape(jointX, jointY, this.m_physScale)) {
						candidateParts.push(part);
					}
				}
			}

			if (candidateParts.length == 0) {
				this.curAction = -1;
				this.redrawRobot = true;
			} else if (candidateParts.length == 1) {
				this.jointPart = candidateParts[0];
				this.firstClickX = jointX;
				this.firstClickY = jointY;
				this.actionStep++;
				this.PlayJointSound();
			} else {
				this.potentialJointPart1 = candidateParts[0];
				this.potentialJointPart1.highlightForJoint = true;
				this.candidateJointX = jointX;
				this.candidateJointY = jointY;
				this.candidateJointType = this.curAction;
				this.candidateJointParts = candidateParts;
				this.curAction = ControllerGameGlobals.FINALIZING_JOINT;
			}
		}

		private MaybeFinishCreatingPrismaticJoint():void {
			var candidateParts:Array<any> = new Array();

			var jointX:number = ControllerGameGlobals.mouseXWorldPhys;
			var jointY:number = ControllerGameGlobals.mouseYWorldPhys;
			var snapPart:ShapePart = this.FindPartToSnapTo();
			if (ControllerGameGlobals.snapToCenter && snapPart) {
				jointX = snapPart.centerX;
				jointY = snapPart.centerY;
			}

			for (var i:number = this.allParts.length - 1; i >= 0; i--) {
				if (this.allParts[i] instanceof ShapePart && this.allParts[i].isEditable && this.allParts[i] != this.jointPart) {
					var part:ShapePart = ShapePart(this.allParts[i]);
					if (part.InsideShape(jointX, jointY, this.m_physScale)) {
						candidateParts.push(part);
					}
				}
			}

			if (candidateParts.length == 1) {
				var pjoint:PrismaticJoint = new PrismaticJoint(this.jointPart, candidateParts[0], this.firstClickX, this.firstClickY, jointX, jointY);
				if (this.copiedJoint instanceof PrismaticJoint) pjoint.SetJointProperties(this.copiedJoint as PrismaticJoint);
				this.allParts.push(pjoint);
				this.AddAction(new CreateAction(pjoint));
				this.m_sidePanel.ShowJointPanel(pjoint);
				this.selectedParts = new Array();
				this.selectedParts.push(pjoint);
				this.curAction = -1;
				this.jointPart.highlightForJoint = false;
				ControllerGameGlobals.curRobotID = "";
				if (ControllerGameGlobals.centerOnSelected) this.CenterOnSelected();
				this.redrawRobot = true;
				this.PlayJointSound();
			} else if (candidateParts.length > 1) {
				this.potentialJointPart1 = candidateParts[0];
				this.potentialJointPart1.highlightForJoint = true;
				this.candidateJointX = jointX;
				this.candidateJointY = jointY;
				this.candidateJointType = this.curAction;
				this.candidateJointParts = candidateParts;
				this.curAction = ControllerGameGlobals.FINALIZING_JOINT;
			} else if (candidateParts.length == 0) {
				this.curAction = -1;
				this.redrawRobot = true;
			}
		}

		private FindPartToSnapTo(draggingPart:ShapePart = null):ShapePart {
			var closestPart:ShapePart = null;
			var closestDist:number = Number.MAX_VALUE;
			for (var i:number = 0; i < this.allParts.length; i++) {
				if (this.allParts[i] instanceof ShapePart && this.allParts[i] != draggingPart && this.allParts[i].isEditable) {
					var part:ShapePart = (this.allParts[i] as ShapePart);
					var dist:number = Util.GetDist(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys, part.centerX, part.centerY);
					if (dist < closestDist) {
						closestDist = dist;
						closestPart = part;
					}
				}
			}

			var DIST_THRESHHOLD:number = 12.0 / this.m_physScale;

			if (closestDist < DIST_THRESHHOLD) return closestPart;
			return null;
		}

		private GetBodyAtMouse():b2Body {
			// Make a small box.
			var mousePVec:b2Vec2 = new b2Vec2(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys);
			var aabb:b2AABB = new b2AABB();
			aabb.lowerBound.Set(ControllerGameGlobals.mouseXWorldPhys - 0.001, ControllerGameGlobals.mouseYWorldPhys - 0.001);
			aabb.upperBound.Set(ControllerGameGlobals.mouseXWorldPhys + 0.001, ControllerGameGlobals.mouseYWorldPhys + 0.001);

			// Query the world for overlapping shapes.
			var k_maxCount:number = 10;
			var shapes:Array<any> = new Array();
			var count:number = this.m_world.Query(aabb, shapes, k_maxCount);
			var body:b2Body = null;
			for (var i:number = 0; i < count; ++i) {
				if (shapes[i].m_body.IsStatic() == false && !shapes[i].GetUserData().undragable && shapes[i].GetUserData().isPiston == -1) {
					var tShape:b2Shape = shapes[i] as b2Shape;
					var inside:boolean = tShape.TestPoint(tShape.m_body.GetXForm(), mousePVec);
					if (inside) {
						body = tShape.m_body;
						break;
					}
				}
			}
			return body;
		}

		private MouseOverSelectedPart():boolean {
			for (var i:number = 0; i < this.selectedParts.length; i++) {
				if (this.selectedParts[i].InsideShape(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys, this.m_physScale)) return true;
			}
			return false;
		}

		private GetPartAtMouse():Part {
			for (var j:number = 0; j < this.allParts.length; j++) {
				if (this.allParts[j].isEditable && this.allParts[j] instanceof TextPart && this.allParts[j].InsideMoveBox(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys, this.m_physScale)) return this.allParts[j];
			}

			var candidateParts:Array<any> = new Array();
			var firstSelectedPart:number = -1;
			var allPartsSelected:boolean = true;
			var noPartsSelected:boolean = true;
			for (var i:number = this.allParts.length - 1; i >= 0; i--) {
				if (this.allParts[i].isEditable && this.allParts[i].InsideShape(ControllerGameGlobals.mouseXWorldPhys, ControllerGameGlobals.mouseYWorldPhys, this.m_physScale)) {
					if (Util.ObjectInArray(this.allParts[i], this.selectedParts)) {
						noPartsSelected = false;
						if (firstSelectedPart == -1) firstSelectedPart = candidateParts.length;
					} else {
						allPartsSelected = false;
					}
					candidateParts.push(this.allParts[i]);
				}
			}

			if (candidateParts.length == 0) return null;
			if (candidateParts.length == 1 || allPartsSelected || noPartsSelected) return candidateParts[0];
			for (i = (firstSelectedPart + 1) % candidateParts.length; i != firstSelectedPart; i = (i + 1) % candidateParts.length) {
				if (!Util.ObjectInArray(candidateParts[i], this.selectedParts)) return candidateParts[i];
			}
			return null;
		}
	}
}
