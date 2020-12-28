package Gui
{
	import Game.Graphics.Resource;
	
	import flash.display.Sprite;
	import flash.geom.Matrix;
	
	public class GuiWindow extends Sprite
	{
		public var fader:Sprite;
		
		public function GuiWindow(xPos:int, yPos:int, width:int, height:int, addLine:Boolean = true)
		{
			x = xPos;
			y = yPos;
			
			var m:Matrix;
			graphics.lineStyle(0, 0, 0);
			if (width == 800) {
				graphics.beginBitmapFill(new Resource.cGuiWindowMid800().bitmapData);
				graphics.drawRect(17, 0, width - 34, height);
				graphics.endFill();
				graphics.beginBitmapFill(new Resource.cGuiWindowRight800().bitmapData);
				graphics.drawRect(width - 17, 0, 17, height);
				graphics.endFill();
				m = new Matrix();
				m.translate(-1, 0);
				graphics.beginBitmapFill(new Resource.cGuiWindowLeft800().bitmapData, m);
				graphics.drawRect(-1, 0, 18, height);
				graphics.endFill();
			} else if (width == 720) {
				graphics.beginBitmapFill(new Resource.cGuiWindowMid700().bitmapData);
				graphics.drawRect(24, 0, width - 48, height);
				graphics.endFill();
				graphics.beginBitmapFill(new Resource.cGuiWindowRight700().bitmapData);
				graphics.drawRect(width - 24, 0, 24, height);
				graphics.endFill();
				graphics.beginBitmapFill(new Resource.cGuiWindowLeft700().bitmapData);
				graphics.drawRect(0, 0, 24, height);
				graphics.endFill();
				m = new Matrix();
				m.translate(12, 287);
				graphics.beginBitmapFill(new Resource.cGuiWindowLine().bitmapData, m);
				graphics.drawRect(12, 287, 684, 6);
				graphics.endFill();
				m = new Matrix();
				m.translate(53, 20);
				graphics.beginBitmapFill(new Resource.cGuiWindowLinebox().bitmapData, m);
				graphics.drawRect(53, 20, 602, 80);
				graphics.endFill();
				m = new Matrix();
				m.translate(53, 315);
				graphics.beginBitmapFill(new Resource.cGuiWindowLinebox().bitmapData, m);
				graphics.drawRect(53, 313, 602, 80);
				graphics.endFill();
			} else if (width == 600 || width == 312) {
				graphics.beginBitmapFill(new Resource.cGuiWindowMid600().bitmapData);
				graphics.drawRect(24, 0, width - 48, height);
				graphics.endFill();
				graphics.beginBitmapFill(new Resource.cGuiWindowRight600().bitmapData);
				graphics.drawRect(width - 24, 0, 24, height);
				graphics.endFill();
				graphics.beginBitmapFill(new Resource.cGuiWindowLeft600().bitmapData);
				graphics.drawRect(0, 0, 24, height);
				graphics.endFill();
				if (addLine && width == 312) {
					m = new Matrix();
					m.translate(12, 287);
					graphics.beginBitmapFill(new Resource.cGuiWindowLine().bitmapData, m);
					graphics.drawRect(12, 275, 274, 6);
					graphics.endFill();
				}
			} else {
				var topClass:Class, midClass:Class, bottomClass:Class;
				if (width == 120) {
					topClass = Resource.cGuiWindowTop120;
					midClass = Resource.cGuiWindowMid120;
					bottomClass = Resource.cGuiWindowBottom120;
				} else if (width == 154) {
					topClass = Resource.cGuiWindowTop154;
					midClass = Resource.cGuiWindowMid154;
					bottomClass = Resource.cGuiWindowBottom154;
				} else if (width == 200) {
					topClass = Resource.cGuiWindowTop200;
					midClass = Resource.cGuiWindowMid200;
					bottomClass = Resource.cGuiWindowBottom200;
				} else if (width == 248) {
					topClass = Resource.cGuiWindowTop248;
					midClass = Resource.cGuiWindowMid248;
					bottomClass = Resource.cGuiWindowBottom248;
				} else {
					topClass = Resource.cGuiWindowTop547;
					midClass = Resource.cGuiWindowMid547;
					bottomClass = Resource.cGuiWindowBottom547;
				}
				graphics.beginBitmapFill(new midClass().bitmapData);
				graphics.drawRect(-1, 15, width + 10, height - 30);
				graphics.endFill();
				graphics.beginBitmapFill(new topClass().bitmapData);
				graphics.drawRect(-1, 0, width + 10, 15);
				graphics.endFill();
				m = new Matrix();
				m.translate(0, height - 15);
				graphics.beginBitmapFill(new bottomClass().bitmapData, m);
				graphics.drawRect(-1, height - 15, width + 10, 24);
				graphics.endFill();
			}

			fader = new Sprite();
			fader.graphics.beginFill(0, 0.2);
			fader.graphics.lineStyle(0, 0, 0.2);
			fader.graphics.moveTo(0, 0);
			fader.graphics.lineTo(width - 1, 0);
			fader.graphics.lineTo(width - 1, height - 1);
			fader.graphics.lineTo(0, height - 1);
			fader.graphics.lineTo(0, 0);
			fader.graphics.endFill();
			fader.visible = false;
			addChild(fader);
		}
		
		public function MouseOver(mouseX:int, mouseY:int):Boolean {
			return (visible && mouseX >= x && mouseX < x + width && mouseY >= y && mouseY < y + height);
		}
		
		public function ShowFader():void {
			fader.visible = true;
		}
		
		public function HideFader():void {
			fader.visible = false;
		}
	}
}