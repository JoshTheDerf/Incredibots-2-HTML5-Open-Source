import { ControllerChallenge, Main, ControllerGameGlobals, Database, ControllerGame, GuiButton,	GuiCheckBox, GuiTextInput, GuiWindow } from "../imports";
import { Text, TextStyle } from 'pixi.js'

export class RestrictionsWindow extends GuiWindow {
	private cont:ControllerChallenge;

	private circleBox:GuiCheckBox;
	private rectBox:GuiCheckBox;
	private triBox:GuiCheckBox;
	private fjBox:GuiCheckBox;
	private rjBox:GuiCheckBox;
	private sjBox:GuiCheckBox;
	private thrustersBox:GuiCheckBox;
	private cannonBox:GuiCheckBox;
	private mouseBox:GuiCheckBox;
	private controlBox:GuiCheckBox;
	private constructionBox:GuiCheckBox;
	private fixateBox:GuiCheckBox;
	private collisionBox:GuiCheckBox;
	private conditionsBox:GuiCheckBox;
	private minDensityBox:GuiCheckBox;
	private maxDensityBox:GuiCheckBox;
	private maxRJStrengthBox:GuiCheckBox;
	private maxRJSpeedBox:GuiCheckBox;
	private maxSJStrengthBox:GuiCheckBox;
	private maxSJSpeedBox:GuiCheckBox;
	private maxThrusterBox:GuiCheckBox;

	private minDensityArea:GuiTextInput;
	private maxDensityArea:GuiTextInput;
	private maxRJStrengthArea:GuiTextInput;
	private maxRJSpeedArea:GuiTextInput;
	private maxSJStrengthArea:GuiTextInput;
	private maxSJSpeedArea:GuiTextInput;
	private maxThrusterArea:GuiTextInput;

	private backButton:GuiButton;
	private okButton:GuiButton;

