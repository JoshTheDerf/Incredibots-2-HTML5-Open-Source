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

import { b2Color, b2Transform, b2Vec2 } from "..";

// The 2.1a b2DebugDraw imported flash.display.Sprite and drew through
// sprite.graphics.*. To keep this port free of any flash/pixi dependency (as in
// the 2.0.2 port's b2DebugDraw), the drawing surface is typed structurally: an
// IGraphics interface exposing exactly the graphics calls used, wrapped in an
// IDrawSurface with a `graphics` member (matching `m_sprite.graphics.*`). At
// runtime a real Sprite (or any compatible object) can be plugged in.
interface IGraphics {
	clear(): void;
	lineStyle(thickness?: number, color?: number, alpha?: number): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	beginFill(color?: number, alpha?: number): void;
	endFill(): void;
	drawCircle(x: number, y: number, radius: number): void;
}
interface IDrawSurface {
	graphics: IGraphics;
}

export class b2DebugDraw
{

	public static e_shapeBit:number = 1;

	public static e_jointBit:number = 2;

	public static e_aabbBit:number = 4;

	public static e_pairBit:number = 8;

	public static e_centerOfMassBit:number = 16;

	public static e_controllerBit:number = 32;

	private m_drawFlags:number;

	public m_sprite!:IDrawSurface;

	private m_drawScale:number = 1;

	private m_lineThickness:number = 1;

	private m_alpha:number = 1;

	private m_fillAlpha:number = 1;

	private m_xformScale:number = 1;

	constructor(){
		this.m_drawFlags = 0;
	}

	public SetFlags(flags:number) : void{
		this.m_drawFlags = flags;
	}

	public GetFlags() : number{
		return this.m_drawFlags;
	}

	public AppendFlags(flags:number) : void{
		this.m_drawFlags |= flags;
	}

	public ClearFlags(flags:number) : void{
		this.m_drawFlags &= ~flags;
	}

	public SetSprite(sprite:IDrawSurface) : void{
		this.m_sprite = sprite;
	}

	public GetSprite() : IDrawSurface{
		return this.m_sprite;
	}

	public SetDrawScale(drawScale:number) : void{
		this.m_drawScale = drawScale;
	}

	public GetDrawScale() : number{
		return this.m_drawScale;
	}

	public SetLineThickness(lineThickness:number) : void{
		this.m_lineThickness = lineThickness;
	}

	public GetLineThickness() : number{
		return this.m_lineThickness;
	}

	public SetAlpha(alpha:number) : void{
		this.m_alpha = alpha;
	}

	public GetAlpha() : number{
		return this.m_alpha;
	}

	public SetFillAlpha(alpha:number) : void{
		this.m_fillAlpha = alpha;
	}

	public GetFillAlpha() : number{
		return this.m_fillAlpha;
	}

	public SetXFormScale(xformScale:number) : void{
		this.m_xformScale = xformScale;
	}

	public GetXFormScale() : number{
		return this.m_xformScale;
	}

	public DrawPolygon(vertices:any[], vertexCount:number, color:b2Color) : void{
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,color.color,this.m_alpha);
		this.m_sprite.graphics.moveTo(vertices[0].x * this.m_drawScale,vertices[0].y * this.m_drawScale);
		var i:number = 1;
		while(i < vertexCount){
			this.m_sprite.graphics.lineTo(vertices[i].x * this.m_drawScale,vertices[i].y * this.m_drawScale);
			i++;
		}
		this.m_sprite.graphics.lineTo(vertices[0].x * this.m_drawScale,vertices[0].y * this.m_drawScale);
	}

	public DrawSolidPolygon(vertices:b2Vec2[], vertexCount:number, color:b2Color) : void{
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,color.color,this.m_alpha);
		this.m_sprite.graphics.moveTo(vertices[0].x * this.m_drawScale,vertices[0].y * this.m_drawScale);
		this.m_sprite.graphics.beginFill(color.color,this.m_fillAlpha);
		var i:number = 1;
		while(i < vertexCount){
			this.m_sprite.graphics.lineTo(vertices[i].x * this.m_drawScale,vertices[i].y * this.m_drawScale);
			i++;
		}
		this.m_sprite.graphics.lineTo(vertices[0].x * this.m_drawScale,vertices[0].y * this.m_drawScale);
		this.m_sprite.graphics.endFill();
	}

	public DrawCircle(center:b2Vec2, radius:number, color:b2Color) : void{
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,color.color,this.m_alpha);
		this.m_sprite.graphics.drawCircle(center.x * this.m_drawScale,center.y * this.m_drawScale,radius * this.m_drawScale);
	}

	public DrawSolidCircle(center:b2Vec2, radius:number, axis:b2Vec2, color:b2Color) : void{
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,color.color,this.m_alpha);
		this.m_sprite.graphics.moveTo(0,0);
		this.m_sprite.graphics.beginFill(color.color,this.m_fillAlpha);
		this.m_sprite.graphics.drawCircle(center.x * this.m_drawScale,center.y * this.m_drawScale,radius * this.m_drawScale);
		this.m_sprite.graphics.endFill();
		this.m_sprite.graphics.moveTo(center.x * this.m_drawScale,center.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo((center.x + axis.x * radius) * this.m_drawScale,(center.y + axis.y * radius) * this.m_drawScale);
	}

	public DrawSegment(p1:b2Vec2, p2:b2Vec2, color:b2Color) : void{
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,color.color,this.m_alpha);
		this.m_sprite.graphics.moveTo(p1.x * this.m_drawScale,p1.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo(p2.x * this.m_drawScale,p2.y * this.m_drawScale);
	}

	public DrawTransform(xf:b2Transform) : void{
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,16711680,this.m_alpha);
		this.m_sprite.graphics.moveTo(xf.position.x * this.m_drawScale,xf.position.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo((xf.position.x + this.m_xformScale * xf.R.col1.x) * this.m_drawScale,(xf.position.y + this.m_xformScale * xf.R.col1.y) * this.m_drawScale);
		this.m_sprite.graphics.lineStyle(this.m_lineThickness,65280,this.m_alpha);
		this.m_sprite.graphics.moveTo(xf.position.x * this.m_drawScale,xf.position.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo((xf.position.x + this.m_xformScale * xf.R.col2.x) * this.m_drawScale,(xf.position.y + this.m_xformScale * xf.R.col2.y) * this.m_drawScale);
	}
}
