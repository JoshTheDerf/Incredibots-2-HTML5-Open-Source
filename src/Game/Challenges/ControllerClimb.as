package Game.Challenges
{
	import Box2D.Collision.b2AABB;
	
	import Game.ControllerChallenge;
	import Game.Graphics.*;
	import Game.WinCondition;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.geom.Matrix;
	import flash.events.*;

	public class ControllerClimb extends ControllerChallenge
	{
		public function ControllerClimb()
		{
			playChallengeMode = true;
			playOnlyMode = true;
			
			var cond:WinCondition = new WinCondition("Cond", 2, 1);
			cond.minY = -10.5;
			cond.maxY = -10.5;
			challenge.winConditions.push(cond);
			cond = new WinCondition("Cond", 2, 4);
			cond.minX = 45;
			cond.maxX = 45;
			challenge.winConditions.push(cond);
			challenge.cannonsAllowed = false;
			challenge.thrustersAllowed = false;
			challenge.mouseDragAllowed = false;
			challenge.winConditionsAnded = true;
			var buildArea:b2AABB = new b2AABB();
			buildArea.lowerBound.Set(1, 1);
			buildArea.upperBound.Set(15, 11.1);
			challenge.buildAreas.push(buildArea);
			BuildBuildArea();
			
			draw.m_drawXOff = 0;
			draw.m_drawYOff = -150;
			
			var p:ShapePart;
			p = new Rectangle(1, 11, 49.4, 1, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			removeChild(sGround);
			sGround = new Sprite();
			
			// bg layer 3
			// outlines
			sGround.graphics.beginFill(0x007360);
			sGround.graphics.drawCircle(266, 1640, 195);
			sGround.graphics.drawCircle(932, 1881, 195);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x007360);
			sGround.graphics.drawCircle(608, 1811, 258);
			sGround.graphics.endFill();
			
			// body
			sGround.graphics.beginFill(0x34A97F);
			sGround.graphics.drawCircle(266, 1640, 189);
			sGround.graphics.drawCircle(932, 1881, 189);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x34A97F);
			sGround.graphics.drawCircle(608, 1811, 252);
			sGround.graphics.endFill();
			
			// bg layer 2
			// outlines
			sGround.graphics.beginFill(0x007A47);
			sGround.graphics.drawCircle(1166, 1853, 129);
			sGround.graphics.drawCircle(1979, 1721, 258);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x007A47);
			sGround.graphics.drawCircle(1435, 1871, 195);
			sGround.graphics.endFill();
			
			// body
			sGround.graphics.beginFill(0x36AE66);
			sGround.graphics.drawCircle(1166, 1853, 123);
			sGround.graphics.drawCircle(1979, 1721, 252);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x36AE66);
			sGround.graphics.drawCircle(1435, 1871, 189);
			sGround.graphics.endFill();
			
			// bg layer 1
			// outlines
			sGround.graphics.beginFill(0x00862C);
			sGround.graphics.drawCircle(750, 1756, 195);
			sGround.graphics.drawCircle(1745, 1871, 195);
			sGround.graphics.drawCircle(2210, 1676, 195);
			sGround.graphics.drawCircle(2432, 1267, 195);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x00862C);
			sGround.graphics.drawCircle(1431, 1615, 337);
			sGround.graphics.endFill();
			
			// body
			sGround.graphics.beginFill(0x3EBA50);
			sGround.graphics.drawCircle(750, 1756, 189);
			sGround.graphics.drawCircle(1745, 1871, 189);
			sGround.graphics.drawCircle(2210, 1676, 189);
			sGround.graphics.drawCircle(2432, 1267, 189);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x3EBA50);
			sGround.graphics.drawCircle(1431, 1615, 331);
			sGround.graphics.endFill();
			
			// main ground and stairs
			// outlines
			sGround.graphics.beginFill(0x2DA12E);
			for (var i:int = 0; i < 29; i++) {
				sGround.graphics.drawRect(1989 - i * 47.45, 301 + i * 35.6, 378 + i * 47.45, 35.6);
			}
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawRect(-6, 1333.4, 2405, 238.6);
			sGround.graphics.endFill();
			
			// circle ground
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawCircle(237, 1560, 86);
			sGround.graphics.drawCircle(2430, 801, 195);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawCircle(415, 1600, 129);
			sGround.graphics.drawCircle(2548, 1005, 195);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawCircle(1557, 1599, 144);
			sGround.graphics.drawCircle(0, 1527, 195);
			sGround.graphics.drawCircle(2330, 1531, 195);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawCircle(630, 1647, 195);
			sGround.graphics.drawCircle(1292, 1587, 195);
			sGround.graphics.drawCircle(2336, 493, 195);
			sGround.graphics.drawCircle(2356, 1217, 195);
			sGround.graphics.endFill();
			sGround.graphics.beginFill(0x2DA12E);
			sGround.graphics.drawCircle(947, 1683, 258);
			sGround.graphics.drawCircle(1927, 1560, 337);
			sGround.graphics.endFill();
			
			// body
			var m:Matrix = new Matrix();
			m.createGradientBox(2393, 1593, Math.PI / 2, 0, 307);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, [0x6BD354, 0x54BA3D], [1, 1], [0, 255], m);
			for (i = 0; i < 29; i++) {
				p = new Rectangle(15 + (28 - i), ((i + 1) * 0.75) - 11.5, i + 7.1, 0.75, false);
				p.isStatic = true;
				p.isEditable = false;
				p.drawAnyway = false;
				allParts.push(p);
				sGround.graphics.drawRect(1995 - i * 47.45, 307 + i * 35.6, 378 + i * 47.45, 35.6);
			}
			sGround.graphics.drawRect(0, 1339.4, 2393, 226.6);
			sGround.graphics.endFill();
			
			p = new Circle(1, 15.02, 4.02, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			p = new Circle(50.3, -6.8, 4, false);
			p.isStatic = true;
			p.isEditable = false;
			p.drawAnyway = false;
			allParts.push(p);
			
			// circle ground
			DrawGroundCircle(237, 1560, 80);
			DrawGroundCircle(2430, 801, 189);
			DrawGroundCircle(415, 1600, 123);
			DrawGroundCircle(2548, 1005, 189);
			DrawGroundCircle(1557, 1599, 138);
			DrawGroundCircle(0, 1527, 189);
			DrawGroundCircle(2330, 1531, 189);
			DrawGroundCircle(630, 1647, 189);
			DrawGroundCircle(1292, 1587, 189);
			DrawGroundCircle(2336, 493, 189);
			DrawGroundCircle(2356, 1217, 189);
			DrawGroundCircle(947, 1683, 252);
			DrawGroundCircle(1927, 1560, 331);
			
			// rocks
			DrawRock(0, 166, 1420, 52);
			DrawRock(1, 485, 1482, 52);
			DrawRock(2, 748, 1624, 35);
			DrawRock(1, 890, 1392, 86);
			DrawRock(1, 1157, 1489, 52);
			DrawRock(2, 1195, 1287, 35);
			DrawRock(1, 1407, 1031, 35);
			DrawRock(1, 1470, 1302, 86);
			DrawRock(1, 1601, 1017, 52);
			DrawRock(1, 1785, 1457, 52);
			DrawRock(2, 1855, 1231, 35);
			DrawRock(0, 1822, 898, 86);
			DrawRock(1, 1985, 705, 52);
			DrawRock(1, 2029, 1069, 52);
			DrawRock(1, 2152, 1604, 52);
			DrawRock(2, 2244, 426, 35);
			DrawRock(1, 2265, 669, 52);
			DrawRock(0, 2288, 1034, 137.5);
			DrawRock(1, 2389, 526, 43.5);
			DrawRock(2, 2480, 681, 86);
			DrawRock(0, 2638, 401, 35);
			
			// start and end platforms
			sGround.graphics.lineStyle(6, 0x9D8941);
			sGround.graphics.beginFill(0xCEB456);
			sGround.graphics.drawRect(25, 1336, 445, 56);
			sGround.graphics.drawRect(1992, 303, 309, 56);
			sGround.graphics.endFill();
			
			sGround.cacheAsBitmap = true;
			addChild(sGround);
		}
		
		public override function Init(e:Event):void {
			super.Init(e);
			if (!viewingUnsavedReplay) ShowTutorialDialog(107, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 107) {
				ShowTutorialDialog(66);
			} else {
				super.CloseTutorialDialog(num);
			}
		}
		
		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, 276, 130, moreButton);
		}
		
		public function DrawGroundCircle(xPos:Number, yPos:Number, radius:Number):void {
			var m:Matrix = new Matrix();
			m.createGradientBox(2393, 1593, Math.PI / 2, 0, 307);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, [0x6BD354, 0x54BA3D], [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos, yPos, radius);
			sGround.graphics.endFill();
		}
		
		public function DrawRock(type:int, xPos:Number, yPos:Number, radius:Number):void {
			sGround.graphics.lineStyle(6, 0x6BB05A);
			var m:Matrix = new Matrix();
			m.createGradientBox(radius * 2, radius * 2, Math.PI / 2, xPos, yPos);
			sGround.graphics.beginGradientFill(GradientType.LINEAR, (type == 0 ? [0x8EDB82, 0x7FBF72] : (type == 1 ? [0x80D970, 0x6DBE5D] : [0x70C160, 0x63AB52])), [1, 1], [0, 255], m);
			sGround.graphics.drawCircle(xPos - 270 + radius, yPos + radius, radius);
			sGround.graphics.endFill();
		}
		
		public override function GetMinX():Number {
			return -9;
		}
		
		public override function GetMaxX():Number {
			return 62;
		}
		
		public override function GetMinY():Number {
			return -22;
		}
		
		public override function GetMaxY():Number {
			return 28;
		}
		
		public override function Update():void {
			super.Update();
			if (hasZoomed) {
				sGround.width = World2ScreenX(61.9) - World2ScreenX(0);
				sGround.scaleY = sGround.scaleX;
			}
			if (hasPanned || hasZoomed) {
				sGround.x = World2ScreenX(1.02);
				sGround.y = World2ScreenY(-17.15);
			}
			hasPanned = false;
			hasZoomed = false;
		}
		
		public override function saveButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function saveReplayButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}

		public override function submitButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}
		
		public override function commentButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function linkButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function embedButton(e:MouseEvent, robotID:String = "", robotPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function commentReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function linkReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
		
		public override function embedReplayButton(e:MouseEvent, replayID:String = "", replayPublic:Boolean = false):void {
			ShowDisabledDialog();
		}
	}
}