	constructor(contr:ControllerChallenge)
	{
		super(105, 100, 600, 434);
		this.cont = contr;

		var header:Text = new Text("");
		header.text = "Set Restrictions For This Challenge";
		header.anchor.set(0.5, 0.5)
		header.x = 95 + 400 / 2;
		header.y = 10 + 30 / 2;
		var format:TextStyle = new TextStyle();
		format.fontSize = 20;
		format.align = "center";
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;
		header.style = format;
		this.addChild(header);

		format = new TextStyle();
		format.fontSize = 12;
		format.align = "center";
		format.fontFamily = Main.GLOBAL_FONT;
		format.fill = 0x242930;

		header = new Text("");
		header.text = "Min Density:";
		header.anchor.set(0.5, 0.5)
		header.x = 0 + 360 / 2;
		header.y = 210 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text("");
		header.text = "Max Density:";
		header.anchor.set(0.5, 0.5)
		header.x = 0 + 360 / 2;
		header.y = 260 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text("");
		header.text = "Max Sliding Joint Strength:";
		header.anchor.set(0.5, 0.5)
		header.x = 0 + 360 / 2;
		header.y = 310 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text("");
		header.text = "Max Sliding Joint Speed:";
		header.anchor.set(0.5, 0.5)
		header.x = 0 + 360 / 2;
		header.y = 360 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text("");
		header.text = "Max Rotating Joint Strength:";
		header.anchor.set(0.5, 0.5)
		header.x = 205 + 360 / 2;
		header.y = 210 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text("");
		header.text = "Max Rotating Joint Speed:";
		header.anchor.set(0.5, 0.5)
		header.x = 205 + 360 / 2;
		header.y = 260 + 30 / 2;
		header.style = format;
		this.addChild(header);

		header = new Text("");
		header.text = "Max Thruster Strength:";
		header.anchor.set(0.5, 0.5)
		header.x = 205 + 360 / 2;
		header.y = 310 + 30 / 2;
		header.style = format;
		this.addChild(header);

		format = new TextStyle();
		format.fill = 0x242930;
		format.fontFamily = Main.GLOBAL_FONT;
		format.fontSize = 12;

		this.circleBox = new GuiCheckBox(15, 45, 190);
		this.circleBox.label = "Exclude Circles";
		this.circleBox.x = 15;
		this.circleBox.y = 45;
		this.circleBox.selected = !ControllerChallenge.challenge.circlesAllowed;
		this.circleBox.style = format
		this.circleBox.on("change", (value) => this.boxChanged(value));
		this.addChild(this.circleBox);

		this.rectBox = new GuiCheckBox(205, 45, 190);
		this.rectBox.label = "Exclude Rectangles";
		this.rectBox.selected = !ControllerChallenge.challenge.rectanglesAllowed;
		this.rectBox.style = format
		this.rectBox.on("change", value => this.boxChanged(value));
		this.addChild(this.rectBox);

		this.triBox = new GuiCheckBox(395, 45, 190);
		this.triBox.label = "Exclude Triangles";
		this.triBox.x = 395;
		this.triBox.y = 45;
		this.triBox.selected = !ControllerChallenge.challenge.trianglesAllowed;
		this.triBox.style = format
		this.triBox.on("change", value => this.boxChanged(value));
		this.addChild(this.triBox);

		this.fjBox = new GuiCheckBox(15, 75, 190);
		this.fjBox.label = "Exclude Fixed Joints";
		this.fjBox.selected = !ControllerChallenge.challenge.fixedJointsAllowed;
		this.fjBox.style = format
		this.fjBox.on("change", value => this.boxChanged(value));
		this.addChild(this.fjBox);

		this.rjBox = new GuiCheckBox(205, 75, 190);
		this.rjBox.label = "Exclude Rotating Joints";
		this.rjBox.selected = !ControllerChallenge.challenge.rotatingJointsAllowed;
		this.rjBox.style = format
		this.rjBox.on("change", value => this.boxChanged(value));
		this.addChild(this.rjBox);

		this.sjBox = new GuiCheckBox(395, 75, 190);
		this.sjBox.label = "Exclude Sliding Joints";
		this.sjBox.selected = !ControllerChallenge.challenge.slidingJointsAllowed;
		this.sjBox.style = format
		this.sjBox.on("change", value => this.boxChanged(value));
		this.addChild(this.sjBox);

		this.thrustersBox = new GuiCheckBox(110, 105, 190);
		this.thrustersBox.label = "Exclude Thrusters";
		this.thrustersBox.selected = !ControllerChallenge.challenge.thrustersAllowed;
		this.thrustersBox.style = format
		this.thrustersBox.on("change", value => this.boxChanged(value));
		this.addChild(this.thrustersBox);

		this.cannonBox = new GuiCheckBox(300, 105, 190);
		this.cannonBox.label = "Exclude Cannons";
		this.cannonBox.selected = !ControllerChallenge.challenge.cannonsAllowed;
		this.cannonBox.style = format
		this.cannonBox.on("change", value => this.boxChanged(value));
		this.addChild(this.cannonBox);

		this.mouseBox = new GuiCheckBox(15, 145, 200);
		this.mouseBox.label = "Allow Dragging With Mouse";
		this.mouseBox.selected = ControllerChallenge.challenge.mouseDragAllowed;
		this.mouseBox.style = format
		this.addChild(this.mouseBox);

		this.controlBox = new GuiCheckBox(205, 145, 190);
		this.controlBox.label = "Allow User Control of Bot";
		this.controlBox.selected = ControllerChallenge.challenge.botControlAllowed;
		this.controlBox.style = format
		this.addChild(this.controlBox);

		this.constructionBox = new GuiCheckBox(395, 145, 190);
		this.constructionBox.label = "Allow User Construction";
		this.constructionBox.selected = (ControllerChallenge.challenge.circlesAllowed || ControllerChallenge.challenge.rectanglesAllowed || ControllerChallenge.challenge.trianglesAllowed || ControllerChallenge.challenge.fixedJointsAllowed || ControllerChallenge.challenge.rotatingJointsAllowed || ControllerChallenge.challenge.slidingJointsAllowed || ControllerChallenge.challenge.thrustersAllowed);
		this.constructionBox.style = format
		this.constructionBox.on("change", () => this.allowBuildingBoxChanged());
		this.addChild(this.constructionBox);

		this.fixateBox = new GuiCheckBox(205, 175, 190);
		this.fixateBox.label = "Allow Fixated Shapes";
		this.fixateBox.selected = ControllerChallenge.challenge.fixateAllowed;
		this.fixateBox.style = format
		this.addChild(this.fixateBox);

		this.collisionBox = new GuiCheckBox(15, 175, 200);
		this.collisionBox.label = "Allow Non-colliding Shapes";
		this.collisionBox.selected = ControllerChallenge.challenge.nonCollidingAllowed;
		this.collisionBox.style = format
		this.addChild(this.collisionBox);

		this.conditionsBox = new GuiCheckBox(395, 175, 200);
		this.conditionsBox.label = "Conditions Always Visible";
		this.conditionsBox.selected = ControllerChallenge.challenge.showConditions;
		this.conditionsBox.style = format
		this.addChild(this.conditionsBox);

		this.minDensityBox = new GuiCheckBox(95, 230, 190);
		this.minDensityBox.label = "No Limit";
		this.minDensityBox.selected = (ControllerChallenge.challenge.minDensity == -Number.MAX_VALUE);
		this.minDensityBox.style = format
		this.minDensityBox.on("change", () => this.minDensityBoxChanged());
		this.addChild(this.minDensityBox);

		this.maxDensityBox = new GuiCheckBox(95, 280, 190);
		this.maxDensityBox.label = "No Limit";
		this.maxDensityBox.selected = (ControllerChallenge.challenge.maxDensity == Number.MAX_VALUE);
		this.maxDensityBox.style = format
		this.maxDensityBox.on("change", () => this.maxDensityBoxChanged());
		this.addChild(this.maxDensityBox);

		this.maxSJStrengthBox = new GuiCheckBox(95, 330, 190);
		this.maxSJStrengthBox.label = "No Limit";
		this.maxSJStrengthBox.selected = (ControllerChallenge.challenge.maxSJStrength == Number.MAX_VALUE);
		this.maxSJStrengthBox.style = format
		this.maxSJStrengthBox.on("change", () => this.maxSJStrengthBoxChanged());
		this.addChild(this.maxSJStrengthBox);

		this.maxSJSpeedBox = new GuiCheckBox(95, 380, 190);
		this.maxSJSpeedBox.label = "No Limit";
		this.maxSJSpeedBox.selected = (ControllerChallenge.challenge.maxSJSpeed == Number.MAX_VALUE);
		this.maxSJSpeedBox.style = format
		this.maxSJSpeedBox.on("change", () => this.maxSJSpeedBoxChanged());
		this.addChild(this.maxSJSpeedBox);

		this.maxRJStrengthBox = new GuiCheckBox(300, 230, 190);
		this.maxRJStrengthBox.label = "No Limit";
		this.maxRJStrengthBox.selected = (ControllerChallenge.challenge.maxRJStrength == Number.MAX_VALUE);
		this.maxRJStrengthBox.style = format
		this.maxRJStrengthBox.on("change", () => this.maxRJStrengthBoxChanged());
		this.addChild(this.maxRJStrengthBox);

		this.maxRJSpeedBox = new GuiCheckBox(300, 280, 190);
		this.maxRJSpeedBox.label = "No Limit";
		this.maxRJSpeedBox.selected = (ControllerChallenge.challenge.maxRJSpeed == Number.MAX_VALUE);
		this.maxRJSpeedBox.style = format
		this.maxRJSpeedBox.on("change", () => this.maxRJSpeedBoxChanged());
		this.addChild(this.maxRJSpeedBox);

		this.maxThrusterBox = new GuiCheckBox(300, 330, 190);
		this.maxThrusterBox.label = "No Limit";
		this.maxThrusterBox.selected = (ControllerChallenge.challenge.maxThrusterStrength == Number.MAX_VALUE);
		this.maxThrusterBox.style = format
		this.maxThrusterBox.on("change", () => this.maxThrusterBoxChanged());
		this.addChild(this.maxThrusterBox);

		format = new TextStyle();
		format.fontSize = 12;
		format.fontFamily = Main.GLOBAL_FONT;
		this.minDensityArea = new GuiTextInput(195, 230, 60, 20, format);
		this.minDensityArea.text = (ControllerChallenge.challenge.minDensity == -Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.minDensity.toString());
		this.minDensityArea.maxLength = 4;
		this.minDensityArea.enabled = false;
		this.minDensityArea.editable = false;
		this.minDensityArea.on('focus', () => this.minDensityArea.textInput.select())
		this.minDensityArea.on("blur", text => this.textEntered(this.minDensityArea, text))
		this.addChild(this.minDensityArea);
		this.maxDensityArea = new GuiTextInput(195, 280, 60, 20, format);
		this.maxDensityArea.text = (ControllerChallenge.challenge.maxDensity == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxDensity.toString());
		this.maxDensityArea.maxLength = 4;
		this.maxDensityArea.enabled = false;
		this.maxDensityArea.editable = false;
		this.maxDensityArea.on('focus', () => this.maxDensityArea.textInput.select())
		this.maxDensityArea.on("blur", text => this.textEntered(this.maxDensityArea, text))
		this.addChild(this.maxDensityArea);
		this.maxSJStrengthArea = new GuiTextInput(195, 330, 60, 20, format);
		this.maxSJStrengthArea.text = (ControllerChallenge.challenge.maxSJStrength == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxSJStrength.toString());
		this.maxSJStrengthArea.maxLength = 4;
		this.maxSJStrengthArea.enabled = false;
		this.maxSJStrengthArea.editable = false;
		this.maxSJStrengthArea.on('focus', () => this.maxSJStrengthArea.textInput.select())
		this.maxSJStrengthArea.on("blur", text => this.textEntered(this.maxSJStrengthArea, text))
		this.addChild(this.maxSJStrengthArea);
		this.maxSJSpeedArea = new GuiTextInput(195, 380, 60, 20, format);
		this.maxSJSpeedArea.text = (ControllerChallenge.challenge.maxSJSpeed == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxSJSpeed.toString());
		this.maxSJSpeedArea.maxLength = 4;
		this.maxSJSpeedArea.enabled = false;
		this.maxSJSpeedArea.editable = false;
		this.maxSJSpeedArea.on('focus', () => this.maxSJSpeedArea.textInput.select())
		this.maxSJSpeedArea.on("blur", text => this.textEntered(this.maxSJSpeedArea, text))
		this.addChild(this.maxSJSpeedArea);
		this.maxRJStrengthArea = new GuiTextInput(400, 230, 60, 20, format);
		this.maxRJStrengthArea.text = (ControllerChallenge.challenge.maxRJStrength == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxRJStrength.toString());
		this.maxRJStrengthArea.maxLength = 4;
		this.maxRJStrengthArea.enabled = false;
		this.maxRJStrengthArea.editable = false;
		this.maxRJStrengthArea.on('focus', () => this.maxRJStrengthArea.textInput.select())
		this.maxRJStrengthArea.on("blur", text => this.textEntered(this.maxRJStrengthArea, text))
		this.addChild(this.maxRJStrengthArea);
		this.maxRJSpeedArea = new GuiTextInput(400, 280, 60, 20, format);
		this.maxRJSpeedArea.text = (ControllerChallenge.challenge.maxRJSpeed == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxRJSpeed.toString());
		this.maxRJSpeedArea.maxLength = 4;
		this.maxRJSpeedArea.enabled = false;
		this.maxRJSpeedArea.editable = false;
		this.maxRJSpeedArea.on('focus', () => this.maxRJSpeedArea.textInput.select())
		this.maxRJSpeedArea.on("blur", text => this.textEntered(this.maxRJSpeedArea, text))
		this.addChild(this.maxRJSpeedArea);
		this.maxThrusterArea = new GuiTextInput(400, 330, 60, 20, format);
		this.maxThrusterArea.text = (ControllerChallenge.challenge.maxThrusterStrength == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxThrusterStrength.toString());
		this.maxThrusterArea.maxLength = 4;
		this.maxThrusterArea.enabled = false;
		this.maxThrusterArea.editable = false;
		this.maxThrusterArea.on('focus', () => this.maxThrusterArea.textInput.select())
		this.maxThrusterArea.on("blur", text => this.textEntered(this.maxThrusterArea, text))
		this.addChild(this.maxThrusterArea);

		format = new TextStyle();
		format.fontSize = 14;
		this.backButton = new GuiButton("Back", 285, 370, 100, 40, () => this.backButtonPressed(), GuiButton.PURPLE, format);
		this.addChild(this.backButton);
		this.okButton = new GuiButton("Okay!", 385, 365, 100, 50, () => this.okButtonPressed(), GuiButton.BLUE, format);
		this.addChild(this.okButton);
	}

