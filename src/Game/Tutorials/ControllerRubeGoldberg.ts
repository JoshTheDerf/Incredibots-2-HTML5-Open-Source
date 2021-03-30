import { Circle, ControllerGameGlobals, ControllerSandbox, FixedJoint, LSOManager, Part, Rectangle, RevoluteJoint, ScoreWindow, ShapePart, Util } from "../../imports";

export class ControllerRubeGoldberg extends ControllerSandbox
{
	private ball:ShapePart;
	private straightRect:ShapePart;
	private angledRect:ShapePart;
	private wheelMotor:RevoluteJoint;
	private endChunk:ShapePart;

	private wasRotating:boolean;
	private wasDragging:boolean;
	private wasDragging2:boolean;

	private rectSelected:boolean = false;
	private rotatedRect:boolean = false;
	private draggedRect:boolean = false;
	private selectedRects:boolean = false;
	private draggedRects:boolean = false;
	private fixatedRects:boolean = false;
	private autoWheel:boolean = false;
	private endUncollided:boolean = false;
	private shownEnd:boolean = false;

	constructor()
	{
		super()
		this.draw.m_drawXOff = -100;
		this.draw.m_drawYOff = -290;
		this.m_physScale = 22.5;

		if (!ControllerGameGlobals.playingReplay) this.LoadParts();
	}

