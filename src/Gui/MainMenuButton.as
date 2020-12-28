package Gui
{
	import Game.Controller;
	import General.Input;
	
	import mx.core.BitmapAsset;

	public class MainMenuButton
	{
		private var baseImg:BitmapAsset;
		private var rollImg:BitmapAsset;
		private var textBaseImg:BitmapAsset = null;
		private var textRollImg:BitmapAsset = null;
		private var x:int;
		private var y:int;
		private var textX:int;
		private var textY:int;
		private var cont:Controller;
		
		public var visible:Boolean = true;
		public var index:int;
		
		private var wasMouseDown:Boolean = false;
		
		public function MainMenuButton(parentCont:Controller, theIndex:int, xPos:int, yPos:int, baseClass:Class, rollClass:Class, textXPos:int = 0, textYPos:int = 0, textBaseClass:Class = null, textRollClass:Class = null)
		{
			cont = parentCont;
			index = theIndex;
			x = xPos;
			y = yPos;
			textX = textXPos;
			textY = textYPos;
			
			baseImg = new baseClass();
			baseImg.x = x;
			baseImg.y = y;
			cont.addChild(baseImg);
			rollImg = new rollClass();
			rollImg.x = x;
			rollImg.y = y;
			rollImg.visible = false;
			cont.addChild(rollImg);
			if (textBaseClass) {
				textBaseImg = new textBaseClass();
				textBaseImg.x = textX;
				textBaseImg.y = textY;
				cont.addChild(textBaseImg);
			}
			if (textRollClass) {
				textRollImg = new textRollClass();
				textRollImg.x = textX;
				textRollImg.y = textY;
				textRollImg.visible = false;
				cont.addChild(textRollImg);
			}
		}
		
		public function Update():void {
			if (visible) {
				var mouseOver:Boolean = IsMouseOver(10, 8);
				if (mouseOver) {
					rollImg.visible = true;
					baseImg.visible = false;
					if (textRollImg) {
						textRollImg.visible = true;
						textBaseImg.visible = false;
					}
					if (Input.mouseDown) {
						rollImg.x = x + 2;
						rollImg.y = y + 2;
						if (textRollImg) {
							textRollImg.x = textX + 2;
							textRollImg.y = textY + 2;
						}
					} else {
						rollImg.x = x;
						rollImg.y = y;
						if (textRollImg) {
							textRollImg.x = textX;
							textRollImg.y = textY;
						}
					}
				} else {
					baseImg.visible = true;
					rollImg.visible = false;
					rollImg.x = x;
					rollImg.y = y;
					if (textRollImg) {
						textBaseImg.visible = true;
						textRollImg.visible = false;
					}
				}
				
				if (mouseOver && wasMouseDown && !Input.mouseDown) cont.GuiCallback(index);
				wasMouseDown = Input.mouseDown;
			}
		}
		
		public function IsMouseOver(paddingX:int = 0, paddingY:int = 0):Boolean {
			if (Input.mouseX >= baseImg.x - paddingX && Input.mouseX < baseImg.x + baseImg.width + paddingX &&
			    Input.mouseY >= baseImg.y - paddingY && Input.mouseY < baseImg.y + baseImg.height + paddingY) {
			    return true;
			}
			if (textBaseImg && Input.mouseX >= textBaseImg.x - paddingX && Input.mouseX < textBaseImg.x + textBaseImg.width + paddingX &&
			    Input.mouseY >= textBaseImg.y - paddingY && Input.mouseY < textBaseImg.y + textBaseImg.height + paddingY) {
				return true;
			}
			return false;
		}
	}
}