	private backButtonPressed(callback:boolean = true):boolean {
		ControllerChallenge.challenge.circlesAllowed = !this.circleBox.selected;
		ControllerChallenge.challenge.rectanglesAllowed = !this.rectBox.selected;
		ControllerChallenge.challenge.trianglesAllowed = !this.triBox.selected;
		ControllerChallenge.challenge.fixedJointsAllowed = !this.fjBox.selected;
		ControllerChallenge.challenge.rotatingJointsAllowed = !this.rjBox.selected;
		ControllerChallenge.challenge.slidingJointsAllowed = !this.sjBox.selected;
		ControllerChallenge.challenge.thrustersAllowed = !this.thrustersBox.selected;
		ControllerChallenge.challenge.cannonsAllowed = !this.cannonBox.selected;
		ControllerChallenge.challenge.mouseDragAllowed = this.mouseBox.selected;
		ControllerChallenge.challenge.botControlAllowed = this.controlBox.selected;
		ControllerChallenge.challenge.fixateAllowed = this.fixateBox.selected;
		ControllerChallenge.challenge.nonCollidingAllowed = this.collisionBox.selected;
		ControllerChallenge.challenge.showConditions = this.conditionsBox.selected;

		var minDensity:number = (this.minDensityBox.selected ? -Number.MAX_VALUE : Number(this.minDensityArea.text));
		var maxDensity:number = (this.maxDensityBox.selected ? Number.MAX_VALUE : Number(this.maxDensityArea.text));
		var maxRJStrength:number = (this.maxRJStrengthBox.selected ? Number.MAX_VALUE : Number(this.maxRJStrengthArea.text));
		var maxRJSpeed:number = (this.maxRJSpeedBox.selected ? Number.MAX_VALUE : Number(this.maxRJSpeedArea.text));
		var maxSJStrength:number = (this.maxSJStrengthBox.selected ? Number.MAX_VALUE : Number(this.maxSJStrengthArea.text));
		var maxSJSpeed:number = (this.maxSJSpeedBox.selected ? Number.MAX_VALUE : Number(this.maxSJSpeedArea.text));
		var maxThrusterStrength:number = (this.maxThrusterBox.selected ? Number.MAX_VALUE : Number(this.maxThrusterArea.text));

		if (!this.minDensityBox.selected) {
			if (minDensity < 1.0) minDensity = 1.0;
			if (minDensity > 30.0) minDensity = 30.0;
			if (isNaN(minDensity)) minDensity = 15.0;
		}
		if (!this.maxDensityBox.selected) {
			if (maxDensity < 1.0) maxDensity = 1.0;
			if (maxDensity > 30.0) maxDensity = 30.0;
			if (isNaN(maxDensity)) maxDensity = 15.0;
		}
		if (!this.maxRJStrengthBox.selected) {
			if (maxRJStrength < 1.0) maxRJStrength = 1.0;
			if (maxRJStrength > 30.0) maxRJStrength = 30.0;
			if (isNaN(maxRJStrength)) maxRJStrength = 15.0;
		}
		if (!this.maxRJSpeedBox.selected) {
			if (maxRJSpeed < 1.0) maxRJSpeed = 1.0;
			if (maxRJSpeed > 30.0) maxRJSpeed = 30.0;
			if (isNaN(maxRJSpeed)) maxRJSpeed = 15.0;
		}
		if (!this.maxSJStrengthBox.selected) {
			if (maxSJStrength < 1.0) maxSJStrength = 1.0;
			if (maxSJStrength > 30.0) maxSJStrength = 30.0;
			if (isNaN(maxSJStrength)) maxSJStrength = 15.0;
		}
		if (!this.maxSJSpeedBox.selected) {
			if (maxSJSpeed < 1.0) maxSJSpeed = 1.0;
			if (maxSJSpeed > 30.0) maxSJSpeed = 30.0;
			if (isNaN(maxSJSpeed)) maxSJSpeed = 15.0;
		}
		if (!this.maxThrusterBox.selected) {
			if (maxThrusterStrength < 1.0) maxThrusterStrength = 1.0;
			if (maxThrusterStrength > 30.0) maxThrusterStrength = 30.0;
			if (isNaN(maxThrusterStrength)) maxThrusterStrength = 15.0;
		}

		ControllerChallenge.challenge.minDensity = minDensity;
		ControllerChallenge.challenge.maxDensity = maxDensity;
		ControllerChallenge.challenge.maxRJStrength = maxRJStrength;
		ControllerChallenge.challenge.maxRJSpeed = maxRJSpeed;
		ControllerChallenge.challenge.maxSJStrength = maxSJStrength;
		ControllerChallenge.challenge.maxSJSpeed = maxSJSpeed;
		ControllerChallenge.challenge.maxThrusterStrength = maxThrusterStrength;

		ControllerGameGlobals.minDensity = minDensity;
		ControllerGameGlobals.maxDensity = maxDensity;
		ControllerGameGlobals.maxRJStrength = maxRJStrength;
		ControllerGameGlobals.maxRJSpeed = maxRJSpeed;
		ControllerGameGlobals.maxSJStrength = maxSJStrength;
		ControllerGameGlobals.maxSJSpeed = maxSJSpeed;
		ControllerGameGlobals.maxThrusterStrength = maxThrusterStrength;

		ControllerGameGlobals.minDensity = (minDensity == -Number.MAX_VALUE ? 1 : minDensity);
		ControllerGameGlobals.maxDensity = (maxDensity == Number.MAX_VALUE ? 30 : maxDensity);
		ControllerGameGlobals.maxRJStrength = (maxRJStrength == Number.MAX_VALUE ? 30 : maxRJStrength);
		ControllerGameGlobals.maxRJSpeed = (maxRJSpeed == Number.MAX_VALUE ? 30 : maxRJSpeed);
		ControllerGameGlobals.maxSJStrength = (maxSJStrength == Number.MAX_VALUE ? 30 : maxSJStrength);
		ControllerGameGlobals.maxSJSpeed = (maxSJSpeed == Number.MAX_VALUE ? 30 : maxSJSpeed);
		ControllerGameGlobals.maxThrusterStrength = (maxThrusterStrength == Number.MAX_VALUE ? 30 : maxThrusterStrength);

		if (minDensity > maxDensity && callback) {
			maxDensity = minDensity;
			this.visible = false;
			this.cont.m_fader.visible = false;
			return true;
		} else if (minDensity > maxDensity) {
			this.ShowFader();
			this.cont.ShowDialog2("The minimum density must be less than the maximum density.");
			return false;
		} else {
			if (callback) {
				this.visible = false;
				this.cont.m_fader.visible = false;
			}
			return true;
		}
	}