	private LoadParts():void {
		var p:Part = new Rectangle(17, -3, 8, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(17, -4, 0.3, 1);
		p.isStatic = true;
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(16.8, -4.3, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(10, -3.1, 1, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.35, -4.26, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		(p as ShapePart).angle = -0.15;
		this.allParts.push(p);
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		p = new Rectangle(10.95, -3.15, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		(p as ShapePart).angle = -0.15;
		this.allParts.push(p);
		this.straightRect = new Rectangle(16, -7.5, 0.3, 2.5);
		this.straightRect.isStatic = true;
		this.straightRect.red = 120;
		this.straightRect.green = 255;
		this.straightRect.blue = 112;
		this.allParts.push(this.straightRect);
		this.angledRect = new Rectangle(12, -6.5, 2.5, 0.3);
		this.angledRect.isStatic = true;
		this.angledRect.red = 120;
		this.angledRect.green = 255;
		this.angledRect.blue = 112;
		this.angledRect.angle = -0.2;
		this.allParts.push(this.angledRect);

		p = new Rectangle(23, -3.8, 1.5, 0.5);
		this.allParts.push(p);
		p = new Rectangle(22.5, -4.3, 2.5, 0.7);
		this.allParts.push(p);
		p = new Rectangle(24.7, -5.1, 0.3, 0.8);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 3], this.allParts[this.allParts.length - 2], 23.75, -3.75);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 3], this.allParts[this.allParts.length - 2], 24.85, -4.35);
		this.allParts.push(p);
		p = new Circle(23.1, -3.5, 0.5);
		(p as ShapePart).red = 200;
		(p as ShapePart).green = 70;
		(p as ShapePart).blue = 50;
		this.allParts.push(p);
		p = new Circle(24.4, -3.5, 0.5);
		(p as ShapePart).red = 200;
		(p as ShapePart).green = 70;
		(p as ShapePart).blue = 50;
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 2], this.allParts[this.allParts.length - 7], 23.1, -3.5);
		this.allParts.push(p);
		this.wheelMotor = new RevoluteJoint(this.allParts[this.allParts.length - 2], this.allParts[this.allParts.length - 8], 24.4, -3.5);
		this.wheelMotor.enableMotor = true;
		this.allParts.push(this.wheelMotor);

		p = new Rectangle(2.8, -1.7, 6, 0.2);
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(8.6, -2.7, 0.2, 1.5);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Rectangle(8.6, -1.4, 1.6, 0.2);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Circle(3.0, -1.6, 0.86);
		(p as ShapePart).red = 70;
		(p as ShapePart).green = 70;
		(p as ShapePart).blue = 70;
		this.allParts.push(p);
		p = new Circle(4.8, -1.6, 0.5);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		p.isStatic = true;
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 5], this.allParts[this.allParts.length - 4], 8.7, -1.6);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 5], this.allParts[this.allParts.length - 4], 8.7, -1.3);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 7], this.allParts[this.allParts.length - 4], 3.0, -1.6);
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 8], this.allParts[this.allParts.length - 4], 4.8, -1.6);
		this.allParts.push(p);

		p = new Rectangle(7.5, -1, 0.3, 1);
		p.isStatic = true;
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(7.5, 0, 2.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(9.7, -0.5, 0.3, 0.5);
		p.isStatic = true;
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(10, -0.5, 1, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(11, -0.45, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.15;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(11.7, -0.28, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.3;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(12.4, 0, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.45;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(13, 0.36, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.6;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(13.6, 0.83, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.75;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(14.15, 1.35, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.75;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(14.63, 1.75, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.6;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(15.05, 2, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.45;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(15.45, 2.2, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.3;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(15.8, 2.3, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.15;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.1, 2.35, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.4, 2.3, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.15;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.7, 2.2, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.3;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(17, 2.05, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.45;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(17.3, 1.85, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.6;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(17.6, 1.6, 0.8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.75;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);

		p = new Rectangle(20.6, 2.6, 1.2, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -Math.PI / 2;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(20.85, 3.5, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -1.36;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(20.75, 3.75, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -1.15;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(20.6, 3.95, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.94;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(20.4, 4.1, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.73;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(20.15, 4.2, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.52;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(19.85, 4.25, 0.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.31;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(12, 4.65, 8, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.08;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);

		p = new Rectangle(9, 5.98, 2.1, 0.5);
		p.isStatic = true;
		(p as ShapePart).angle = -0.1;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(5.5, 6.6, 1.6, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(0.2, 7.2, 8, 0.2);
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(8.0, 6.6, 0.2, 0.8);
		(p as ShapePart).red = 199;
		(p as ShapePart).green = 199;
		(p as ShapePart).blue = 199;
		this.allParts.push(p);
		p = new Rectangle(7.2, 6.6, 2, 0.2);
		(p as ShapePart).density = 10;
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Circle(0.2, 7.3, 1.0);
		(p as ShapePart).red = 70;
		(p as ShapePart).green = 70;
		(p as ShapePart).blue = 70;
		this.allParts.push(p);
		p = new Circle(2.9, 7.3, 0.5);
		p.isStatic = true;
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Circle(8.1, 7.3, 0.2);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 6], this.allParts[this.allParts.length - 3], 0.2, 7.3);
		this.allParts.push(p);
		p = new RevoluteJoint(this.allParts[this.allParts.length - 7], this.allParts[this.allParts.length - 3], 2.9, 7.3);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 8], this.allParts[this.allParts.length - 3], 8.1, 7.3);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 8], this.allParts[this.allParts.length - 4], 8.1, 7.3);
		this.allParts.push(p);
		p = new FixedJoint(this.allParts[this.allParts.length - 9], this.allParts[this.allParts.length - 8], 8.1, 6.7);
		this.allParts.push(p);
		p = new Rectangle(8.2, 5.8, 0.2, 0.8);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Rectangle(7.7, 5.8, 0.2, 0.8);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Rectangle(7.2, 5.8, 0.2, 0.8);
		(p as ShapePart).density = 20;
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Rectangle(6.7, 5.8, 0.2, 0.8);
		(p as ShapePart).density = 20;
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Rectangle(6.1, 5.6, 0.3, 1);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);
		p = new Rectangle(5.5, 5.6, 0.3, 1);
		(p as ShapePart).red = 150;
		(p as ShapePart).green = 150;
		(p as ShapePart).blue = 150;
		this.allParts.push(p);

		p = new Rectangle(8.85, 8.72, 0.7, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.6;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(9.25, 9.0, 0.7, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.5;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(9.7, 9.25, 0.7, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.4;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(10.2, 9.45, 0.7, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.3;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(10.75, 9.6, 0.7, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.2;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(11.35, 9.7, 0.7, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = 0.1;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(12, 9.73, 3, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(14.95, 9.7, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.1;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(15.25, 9.65, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.2;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(15.55, 9.57, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.3;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(15.85, 9.46, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.3;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.15, 9.38, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.2;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.45, 9.34, 0.5, 0.3);
		p.isStatic = true;
		(p as ShapePart).angle = -0.1;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(16.8, 9.33, 8, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);
		p = new Rectangle(25.35, 9.21, 1, 0.3);
		p.isStatic = true;
		(p as ShapePart).red = 120;
		(p as ShapePart).green = 255;
		(p as ShapePart).blue = 112;
		this.allParts.push(p);

		// E
		p = new Rectangle(17.9, 6, 0.6, 2.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(18.5, 6, 1.5, 0.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(18.5, 7.05, 1.2, 0.4);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(18.5, 8, 1.5, 0.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);

		// N
		p = new Rectangle(20.1, 7.3, 2.4, 0.6);
		p.isStatic = true;
		(p as ShapePart).angle = 0.9;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		this.endChunk = new Rectangle(20.2, 6.5, 0.6, 2.5);
		this.endChunk.isStatic = true;
		(this.endChunk as ShapePart).red = 251;
		(this.endChunk as ShapePart).green = 241;
		(this.endChunk as ShapePart).blue = 116;
		this.allParts.push(this.endChunk);
		p = new Rectangle(21.8, 6.2, 0.6, 2.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);

		// D
		p = new Rectangle(23.4, 6.4, 1.2, 0.5);
		p.isStatic = true;
		(p as ShapePart).angle = 0.9;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(23.4, 7.6, 1.2, 0.5);
		p.isStatic = true;
		(p as ShapePart).angle = -0.9;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(22.7, 6, 0.5, 2.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(22.6, 6, 1.2, 0.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(22.6, 8, 1.2, 0.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);
		p = new Rectangle(23.95, 6.9, 0.6, 0.7);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);

		// !
		p = new Rectangle(24.75, 6, 0.6, 2.5);
		p.isStatic = true;
		(p as ShapePart).red = 251;
		(p as ShapePart).green = 241;
		(p as ShapePart).blue = 116;
		this.allParts.push(p);

		this.ball = new Circle(24.4, -4.6, 0.3);
		this.ball.red = 251;
		this.ball.green = 241;
		this.ball.blue = 116;
		this.ball.density = 30;
		this.ball.isCameraFocus = true;
		this.allParts.push(this.ball);
	}

	public Init(e:Event):void {
		super.Init(e);
		if (!ControllerGameGlobals.playingReplay) this.ShowTutorialDialog(70, true);
	}

	public CloseTutorialDialog(num:number):void {
		if (num == 70) {
			this.ShowTutorialDialog(71, true);
		} else if (num == 71) {
			this.ShowTutorialDialog(72);
		} else {
			if (num == 81) {
				LSOManager.SetLevelDone(7);
				if (this.m_scoreWindow) {
					try {
						this.removeChild(this.m_scoreWindow);
					} catch (type:any) {
					}
				}
				this.m_scoreWindow = new ScoreWindow(this, this.GetScore());
				ControllerGameGlobals.winSound.play();
				this.addChild(this.m_scoreWindow);
				this.m_fader.visible = true;
			}
			super.CloseTutorialDialog(num);
		}
	}

	public Update():void {
		super.Update();
		if (!ControllerGameGlobals.playingReplay) {
			if (!this.rectSelected && this.selectedParts.length == 1 && this.selectedParts[0] == this.straightRect) {
				this.rectSelected = true;
				this.ShowTutorialWindow(73, this.World2ScreenX(2), this.World2ScreenY(-4));
			}
			if (this.rectSelected && !this.rotatedRect && this.wasRotating && this.curAction != ControllerGameGlobals.ROTATE) {
				this.rotatedRect = true;
				this.ShowTutorialWindow(74, this.World2ScreenX(2), this.World2ScreenY(-4));
			}
			if (this.rotatedRect && !this.draggedRect && this.wasDragging && this.draggingPart != this.straightRect) {
				this.draggedRect = true;
				this.ShowTutorialDialog(75);
			}
			if (this.draggedRect && !this.selectedRects && this.selectedParts.length == 2 && Util.ObjectInArray(this.straightRect, this.selectedParts) && Util.ObjectInArray(this.angledRect, this.selectedParts)) {
				this.selectedRects = true;
				this.ShowTutorialDialog(76);
			}
			if (this.selectedRects && !this.draggedRects && this.wasDragging2 && !this.draggingPart && this.angledRect.centerY > -5) {
				this.draggedRects = true;
				this.ShowTutorialDialog(77);
			}
			if (this.draggedRects && !this.fixatedRects && this.straightRect.isStatic && this.angledRect.isStatic) {
				this.fixatedRects = true;
				this.ShowTutorialDialog(78);
			}
			if (this.fixatedRects && !this.autoWheel && this.wheelMotor.autoCCW) {
				this.autoWheel = true;
				this.ShowTutorialDialog(79);
			}
			if (this.autoWheel && !this.endUncollided && !this.endChunk.collide) {
				this.endUncollided = true;
				this.ShowTutorialDialog(80);
			}
			if (this.endUncollided && !this.shownEnd && !this.paused && this.ball.GetBody().GetWorldCenter().x > 25 && this.ball.GetBody().GetWorldCenter().y > 9) {
				this.shownEnd = true;
				this.ShowTutorialDialog(81);
			}
		}

		this.wasDragging = (this.draggingPart == this.straightRect);
		this.wasDragging2 = (Util.ObjectInArray(this.straightRect, this.draggingParts) && Util.ObjectInArray(this.angledRect, this.draggingParts));
		this.wasRotating = (this.curAction == ControllerGameGlobals.ROTATE);
	}

	private ShowTutorialDialog(num:number, moreButton:boolean = false):void {
		this.ShowTutorialWindow(num, this.World2ScreenX(-10), this.World2ScreenY(-10), moreButton);
	}

	protected ChallengeOver():boolean {
		return false;
	}

	public GetScore():number {
		return 1000;
	}

	public saveButton():void {
		this.ShowDisabledDialog();
	}

	public loadButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public saveReplayButton():void {
		this.ShowDisabledDialog();
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
	}

	public submitButton():void {
		this.ShowDisabledDialog();
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
	}

	public viewReplayButton():void {
		this.ShowDisabledDialog();
		if (this.m_scoreWindow && this.m_scoreWindow.visible) this.m_scoreWindow.ShowFader();
	}

	public loadRobotButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public loadReplayButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public loadChallengeButton(makeThemRate:boolean = true):void {
		this.ShowDisabledDialog();
	}

	public commentButton(robotID:String = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkButton(robotID:String = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedButton(robotID:String = "", robotPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public commentReplayButton(replayID:String = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public linkReplayButton(replayID:String = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}

	public embedReplayButton(replayID:String = "", replayPublic:boolean = false):void {
		this.ShowDisabledDialog();
	}
}
