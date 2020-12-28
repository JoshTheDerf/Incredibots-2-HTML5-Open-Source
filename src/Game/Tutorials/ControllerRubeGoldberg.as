package Game.Tutorials
{
	import Game.ControllerSandbox;
	import Game.Graphics.*;
	
	import General.*;
	import Gui.ScoreWindow;
	
	import Parts.*;
	
	import flash.display.*;
	import flash.events.*;

	public class ControllerRubeGoldberg extends ControllerSandbox
	{
		private var ball:ShapePart;
		private var straightRect:ShapePart;
		private var angledRect:ShapePart;
		private var wheelMotor:RevoluteJoint;
		private var endChunk:ShapePart;
		
		private var wasRotating:Boolean;
		private var wasDragging:Boolean;
		private var wasDragging2:Boolean;
		
		private var rectSelected:Boolean = false;
		private var rotatedRect:Boolean = false;
		private var draggedRect:Boolean = false;
		private var selectedRects:Boolean = false;
		private var draggedRects:Boolean = false;
		private var fixatedRects:Boolean = false;
		private var autoWheel:Boolean = false;
		private var endUncollided:Boolean = false;
		private var shownEnd:Boolean = false;
		
		public function ControllerRubeGoldberg()
		{
			draw.m_drawXOff = -100;
			draw.m_drawYOff = -290;
			m_physScale = 22.5;
			
			if (!playingReplay) LoadParts();
		}

		private function LoadParts():void {
			var p:Part = new Rectangle(17, -3, 8, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(17, -4, 0.3, 1);
			p.isStatic = true;
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(16.8, -4.3, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(10, -3.1, 1, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.35, -4.26, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			(p as ShapePart).angle = -0.15;
			allParts.push(p);
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			p = new Rectangle(10.95, -3.15, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			(p as ShapePart).angle = -0.15;
			allParts.push(p);
			straightRect = new Rectangle(16, -7.5, 0.3, 2.5);
			straightRect.isStatic = true;
			straightRect.red = 120;
			straightRect.green = 255;
			straightRect.blue = 112;
			allParts.push(straightRect);
			angledRect = new Rectangle(12, -6.5, 2.5, 0.3);
			angledRect.isStatic = true;
			angledRect.red = 120;
			angledRect.green = 255;
			angledRect.blue = 112;
			angledRect.angle = -0.2;
			allParts.push(angledRect);
			
			p = new Rectangle(23, -3.8, 1.5, 0.5);
			allParts.push(p);
			p = new Rectangle(22.5, -4.3, 2.5, 0.7);
			allParts.push(p);
			p = new Rectangle(24.7, -5.1, 0.3, 0.8);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 3], allParts[allParts.length - 2], 23.75, -3.75);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 3], allParts[allParts.length - 2], 24.85, -4.35);
			allParts.push(p);
			p = new Circle(23.1, -3.5, 0.5);
			(p as ShapePart).red = 200;
			(p as ShapePart).green = 70;
			(p as ShapePart).blue = 50;
			allParts.push(p);
			p = new Circle(24.4, -3.5, 0.5);
			(p as ShapePart).red = 200;
			(p as ShapePart).green = 70;
			(p as ShapePart).blue = 50;
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 2], allParts[allParts.length - 7], 23.1, -3.5);
			allParts.push(p);
			wheelMotor = new RevoluteJoint(allParts[allParts.length - 2], allParts[allParts.length - 8], 24.4, -3.5);
			wheelMotor.enableMotor = true;
			allParts.push(wheelMotor);
			
			p = new Rectangle(2.8, -1.7, 6, 0.2);
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(8.6, -2.7, 0.2, 1.5);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Rectangle(8.6, -1.4, 1.6, 0.2);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Circle(3.0, -1.6, 0.86);
			(p as ShapePart).red = 70;
			(p as ShapePart).green = 70;
			(p as ShapePart).blue = 70;
			allParts.push(p);
			p = new Circle(4.8, -1.6, 0.5);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			p.isStatic = true;
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 5], allParts[allParts.length - 4], 8.7, -1.6);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 5], allParts[allParts.length - 4], 8.7, -1.3);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 7], allParts[allParts.length - 4], 3.0, -1.6);
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 8], allParts[allParts.length - 4], 4.8, -1.6);
			allParts.push(p);
			
			p = new Rectangle(7.5, -1, 0.3, 1);
			p.isStatic = true;
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(7.5, 0, 2.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(9.7, -0.5, 0.3, 0.5);
			p.isStatic = true;
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(10, -0.5, 1, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(11, -0.45, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.15;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(11.7, -0.28, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.3;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(12.4, 0, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.45;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(13, 0.36, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.6;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(13.6, 0.83, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.75;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(14.15, 1.35, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.75;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(14.63, 1.75, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.6;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(15.05, 2, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.45;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(15.45, 2.2, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.3;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(15.8, 2.3, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.15;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.1, 2.35, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.4, 2.3, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.15;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.7, 2.2, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.3;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(17, 2.05, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.45;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(17.3, 1.85, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.6;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(17.6, 1.6, 0.8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.75;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			
			p = new Rectangle(20.6, 2.6, 1.2, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -Math.PI / 2;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(20.85, 3.5, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -1.36;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(20.75, 3.75, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -1.15;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(20.6, 3.95, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.94;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(20.4, 4.1, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.73;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(20.15, 4.2, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.52;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(19.85, 4.25, 0.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.31;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(12, 4.65, 8, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.08;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			
			p = new Rectangle(9, 5.98, 2.1, 0.5);
			p.isStatic = true;
			(p as ShapePart).angle = -0.1;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(5.5, 6.6, 1.6, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(0.2, 7.2, 8, 0.2);
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(8.0, 6.6, 0.2, 0.8);
			(p as ShapePart).red = 199;
			(p as ShapePart).green = 199;
			(p as ShapePart).blue = 199;
			allParts.push(p);
			p = new Rectangle(7.2, 6.6, 2, 0.2);
			(p as ShapePart).density = 10;
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Circle(0.2, 7.3, 1.0);
			(p as ShapePart).red = 70;
			(p as ShapePart).green = 70;
			(p as ShapePart).blue = 70;
			allParts.push(p);
			p = new Circle(2.9, 7.3, 0.5);
			p.isStatic = true;
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Circle(8.1, 7.3, 0.2);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 6], allParts[allParts.length - 3], 0.2, 7.3);
			allParts.push(p);
			p = new RevoluteJoint(allParts[allParts.length - 7], allParts[allParts.length - 3], 2.9, 7.3);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 8], allParts[allParts.length - 3], 8.1, 7.3);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 8], allParts[allParts.length - 4], 8.1, 7.3);
			allParts.push(p);
			p = new FixedJoint(allParts[allParts.length - 9], allParts[allParts.length - 8], 8.1, 6.7);
			allParts.push(p);
			p = new Rectangle(8.2, 5.8, 0.2, 0.8);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Rectangle(7.7, 5.8, 0.2, 0.8);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Rectangle(7.2, 5.8, 0.2, 0.8);
			(p as ShapePart).density = 20;
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Rectangle(6.7, 5.8, 0.2, 0.8);
			(p as ShapePart).density = 20;
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Rectangle(6.1, 5.6, 0.3, 1);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			p = new Rectangle(5.5, 5.6, 0.3, 1);
			(p as ShapePart).red = 150;
			(p as ShapePart).green = 150;
			(p as ShapePart).blue = 150;
			allParts.push(p);
			
			p = new Rectangle(8.85, 8.72, 0.7, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.6;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(9.25, 9.0, 0.7, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.5;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(9.7, 9.25, 0.7, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.4;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(10.2, 9.45, 0.7, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.3;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(10.75, 9.6, 0.7, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.2;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(11.35, 9.7, 0.7, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = 0.1;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(12, 9.73, 3, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(14.95, 9.7, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.1;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(15.25, 9.65, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.2;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(15.55, 9.57, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.3;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(15.85, 9.46, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.3;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.15, 9.38, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.2;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.45, 9.34, 0.5, 0.3);
			p.isStatic = true;
			(p as ShapePart).angle = -0.1;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(16.8, 9.33, 8, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			p = new Rectangle(25.35, 9.21, 1, 0.3);
			p.isStatic = true;
			(p as ShapePart).red = 120;
			(p as ShapePart).green = 255;
			(p as ShapePart).blue = 112;
			allParts.push(p);
			
			// E
			p = new Rectangle(17.9, 6, 0.6, 2.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(18.5, 6, 1.5, 0.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(18.5, 7.05, 1.2, 0.4);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(18.5, 8, 1.5, 0.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			
			// N
			p = new Rectangle(20.1, 7.3, 2.4, 0.6);
			p.isStatic = true;
			(p as ShapePart).angle = 0.9;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			endChunk = new Rectangle(20.2, 6.5, 0.6, 2.5);
			endChunk.isStatic = true;
			(endChunk as ShapePart).red = 251;
			(endChunk as ShapePart).green = 241;
			(endChunk as ShapePart).blue = 116;
			allParts.push(endChunk);
			p = new Rectangle(21.8, 6.2, 0.6, 2.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			
			// D
			p = new Rectangle(23.4, 6.4, 1.2, 0.5);
			p.isStatic = true;
			(p as ShapePart).angle = 0.9;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(23.4, 7.6, 1.2, 0.5);
			p.isStatic = true;
			(p as ShapePart).angle = -0.9;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(22.7, 6, 0.5, 2.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(22.6, 6, 1.2, 0.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(22.6, 8, 1.2, 0.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			p = new Rectangle(23.95, 6.9, 0.6, 0.7);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			
			// !
			p = new Rectangle(24.75, 6, 0.6, 2.5);
			p.isStatic = true;
			(p as ShapePart).red = 251;
			(p as ShapePart).green = 241;
			(p as ShapePart).blue = 116;
			allParts.push(p);
			
			ball = new Circle(24.4, -4.6, 0.3);
			ball.red = 251;
			ball.green = 241;
			ball.blue = 116;
			ball.density = 30;
			ball.isCameraFocus = true;
			allParts.push(ball);	
		}

		public override function Init(e:Event):void {
			super.Init(e);
			if (!playingReplay) ShowTutorialDialog(70, true);
		}
		
		public override function CloseTutorialDialog(num:int):void {
			if (num == 70) {
				ShowTutorialDialog(71, true);
			} else if (num == 71) {
				ShowTutorialDialog(72);
			} else {
				if (num == 81) {
					LSOManager.SetLevelDone(7);
					if (m_scoreWindow) {
						try {
							removeChild(m_scoreWindow);
						} catch (type:Error) {
							
						}
					}
					m_scoreWindow = new ScoreWindow(this, GetScore());
					musicChannel = winSound.play();
					addChild(m_scoreWindow);
					m_fader.visible = true;
				}
				super.CloseTutorialDialog(num);
			}
		}
		
		public override function Update():void {
			super.Update();
			if (!playingReplay) {
				if (!rectSelected && selectedParts.length == 1 && selectedParts[0] == straightRect) {
					rectSelected = true;
					ShowTutorialWindow(73, World2ScreenX(2), World2ScreenY(-4));
				}
				if (rectSelected && !rotatedRect && wasRotating && curAction != ROTATE) {
					rotatedRect = true;
					ShowTutorialWindow(74, World2ScreenX(2), World2ScreenY(-4));
				}
				if (rotatedRect && !draggedRect && wasDragging && draggingPart != straightRect) {
					draggedRect = true;
					ShowTutorialDialog(75);
				}
				if (draggedRect && !selectedRects && selectedParts.length == 2 && Util.ObjectInArray(straightRect, selectedParts) && Util.ObjectInArray(angledRect, selectedParts)) {
					selectedRects = true;
					ShowTutorialDialog(76);
				}
				if (selectedRects && !draggedRects && wasDragging2 && !draggingPart && angledRect.centerY > -5) {
					draggedRects = true;
					ShowTutorialDialog(77);
				}
				if (draggedRects && !fixatedRects && straightRect.isStatic && angledRect.isStatic) {
					fixatedRects = true;
					ShowTutorialDialog(78);
				}
				if (fixatedRects && !autoWheel && wheelMotor.autoCCW) {
					autoWheel = true;
					ShowTutorialDialog(79);
				}
				if (autoWheel && !endUncollided && !endChunk.collide) {
					endUncollided = true;
					ShowTutorialDialog(80);
				}
				if (endUncollided && !shownEnd && !paused && ball.GetBody().GetWorldCenter().x > 25 && ball.GetBody().GetWorldCenter().y > 9) {
					shownEnd = true;
					ShowTutorialDialog(81);
				}
			}
			
			wasDragging = (draggingPart == straightRect);
			wasDragging2 = (Util.ObjectInArray(straightRect, draggingParts) && Util.ObjectInArray(angledRect, draggingParts));
			wasRotating = (curAction == ROTATE);
		}

		private function ShowTutorialDialog(num:int, moreButton:Boolean = false):void {
			ShowTutorialWindow(num, World2ScreenX(-10), World2ScreenY(-10), moreButton);
		}

		protected override function ChallengeOver():Boolean {
			return false;
		}
		
		public override function GetScore():int {
			return 1000;
		}
		
		public override function saveButton(e:MouseEvent):void {
			ShowDisabledDialog();
		}
		
		public override function loadButton(e:MouseEvent, makeThemRate:Boolean = true):void {
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

		public override function viewReplayButton(e:MouseEvent):void {
			ShowDisabledDialog();
			if (m_scoreWindow && m_scoreWindow.visible) m_scoreWindow.ShowFader();
		}

		public override function loadRobotButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
		}

		public override function loadReplayButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
		}

		public override function loadChallengeButton(e:MouseEvent, makeThemRate:Boolean = true):void {
			ShowDisabledDialog();
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