	private okButtonPressed():void {
		if (this.backButtonPressed(false)) {
			this.visible = false;
			if (this.cont.saveAfterRestrictions) {
				//Database.GetChallengeData(ControllerGameGlobals.userName, ControllerGameGlobals.password, false, Database.curSortType, (Database.curSortPeriod == Database.SORT_PERIOD_FEATURED ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), 1, "", cont.finishGettingSaveChallengeData);
				//cont.ShowDialog("Getting challenges...");
				//Main.ShowHourglass();
				Database.ExportChallenge(ControllerChallenge.challenge, "", "", 1, 1, (...args) => this.cont.finishExporting(...args));
			} else {
				this.cont.m_fader.visible = false;
			}
		}
	}

	private textEntered(target: GuiTextInput, text:string):void {
		var num:number = +text;
		if (num < 1.0) num = 1.0;
		if (num > 30.0) num = 30.0;
		if (isNaN(num)) num = 15.0;
		target.text = num.toString();
	}

	private boxChanged(value: boolean):void {
		if (!value) {
			this.constructionBox.selected = true;
		}
	}

	private allowBuildingBoxChanged():void {
		if (!this.constructionBox.selected) {
			this.circleBox.selected = true;
			this.rectBox.selected = true;
			this.triBox.selected = true;
			this.fjBox.selected = true;
			this.rjBox.selected = true;
			this.sjBox.selected = true;
			this.thrustersBox.selected = true;
			this.cannonBox.selected = true;
		} else {
			this.circleBox.selected = false;
			this.rectBox.selected = false;
			this.triBox.selected = false;
			this.fjBox.selected = false;
			this.rjBox.selected = false;
			this.sjBox.selected = false;
			this.thrustersBox.selected = false;
			this.cannonBox.selected = false;
		}
	}

