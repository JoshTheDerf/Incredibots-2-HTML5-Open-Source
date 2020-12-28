package Gui
{
	import Game.*;
	
	import General.Database;
	
	import fl.controls.*;
	
	import flash.events.*;
	import flash.text.*;
	
	
	public class RestrictionsWindow extends GuiWindow
	{
		private var cont:ControllerChallenge;
		
		private var circleBox:CheckBox;
		private var rectBox:CheckBox;
		private var triBox:CheckBox;
		public var fjBox:CheckBox;
		private var rjBox:CheckBox;
		public var sjBox:CheckBox;
		public var thrustersBox:CheckBox;
		private var cannonBox:CheckBox;
		private var mouseBox:CheckBox;
		private var controlBox:CheckBox;
		private var constructionBox:CheckBox;
		private var fixateBox:CheckBox;
		private var collisionBox:CheckBox;
		private var conditionsBox:CheckBox;
		private var minDensityBox:CheckBox;
		private var maxDensityBox:CheckBox;
		private var maxRJStrengthBox:CheckBox;
		private var maxRJSpeedBox:CheckBox;
		private var maxSJStrengthBox:CheckBox;
		private var maxSJSpeedBox:CheckBox;
		private var maxThrusterBox:CheckBox;
		
		private var minDensityArea:TextInput;
		private var maxDensityArea:TextInput;
		private var maxRJStrengthArea:TextInput;
		private var maxRJSpeedArea:TextInput;
		private var maxSJStrengthArea:TextInput;
		private var maxSJSpeedArea:TextInput;
		private var maxThrusterArea:TextInput;
		
		private var backButton:GuiButton;
		private var okButton:GuiButton;
		
		public function RestrictionsWindow(contr:ControllerChallenge)
		{
			cont = contr;
			
			var header:TextField = new TextField();
			header.text = "Set Restrictions For This Challenge";
			header.width = 400;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 95;
			header.y = 10;
			var format:TextFormat = new TextFormat();
			format.size = 20;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;
			header.setTextFormat(format);
			addChild(header);

			format = new TextFormat();
			format.size = 12;
			format.align = TextFormatAlign.CENTER;
			format.font = Main.GLOBAL_FONT;

			header = new TextField();
			header.text = "Min Density:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 0;
			header.y = 210;
			header.setTextFormat(format);
			addChild(header);

			header = new TextField();
			header.text = "Max Density:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 0;
			header.y = 260;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "Max Sliding Joint Strength:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 0;
			header.y = 310;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "Max Sliding Joint Speed:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 0;
			header.y = 360;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "Max Rotating Joint Strength:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 205;
			header.y = 210;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "Max Rotating Joint Speed:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 205;
			header.y = 260;
			header.setTextFormat(format);
			addChild(header);
			
			header = new TextField();
			header.text = "Max Thruster Strength:";
			header.width = 360;
			header.height = 30;
			header.textColor = 0x242930;
			header.selectable = false;
			header.x = 205;
			header.y = 310;
			header.setTextFormat(format);
			addChild(header);

			format = new TextFormat();
			format.color = 0x242930;
			format.font = Main.GLOBAL_FONT;
			format.size = 12;
			
			circleBox = new GuiCheckBox();
			circleBox.label = "Exclude Circles";
			circleBox.x = 15;
			circleBox.y = 45;
			circleBox.width = 190;
			circleBox.selected = !ControllerChallenge.challenge.circlesAllowed;
			circleBox.setStyle("textFormat", format);
			circleBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(circleBox);

			rectBox = new GuiCheckBox();
			rectBox.label = "Exclude Rectangles";
			rectBox.x = 205;
			rectBox.y = 45;
			rectBox.width = 190;
			rectBox.selected = !ControllerChallenge.challenge.rectanglesAllowed;
			rectBox.setStyle("textFormat", format);
			rectBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(rectBox);

			triBox = new GuiCheckBox();
			triBox.label = "Exclude Triangles";
			triBox.x = 395;
			triBox.y = 45;
			triBox.width = 190;
			triBox.selected = !ControllerChallenge.challenge.trianglesAllowed;
			triBox.setStyle("textFormat", format);
			triBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(triBox);

			fjBox = new GuiCheckBox();
			fjBox.label = "Exclude Fixed Joints";
			fjBox.x = 15;
			fjBox.y = 75;
			fjBox.width = 190;
			fjBox.selected = !ControllerChallenge.challenge.fixedJointsAllowed;
			fjBox.setStyle("textFormat", format);
			fjBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(fjBox);
			
			rjBox = new GuiCheckBox();
			rjBox.label = "Exclude Rotating Joints";
			rjBox.x = 205;
			rjBox.y = 75;
			rjBox.width = 190;
			rjBox.selected = !ControllerChallenge.challenge.rotatingJointsAllowed;
			rjBox.setStyle("textFormat", format);
			rjBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(rjBox);
			
			sjBox = new GuiCheckBox();
			sjBox.label = "Exclude Sliding Joints";
			sjBox.x = 395;
			sjBox.y = 75;
			sjBox.width = 190;
			sjBox.selected = !ControllerChallenge.challenge.slidingJointsAllowed;
			sjBox.setStyle("textFormat", format);
			sjBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(sjBox);

			thrustersBox = new GuiCheckBox();
			thrustersBox.label = "Exclude Thrusters";
			thrustersBox.x = 110;
			thrustersBox.y = 105;
			thrustersBox.width = 190;
			thrustersBox.selected = !ControllerChallenge.challenge.thrustersAllowed;
			thrustersBox.setStyle("textFormat", format);
			thrustersBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(thrustersBox);
			
			cannonBox = new GuiCheckBox();
			cannonBox.label = "Exclude Cannons";
			cannonBox.x = 300;
			cannonBox.y = 105;
			cannonBox.width = 190;
			cannonBox.selected = !ControllerChallenge.challenge.cannonsAllowed;
			cannonBox.setStyle("textFormat", format);
			cannonBox.addEventListener(Event.CHANGE, boxChanged, false, 0, true);
			addChild(cannonBox);
			
			mouseBox = new GuiCheckBox();
			mouseBox.label = "Allow Dragging With Mouse";
			mouseBox.x = 15;
			mouseBox.y = 145;
			mouseBox.width = 200;
			mouseBox.selected = ControllerChallenge.challenge.mouseDragAllowed;
			mouseBox.setStyle("textFormat", format);
			addChild(mouseBox);
			
			controlBox = new GuiCheckBox();
			controlBox.label = "Allow User Control of Bot";
			controlBox.x = 205;
			controlBox.y = 145;
			controlBox.width = 190;
			controlBox.selected = ControllerChallenge.challenge.botControlAllowed;
			controlBox.setStyle("textFormat", format);
			addChild(controlBox);
			
			constructionBox = new GuiCheckBox();
			constructionBox.label = "Allow User Construction";
			constructionBox.x = 395;
			constructionBox.y = 145;
			constructionBox.width = 190;
			constructionBox.selected = (ControllerChallenge.challenge.circlesAllowed || ControllerChallenge.challenge.rectanglesAllowed || ControllerChallenge.challenge.trianglesAllowed || ControllerChallenge.challenge.fixedJointsAllowed || ControllerChallenge.challenge.rotatingJointsAllowed || ControllerChallenge.challenge.slidingJointsAllowed || ControllerChallenge.challenge.thrustersAllowed);
			constructionBox.setStyle("textFormat", format);
			constructionBox.addEventListener(Event.CHANGE, allowBuildingBoxChanged, false, 0, true);
			addChild(constructionBox);

			fixateBox = new GuiCheckBox();
			fixateBox.label = "Allow Fixated Shapes";
			fixateBox.x = 205;
			fixateBox.y = 175;
			fixateBox.width = 190;
			fixateBox.selected = ControllerChallenge.challenge.fixateAllowed;
			fixateBox.setStyle("textFormat", format);
			addChild(fixateBox);

			collisionBox = new GuiCheckBox();
			collisionBox.label = "Allow Non-colliding Shapes";
			collisionBox.x = 15;
			collisionBox.y = 175;
			collisionBox.width = 200;
			collisionBox.selected = ControllerChallenge.challenge.nonCollidingAllowed;
			collisionBox.setStyle("textFormat", format);
			addChild(collisionBox);
			
			conditionsBox = new GuiCheckBox();
			conditionsBox.label = "Conditions Always Visible";
			conditionsBox.x = 395;
			conditionsBox.y = 175;
			conditionsBox.width = 200;
			conditionsBox.selected = ControllerChallenge.challenge.showConditions;
			conditionsBox.setStyle("textFormat", format);
			addChild(conditionsBox);

			minDensityBox = new GuiCheckBox();
			minDensityBox.label = "No Limit";
			minDensityBox.x = 95;
			minDensityBox.y = 230;
			minDensityBox.width = 190;
			minDensityBox.selected = (ControllerChallenge.challenge.minDensity == -Number.MAX_VALUE);
			minDensityBox.setStyle("textFormat", format);
			minDensityBox.addEventListener(Event.CHANGE, minDensityBoxChanged, false, 0, true);
			addChild(minDensityBox);

			maxDensityBox = new GuiCheckBox();
			maxDensityBox.label = "No Limit";
			maxDensityBox.x = 95;
			maxDensityBox.y = 280;
			maxDensityBox.width = 190;
			maxDensityBox.selected = (ControllerChallenge.challenge.maxDensity == Number.MAX_VALUE);
			maxDensityBox.setStyle("textFormat", format);
			maxDensityBox.addEventListener(Event.CHANGE, maxDensityBoxChanged, false, 0, true);
			addChild(maxDensityBox);

			maxSJStrengthBox = new GuiCheckBox();
			maxSJStrengthBox.label = "No Limit";
			maxSJStrengthBox.x = 95;
			maxSJStrengthBox.y = 330;
			maxSJStrengthBox.width = 190;
			maxSJStrengthBox.selected = (ControllerChallenge.challenge.maxSJStrength == Number.MAX_VALUE);
			maxSJStrengthBox.setStyle("textFormat", format);
			maxSJStrengthBox.addEventListener(Event.CHANGE, maxSJStrengthBoxChanged, false, 0, true);
			addChild(maxSJStrengthBox);
			
			maxSJSpeedBox = new GuiCheckBox();
			maxSJSpeedBox.label = "No Limit";
			maxSJSpeedBox.x = 95;
			maxSJSpeedBox.y = 380;
			maxSJSpeedBox.width = 190;
			maxSJSpeedBox.selected = (ControllerChallenge.challenge.maxSJSpeed == Number.MAX_VALUE);
			maxSJSpeedBox.setStyle("textFormat", format);
			maxSJSpeedBox.addEventListener(Event.CHANGE, maxSJSpeedBoxChanged, false, 0, true);
			addChild(maxSJSpeedBox);

			maxRJStrengthBox = new GuiCheckBox();
			maxRJStrengthBox.label = "No Limit";
			maxRJStrengthBox.x = 300;
			maxRJStrengthBox.y = 230;
			maxRJStrengthBox.width = 190;
			maxRJStrengthBox.selected = (ControllerChallenge.challenge.maxRJStrength == Number.MAX_VALUE);
			maxRJStrengthBox.setStyle("textFormat", format);
			maxRJStrengthBox.addEventListener(Event.CHANGE, maxRJStrengthBoxChanged, false, 0, true);
			addChild(maxRJStrengthBox);
			
			maxRJSpeedBox = new GuiCheckBox();
			maxRJSpeedBox.label = "No Limit";
			maxRJSpeedBox.x = 300;
			maxRJSpeedBox.y = 280;
			maxRJSpeedBox.width = 190;
			maxRJSpeedBox.selected = (ControllerChallenge.challenge.maxRJSpeed == Number.MAX_VALUE);
			maxRJSpeedBox.setStyle("textFormat", format);
			maxRJSpeedBox.addEventListener(Event.CHANGE, maxRJSpeedBoxChanged, false, 0, true);
			addChild(maxRJSpeedBox);

			maxThrusterBox = new GuiCheckBox();
			maxThrusterBox.label = "No Limit";
			maxThrusterBox.x = 300;
			maxThrusterBox.y = 330;
			maxThrusterBox.width = 190;
			maxThrusterBox.selected = (ControllerChallenge.challenge.maxThrusterStrength == Number.MAX_VALUE);
			maxThrusterBox.setStyle("textFormat", format);
			maxThrusterBox.addEventListener(Event.CHANGE, maxThrusterBoxChanged, false, 0, true);
			addChild(maxThrusterBox);

			format = new TextFormat();
			format.size = 12;
			format.font = Main.GLOBAL_FONT;
			minDensityArea = new GuiTextInput(195, 230, 60, format);
			minDensityArea.height = 20;
			minDensityArea.text = (ControllerChallenge.challenge.minDensity == -Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.minDensity.toString());
			minDensityArea.maxChars = 4;
			minDensityArea.enabled = false;
			minDensityArea.focusEnabled = false;
			minDensityArea.editable = false;
			minDensityArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			minDensityArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(minDensityArea);
			maxDensityArea = new GuiTextInput(195, 280, 60, format);
			maxDensityArea.height = 20;
			maxDensityArea.text = (ControllerChallenge.challenge.maxDensity == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxDensity.toString());
			maxDensityArea.maxChars = 4;
			maxDensityArea.enabled = false;
			maxDensityArea.focusEnabled = false;
			maxDensityArea.editable = false;
			maxDensityArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			maxDensityArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(maxDensityArea);
			maxSJStrengthArea = new GuiTextInput(195, 330, 60, format);
			maxSJStrengthArea.height = 20;
			maxSJStrengthArea.text = (ControllerChallenge.challenge.maxSJStrength == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxSJStrength.toString());
			maxSJStrengthArea.maxChars = 4;
			maxSJStrengthArea.enabled = false;
			maxSJStrengthArea.focusEnabled = false;
			maxSJStrengthArea.editable = false;
			maxSJStrengthArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			maxSJStrengthArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(maxSJStrengthArea);
			maxSJSpeedArea = new GuiTextInput(195, 380, 60, format);
			maxSJSpeedArea.height = 20;
			maxSJSpeedArea.text = (ControllerChallenge.challenge.maxSJSpeed == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxSJSpeed.toString());
			maxSJSpeedArea.maxChars = 4;
			maxSJSpeedArea.enabled = false;
			maxSJSpeedArea.focusEnabled = false;
			maxSJSpeedArea.editable = false;
			maxSJSpeedArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			maxSJSpeedArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(maxSJSpeedArea);
			maxRJStrengthArea = new GuiTextInput(400, 230, 60, format);
			maxRJStrengthArea.height = 20;
			maxRJStrengthArea.text = (ControllerChallenge.challenge.maxRJStrength == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxRJStrength.toString());
			maxRJStrengthArea.maxChars = 4;
			maxRJStrengthArea.enabled = false;
			maxRJStrengthArea.focusEnabled = false;
			maxRJStrengthArea.editable = false;
			maxRJStrengthArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			maxRJStrengthArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(maxRJStrengthArea);
			maxRJSpeedArea = new GuiTextInput(400, 280, 60, format);
			maxRJSpeedArea.height = 20;
			maxRJSpeedArea.text = (ControllerChallenge.challenge.maxRJSpeed == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxRJSpeed.toString());
			maxRJSpeedArea.maxChars = 4;
			maxRJSpeedArea.enabled = false;
			maxRJSpeedArea.focusEnabled = false;
			maxRJSpeedArea.editable = false;
			maxRJSpeedArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			maxRJSpeedArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(maxRJSpeedArea);
			maxThrusterArea = new GuiTextInput(400, 330, 60, format);
			maxThrusterArea.height = 20;
			maxThrusterArea.text = (ControllerChallenge.challenge.maxThrusterStrength == Number.MAX_VALUE ? "15" : ControllerChallenge.challenge.maxThrusterStrength.toString());
			maxThrusterArea.maxChars = 4;
			maxThrusterArea.enabled = false;
			maxThrusterArea.focusEnabled = false;
			maxThrusterArea.editable = false;
			maxThrusterArea.addEventListener(MouseEvent.CLICK, textFocus, false, 0, true);
			maxThrusterArea.addEventListener(FocusEvent.FOCUS_OUT, textEntered, false, 0, true);
			addChild(maxThrusterArea);

			format = new TextFormat();
			format.size = 14;
			backButton = new GuiButton("Back", 285, 370, 100, 40, backButtonPressed, GuiButton.PURPLE, format);
			addChild(backButton);
			okButton = new GuiButton("Okay!", 385, 365, 100, 50, okButtonPressed, GuiButton.BLUE, format);
			addChild(okButton);

			super(105, 100, 600, 434);
		}
		
		private function backButtonPressed(e:MouseEvent, callback:Boolean = true):Boolean {
			ControllerChallenge.challenge.circlesAllowed = !circleBox.selected;
			ControllerChallenge.challenge.rectanglesAllowed = !rectBox.selected;
			ControllerChallenge.challenge.trianglesAllowed = !triBox.selected;
			ControllerChallenge.challenge.fixedJointsAllowed = !fjBox.selected;
			ControllerChallenge.challenge.rotatingJointsAllowed = !rjBox.selected;
			ControllerChallenge.challenge.slidingJointsAllowed = !sjBox.selected;
			ControllerChallenge.challenge.thrustersAllowed = !thrustersBox.selected;
			ControllerChallenge.challenge.cannonsAllowed = !cannonBox.selected;
			ControllerChallenge.challenge.mouseDragAllowed = mouseBox.selected;
			ControllerChallenge.challenge.botControlAllowed = controlBox.selected;
			ControllerChallenge.challenge.fixateAllowed = fixateBox.selected;
			ControllerChallenge.challenge.nonCollidingAllowed = collisionBox.selected;
			ControllerChallenge.challenge.showConditions = conditionsBox.selected;
			
			var minDensity:Number = (minDensityBox.selected ? -Number.MAX_VALUE : Number(minDensityArea.text));
			var maxDensity:Number = (maxDensityBox.selected ? Number.MAX_VALUE : Number(maxDensityArea.text));
			var maxRJStrength:Number = (maxRJStrengthBox.selected ? Number.MAX_VALUE : Number(maxRJStrengthArea.text));
			var maxRJSpeed:Number = (maxRJSpeedBox.selected ? Number.MAX_VALUE : Number(maxRJSpeedArea.text));
			var maxSJStrength:Number = (maxSJStrengthBox.selected ? Number.MAX_VALUE : Number(maxSJStrengthArea.text));
			var maxSJSpeed:Number = (maxSJSpeedBox.selected ? Number.MAX_VALUE : Number(maxSJSpeedArea.text));
			var maxThrusterStrength:Number = (maxThrusterBox.selected ? Number.MAX_VALUE : Number(maxThrusterArea.text));
			
			if (!minDensityBox.selected) {
				if (minDensity < 1.0) minDensity = 1.0;
				if (minDensity > 30.0) minDensity = 30.0;
				if (isNaN(minDensity)) minDensity = 15.0;
			}
			if (!maxDensityBox.selected) {
				if (maxDensity < 1.0) maxDensity = 1.0;
				if (maxDensity > 30.0) maxDensity = 30.0;
				if (isNaN(maxDensity)) maxDensity = 15.0;
			}
			if (!maxRJStrengthBox.selected) {
				if (maxRJStrength < 1.0) maxRJStrength = 1.0;
				if (maxRJStrength > 30.0) maxRJStrength = 30.0;
				if (isNaN(maxRJStrength)) maxRJStrength = 15.0;
			}
			if (!maxRJSpeedBox.selected) {
				if (maxRJSpeed < 1.0) maxRJSpeed = 1.0;
				if (maxRJSpeed > 30.0) maxRJSpeed = 30.0;
				if (isNaN(maxRJSpeed)) maxRJSpeed = 15.0;
			}
			if (!maxSJStrengthBox.selected) {
				if (maxSJStrength < 1.0) maxSJStrength = 1.0;
				if (maxSJStrength > 30.0) maxSJStrength = 30.0;
				if (isNaN(maxSJStrength)) maxSJStrength = 15.0;
			}
			if (!maxSJSpeedBox.selected) {
				if (maxSJSpeed < 1.0) maxSJSpeed = 1.0;
				if (maxSJSpeed > 30.0) maxSJSpeed = 30.0;
				if (isNaN(maxSJSpeed)) maxSJSpeed = 15.0;
			}
			if (!maxThrusterBox.selected) {
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
			
			ControllerGame.minDensity = minDensity;
			ControllerGame.maxDensity = maxDensity;
			ControllerGame.maxRJStrength = maxRJStrength;
			ControllerGame.maxRJSpeed = maxRJSpeed;
			ControllerGame.maxSJStrength = maxSJStrength;
			ControllerGame.maxSJSpeed = maxSJSpeed;
			ControllerGame.maxThrusterStrength = maxThrusterStrength;
			
			ControllerGame.minDensity = (minDensity == -Number.MAX_VALUE ? 1 : minDensity);
			ControllerGame.maxDensity = (maxDensity == Number.MAX_VALUE ? 30 : maxDensity);
			ControllerGame.maxRJStrength = (maxRJStrength == Number.MAX_VALUE ? 30 : maxRJStrength);
			ControllerGame.maxRJSpeed = (maxRJSpeed == Number.MAX_VALUE ? 30 : maxRJSpeed);
			ControllerGame.maxSJStrength = (maxSJStrength == Number.MAX_VALUE ? 30 : maxSJStrength);
			ControllerGame.maxSJSpeed = (maxSJSpeed == Number.MAX_VALUE ? 30 : maxSJSpeed);
			ControllerGame.maxThrusterStrength = (maxThrusterStrength == Number.MAX_VALUE ? 30 : maxThrusterStrength);
			
			if (minDensity > maxDensity && callback) {
				maxDensity = minDensity;
				visible = false;
				cont.m_fader.visible = false;
				return true;
			} else if (minDensity > maxDensity) {
				ShowFader();
				cont.ShowDialog2("The minimum density must be less than the maximum density.");
				return false;
			} else {
				if (callback) {
					visible = false;
					cont.m_fader.visible = false;
				}
				return true;
			}
		}
		
		private function okButtonPressed(e:MouseEvent):void {
			if (backButtonPressed(e, false)) {
				visible = false;
				if (cont.saveAfterRestrictions) {
					//Database.GetChallengeData(ControllerGame.userName, ControllerGame.password, false, Database.curSortType, (Database.curSortPeriod == Database.SORT_PERIOD_FEATURED ? Database.SORT_PERIOD_ALLTIME : Database.curSortPeriod), 1, "", cont.finishGettingSaveChallengeData);
					//cont.ShowDialog("Getting challenges...");
					//Main.ShowHourglass();
					Database.ExportChallenge(ControllerChallenge.challenge, "", "", 1, 1, (cont as ControllerGame).finishExporting);
				} else {
					cont.m_fader.visible = false;
				}
			}
		}
		
		private function textFocus(e:Event):void {
			e.target.setSelection(0, 4);
		}
		
		private function textEntered(e:Event):void {
			var num:Number = Number(e.target.text);
			if (num < 1.0) num = 1.0;
			if (num > 30.0) num = 30.0;
			if (isNaN(num)) num = 15.0;
			e.target.text = num.toString();
		}
		
		private function boxChanged(e:Event):void {
			if (!e.target.selected) {
				constructionBox.selected = true;
			}
		}
		
		private function allowBuildingBoxChanged(e:Event):void {
			if (!constructionBox.selected) {
				circleBox.selected = true;
				rectBox.selected = true;
				triBox.selected = true;
				fjBox.selected = true;
				rjBox.selected = true;
				sjBox.selected = true;
				thrustersBox.selected = true;
				cannonBox.selected = true;
			} else {
				circleBox.selected = false;
				rectBox.selected = false;
				triBox.selected = false;
				fjBox.selected = false;
				rjBox.selected = false;
				sjBox.selected = false;
				thrustersBox.selected = false;
				cannonBox.selected = false;
			}
		}
		
		private function minDensityBoxChanged(e:Event):void {
			minDensityArea.enabled = !minDensityBox.selected;
			minDensityArea.focusEnabled = !minDensityBox.selected;
			minDensityArea.editable = !minDensityBox.selected;
		}
		
		private function maxDensityBoxChanged(e:Event):void {
			maxDensityArea.enabled = !maxDensityBox.selected;
			maxDensityArea.focusEnabled = !maxDensityBox.selected;
			maxDensityArea.editable = !maxDensityBox.selected;
		}
		
		private function maxRJStrengthBoxChanged(e:Event):void {
			maxRJStrengthArea.enabled = !maxRJStrengthBox.selected;
			maxRJStrengthArea.focusEnabled = !maxRJStrengthBox.selected;
			maxRJStrengthArea.editable = !maxRJStrengthBox.selected;
		}
		
		private function maxRJSpeedBoxChanged(e:Event):void {
			maxRJSpeedArea.enabled = !maxRJSpeedBox.selected;
			maxRJSpeedArea.focusEnabled = !maxRJSpeedBox.selected;
			maxRJSpeedArea.editable = !maxRJSpeedBox.selected;
		}
		
		private function maxSJStrengthBoxChanged(e:Event):void {
			maxSJStrengthArea.enabled = !maxSJStrengthBox.selected;
			maxSJStrengthArea.focusEnabled = !maxSJStrengthBox.selected;
			maxSJStrengthArea.editable = !maxSJStrengthBox.selected;
		}
		
		private function maxSJSpeedBoxChanged(e:Event):void {
			maxSJSpeedArea.enabled = !maxSJSpeedBox.selected;
			maxSJSpeedArea.focusEnabled = !maxSJSpeedBox.selected;
			maxSJSpeedArea.editable = !maxSJSpeedBox.selected;
		}
		
		private function maxThrusterBoxChanged(e:Event):void {
			maxThrusterArea.enabled = !maxThrusterBox.selected;
			maxThrusterArea.focusEnabled = !maxThrusterBox.selected;
			maxThrusterArea.editable = !maxThrusterBox.selected;
		}
	}
}