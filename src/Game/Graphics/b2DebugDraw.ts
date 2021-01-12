/*
* Copyright (c) 2006-2007 Erin Catto http://www.gphysics.com
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

import { Graphics } from "pixi.js";
import { b2Color, b2Vec2, b2Rot } from "@box2d/core";
import { Util } from "../../General/Util";

/// Implement and register this class with a b2World to provide debug drawing of physics
/// entities in your game.
export class b2DebugDraw
{

	constructor() {
		this.m_drawFlags = 0;
	}

	//~b2DebugDraw() {}

	//enum
	//{
		public static  e_shapeBit:number 			= 0x0001; ///< draw shapes
		public static  e_jointBit:number			= 0x0002; ///< draw joint connections
		public static  e_coreShapeBit:number		= 0x0004; ///< draw core (TOI) shapes
		public static  e_aabbBit:number			= 0x0008; ///< draw axis aligned bounding boxes
		public static  e_obbBit:number				= 0x0010; ///< draw oriented bounding boxes
		public static  e_pairBit:number			= 0x0020; ///< draw broad-phase pairs
		public static  e_centerOfMassBit:number	= 0x0040; ///< draw center of mass frame
	//};

	/// Set the drawing flags.
	public SetFlags(flags:number) : void{
		this.m_drawFlags = flags;
	}

	/// Get the drawing flags.
	public GetFlags() :number{
		return this.m_drawFlags;
	}

	/// Append flags to the current flags.
	public AppendFlags(flags:number) : void{
		this.m_drawFlags |= flags;
	}

	/// Clear flags from the current flags.
	public ClearFlags(flags:number) : void{
		this.m_drawFlags &= ~flags;
	}

	/// Draw a closed polygon provided in CCW order.
	public DrawPolygon(vertices:Array<any>, vertexCount:number, color:b2Color) : void{
		if (this.IsPolygonOnScreen(vertices, vertexCount)) {
			this.m_sprite.lineStyle(1, Util.b2ColorToHex(color), this.m_alpha);
			this.m_sprite.moveTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
			for (var i:number = 1; i < vertexCount; i++){
				this.m_sprite.lineTo(vertices[i].x * this.m_drawScale - this.m_drawXOff, vertices[i].y * this.m_drawScale - this.m_drawYOff);
			}
			this.m_sprite.lineTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
		}
	}

	/// Draw a solid closed polygon provided in CCW order.
	public DrawSolidPolygon(vertices:Array<any>, vertexCount:number, color:b2Color, isHighlighted:boolean = false, drawOutlines:boolean = true) : void{
		if (this.IsPolygonOnScreen(vertices, vertexCount)) {
			var outlineColour:b2Color = b2DebugDraw.DarkenColour(color);
			if (drawOutlines) this.m_sprite.lineStyle(this.m_lineThickness * this.m_drawScale, (this.drawColours ? Util.b2ColorToHex(isHighlighted ? b2DebugDraw.DarkenColour(outlineColour) : outlineColour) : Util.b2ColorToHex(color)), this.m_alpha);
			else this.m_sprite.lineStyle(0, 0, 0);
			this.m_sprite.moveTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.beginFill((this.drawColours ? (isHighlighted ? Util.b2ColorToHex(b2DebugDraw.BrightenColour(color)) : Util.b2ColorToHex(color)) : Util.b2ColorToHex(color)), this.m_fillAlpha * (isHighlighted ? 0.8 : 1));
			for (var i:number = 1; i < vertexCount; i++){
				this.m_sprite.lineTo(vertices[i].x * this.m_drawScale - this.m_drawXOff, vertices[i].y * this.m_drawScale - this.m_drawYOff);
			}
			this.m_sprite.lineTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.endFill();
		}
	}

	public DrawSolidCannon(vertices:Array<any>, vertexCount:number, color:b2Color, isHighlighted:boolean = false, drawOutlines:boolean = true) : void{
		if (this.IsPolygonOnScreen(vertices, vertexCount) ) {
			var outlineColour:b2Color = b2DebugDraw.DarkenColour(color);
			if (drawOutlines) this.m_sprite.lineStyle(this.m_lineThickness * this.m_drawScale, (this.drawColours ? Util.b2ColorToHex(isHighlighted ? b2DebugDraw.DarkenColour(outlineColour) : outlineColour) : Util.b2ColorToHex(color)), this.m_alpha);
			else this.m_sprite.lineStyle(0, 0, 0);
			this.m_sprite.moveTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.beginFill(Util.b2ColorToHex(color), this.m_fillAlpha * (isHighlighted ? 0.8 : 1));
			this.m_sprite.lineTo(vertices[1].x * this.m_drawScale - this.m_drawXOff, vertices[1].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.lineTo(vertices[2].x * this.m_drawScale - this.m_drawXOff, vertices[2].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.lineTo(vertices[3].x * this.m_drawScale - this.m_drawXOff, vertices[3].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.lineTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.endFill();
			this.m_sprite.moveTo(vertices[0].x * this.m_drawScale - this.m_drawXOff, vertices[0].y * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.lineTo((vertices[1].x + vertices[2].x) * 0.5 * this.m_drawScale - this.m_drawXOff, (vertices[1].y + vertices[2].y) * 0.5 * this.m_drawScale - this.m_drawYOff);
			this.m_sprite.lineTo(vertices[3].x * this.m_drawScale - this.m_drawXOff, vertices[3].y * this.m_drawScale - this.m_drawYOff);
		}
	}

	/// Draw a circle.
	public DrawCircle(center:b2Vec2, radius:number, color:b2Color) : void{
		if (this.IsCircleOnScreen(center, radius)) {
			this.m_sprite.lineStyle(1, Util.b2ColorToHex(color), this.m_alpha);
			this.m_sprite.drawCircle(center.x * this.m_drawScale - this.m_drawXOff, center.y * this.m_drawScale - this.m_drawYOff, radius * this.m_drawScale);
		}
	}

	/// Draw a solid circle.
	public DrawSolidCircle(center:b2Vec2, radius:number, axis:b2Rot, color:b2Color, isHighlighted:boolean = false, drawOutlines:boolean = true, cannonball:boolean = false) : void{
		if (this.IsCircleOnScreen(center, radius)) {
			var outlineColour:b2Color = b2DebugDraw.DarkenColour(color);
			if (drawOutlines) this.m_sprite.lineStyle(this.m_lineThickness * this.m_drawScale, (this.drawColours ? Util.b2ColorToHex(isHighlighted ? b2DebugDraw.DarkenColour(outlineColour) : outlineColour) : Util.b2ColorToHex(color)), this.m_alpha);
			else this.m_sprite.lineStyle(0, 0, 0);
			this.m_sprite.moveTo(0,0);
			this.m_sprite.beginFill((this.drawColours ? Util.b2ColorToHex(isHighlighted ? b2DebugDraw.BrightenColour(color) : color) : Util.b2ColorToHex(color)), this.m_fillAlpha * (isHighlighted ? 0.8 : 1));
			this.m_sprite.drawCircle(center.x * this.m_drawScale - this.m_drawXOff, center.y * this.m_drawScale - this.m_drawYOff, radius * this.m_drawScale);
			this.m_sprite.endFill();
			if (drawOutlines && !cannonball) {
				var numSpokes:number = 16;
				for (var i:number = 0; i < numSpokes; i++) {
					var angle:number = Math.atan2(axis.s, axis.c) + 2 * i * Math.PI / numSpokes;
					//m_sprite.moveTo(center.x * m_drawScale - m_drawXOff, center.y * m_drawScale - m_drawYOff);
					this.m_sprite.moveTo((center.x + Math.cos(angle)*(radius * 0.9)) * this.m_drawScale - this.m_drawXOff, (center.y + Math.sin(angle)*(radius * 0.9)) * this.m_drawScale - this.m_drawYOff);
					this.m_sprite.lineTo((center.x + Math.cos(angle)*radius) * this.m_drawScale - this.m_drawXOff, (center.y + Math.sin(angle)*radius) * this.m_drawScale - this.m_drawYOff);
				}
			}
		}
	}

	/// Draw a line segment.
	public DrawSegment(p1:b2Vec2, p2:b2Vec2, color:b2Color) : void{
		this.m_sprite.lineStyle(1, Util.b2ColorToHex(color), this.m_alpha);
		this.m_sprite.moveTo(p1.x * this.m_drawScale - this.m_drawXOff, p1.y * this.m_drawScale - this.m_drawYOff);
		this.m_sprite.lineTo(p2.x * this.m_drawScale - this.m_drawXOff, p2.y * this.m_drawScale - this.m_drawYOff);
	}

	public DrawSolidSegment(p1:b2Vec2, p2:b2Vec2, color:b2Color) : void{
		this.m_sprite.lineStyle(this.m_lineThickness * this.m_drawScale, Util.b2ColorToHex(color), this.m_alpha);
		this.m_sprite.moveTo(p1.x * this.m_drawScale - this.m_drawXOff, p1.y * this.m_drawScale - this.m_drawYOff);
		this.m_sprite.lineTo(p2.x * this.m_drawScale - this.m_drawXOff, p2.y * this.m_drawScale - this.m_drawYOff);
	}

	public IsPolygonOnScreen(vertices:Array<any>, vertexCount:number):boolean {
		var xLeft:boolean;
		var yTop:boolean;
		xLeft = (vertices[0].x < -5);
		yTop = (vertices[0].y < -5);
		for (var i:number = 0; i < vertexCount; i++) {
			var xVal:number = vertices[i].x * this.m_drawScale - this.m_drawXOff;
			var yVal:number = vertices[i].y * this.m_drawScale - this.m_drawYOff;
			if ((xVal >= -5 || !xLeft) && (xVal < 805 || xLeft) && (yVal >= -5 || !yTop) && (yVal < 605 || yTop)) return true;
		}
		return false;
	}

	public IsCircleOnScreen(center:b2Vec2, radius:number):boolean {
		var screenCenter:b2Vec2 = new b2Vec2();
		var newRadius:number = radius * this.m_drawScale;
		screenCenter.x = center.x * this.m_drawScale - this.m_drawXOff;
		screenCenter.y = center.y * this.m_drawScale - this.m_drawYOff;
		return (screenCenter.x + newRadius >= -5 && screenCenter.x - newRadius < 805 && screenCenter.y + newRadius >= -5 && screenCenter.y - newRadius < 605);
	}

	public static BrightenColour(color:b2Color):b2Color {
		var r:number = b2DebugDraw.GetR(color);
		var g:number = b2DebugDraw.GetG(color);
		var b:number = b2DebugDraw.GetB(color);

		var newR:number, newG:number, newB:number;

		// Determine max value
	    var max:number = Math.max(r, g, b);

	    // Calculate new brightness
	    var bright:number = (max * 100.0 / 255.0) + 20;

	    if (r == 0) r = 1;
	    if (g == 0) g = 1;
	    if (b == 0) b = 1;
	    if (max == 0) max = 1;

	    // Recalculate RGB values based on original proportions
	    newR = (r * 255 / max) * bright/100;
	    newG = (g * 255 / max) * bright/100;
	    newB = (b * 255 / max) * bright/100;

	    newR = Math.min(newR, 255);
	    newG = Math.min(newG, 255);
	    newB = Math.min(newB, 255);

	    return new b2Color(newR / 255.0, newG / 255.0, newB / 255.0);
	}

	public static DarkenColour(color:b2Color):b2Color {
		var r:number = b2DebugDraw.GetR(color);
		var g:number = b2DebugDraw.GetG(color);
		var b:number = b2DebugDraw.GetB(color);

		var newR:number, newG:number, newB:number;

		// Determine max value
	    var max:number = Math.max(r, g, b);

	    // Calculate new brightness
	    var bright:number = (max * 100.0 / 255.0) - 40;

	    // Recalculate RGB values based on original proportions
	    newR = (r * 255 / max) * bright/100;
	    newG = (g * 255 / max) * bright/100;
	    newB = (b * 255 / max) * bright/100;

	    newR = Math.max(newR, 0);
	    newG = Math.max(newG, 0);
	    newB = Math.max(newB, 0);

	    return new b2Color(newR / 255.0, newG / 255.0, newB / 255.0);
	}

	public static GetR(colour:b2Color):number {
		return (Util.b2ColorToHex(colour) & 0xFF0000) >> 16;
	}

	public static GetG(colour:b2Color):number {
		return (Util.b2ColorToHex(colour) & 0x00FF00) >> 8;
	}

	public static GetB(colour:b2Color):number {
		return (Util.b2ColorToHex(colour) & 0x0000FF);
	}

	public drawColours:boolean = true;
	public m_drawFlags:number;
	public m_sprite:Graphics;
	public m_drawScale:number = 1.0;
	public m_drawXOff:number = 0.0;
	public m_drawYOff:number = 0.0;

	public m_lineThickness:number = 0.08;
	public m_alpha:number = 1.0;
	public m_fillAlpha:number = 1.0;
	public m_xformScale:number = 1.0;
};