	private minDensityBoxChanged():void {
		this.minDensityArea.enabled = !this.minDensityBox.selected;
		this.minDensityArea.editable = !this.minDensityBox.selected;
	}

	private maxDensityBoxChanged():void {
		this.maxDensityArea.enabled = !this.maxDensityBox.selected;
		this.maxDensityArea.editable = !this.maxDensityBox.selected;
	}

	private maxRJStrengthBoxChanged():void {
		this.maxRJStrengthArea.enabled = !this.maxRJStrengthBox.selected;
		this.maxRJStrengthArea.editable = !this.maxRJStrengthBox.selected;
	}

	private maxRJSpeedBoxChanged():void {
		this.maxRJSpeedArea.enabled = !this.maxRJSpeedBox.selected;
		this.maxRJSpeedArea.editable = !this.maxRJSpeedBox.selected;
	}

	private maxSJStrengthBoxChanged():void {
		this.maxSJStrengthArea.enabled = !this.maxSJStrengthBox.selected;
		this.maxSJStrengthArea.editable = !this.maxSJStrengthBox.selected;
	}

	private maxSJSpeedBoxChanged():void {
		this.maxSJSpeedArea.enabled = !this.maxSJSpeedBox.selected;
		this.maxSJSpeedArea.editable = !this.maxSJSpeedBox.selected;
	}

	private maxThrusterBoxChanged():void {
		this.maxThrusterArea.enabled = !this.maxThrusterBox.selected;
		this.maxThrusterArea.editable = !this.maxThrusterBox.selected;
	}
}
