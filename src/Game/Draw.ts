import { TextStyle } from "pixi.js";
import { b2Color, b2World, b2Vec2, b2Body, b2Shape, b2Joint, b2BroadPhase, b2XForm, b2CircleShape, math, b2PolygonShape, b2_maxPolygonVertices, b2ShapeType, b2Transform, b2JointType, b2Rot } from "@box2d/core";
import { Util } from "../General/Util";
import { Main } from "../Main";
import { Cannon } from "../Parts/Cannon";
import { Circle } from "../Parts/Circle";
import { FixedJoint } from "../Parts/FixedJoint";
import { JointPart } from "../Parts/JointPart";
import { PrismaticJoint } from "../Parts/PrismaticJoint";
import { Rectangle } from "../Parts/Rectangle";
import { RevoluteJoint } from "../Parts/RevoluteJoint";
import { ShapePart } from "../Parts/ShapePart";
import { TextPart } from "../Parts/TextPart";
import { Thrusters } from "../Parts/Thrusters";
import { Triangle } from "../Parts/Triangle";
import { Challenge } from "./Challenge";
import { ControllerGameGlobals } from "./Globals/ControllerGameGlobals";
import { b2DebugDraw } from './Graphics/b2DebugDraw'
import { Part } from "../Parts/Part";

export class Draw extends b2DebugDraw
{
	private static s_jointColor:b2Color = new b2Color(0.8, 0.8, 0.4);
	private static s_selectedColor:b2Color = new b2Color(0.4, 0.4, 0.9);
	private static s_normalColor:b2Color = new b2Color(0.5, 0.5, 0.5);
	private static s_uneditableColor:b2Color = new b2Color(0.6, 0.6, 0.6);
	private static s_jointCreatingColor:b2Color = new b2Color(0.9, 0.4, 0.4);
	private static s_staticColor:b2Color = new b2Color(0.4, 0.9, 0.4);
	private static s_staticEditableColor:b2Color = new b2Color(0.6, 0.8, 0.6);
	private m_world:b2World;

	public DrawWorld(allParts:Array<Part>, selectedParts:Array<any>, world:b2World, notStarted:boolean, drawStatic:boolean = true, showJoints:boolean = true, showOutlines:boolean = true, challenge:Challenge = null):void {
		this.m_world = world;

		var i:number;

		if (challenge && (notStarted || challenge.showConditions)) {
			for (i = 0; i < challenge.winConditions.length; i++) {
				if (challenge.winConditions[i].object == 0) {
					vertices = new Array(4);
					vertices[0] = new b2Vec2(challenge.winConditions[i].minX, challenge.winConditions[i].minY);
					vertices[1] = new b2Vec2(challenge.winConditions[i].minX, challenge.winConditions[i].maxY);
					vertices[2] = new b2Vec2(challenge.winConditions[i].maxX, challenge.winConditions[i].maxY);
					vertices[3] = new b2Vec2(challenge.winConditions[i].maxX, challenge.winConditions[i].minY);
					if (this.drawColours) this.m_fillAlpha = 0.2;
					this.DrawSolidPolygon(vertices, 4, new b2Color(0.5, 0.8, 0.5));
				} else if (challenge.winConditions[i].object < 5) {
					this.DrawSolidSegment(new b2Vec2(challenge.winConditions[i].minX, challenge.winConditions[i].minY), new b2Vec2(challenge.winConditions[i].maxX, challenge.winConditions[i].maxY), Draw.DarkenColour(new b2Color(0.5, 0.8, 0.5)));
				}
			}
			for (i = 0; i < challenge.lossConditions.length; i++) {
				if (challenge.lossConditions[i].object == 0) {
					vertices = new Array(4);
					vertices[0] = new b2Vec2(challenge.lossConditions[i].minX, challenge.lossConditions[i].minY);
					vertices[1] = new b2Vec2(challenge.lossConditions[i].minX, challenge.lossConditions[i].maxY);
					vertices[2] = new b2Vec2(challenge.lossConditions[i].maxX, challenge.lossConditions[i].maxY);
					vertices[3] = new b2Vec2(challenge.lossConditions[i].maxX, challenge.lossConditions[i].minY);
					if (this.drawColours) this.m_fillAlpha = 0.2;
					this.DrawSolidPolygon(vertices, 4, new b2Color(0.8, 0.7, 0.7));
				} else if (challenge.lossConditions[i].object < 5) {
					this.DrawSolidSegment(new b2Vec2(challenge.lossConditions[i].minX, challenge.lossConditions[i].minY), new b2Vec2(challenge.lossConditions[i].maxX, challenge.lossConditions[i].maxY), Draw.DarkenColour(new b2Color(0.7, 0.7, 0.8)));
				}
			}
		}

		if (notStarted) {
			if (this.drawColours && showOutlines) {
				for (i = 0; i < allParts.length; i++) {
					if (!allParts[i].isStatic || allParts[i].isEditable || drawStatic || allParts[i].drawAnyway) {
						if (allParts[i] instanceof ShapePart && allParts[i].terrain && allParts[i].outline) {
							var myColor:b2Color = Draw.s_normalColor;
							var isHighlighted:boolean = false;
							if (this.drawColours) {
								myColor = new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0, );
								if ((allParts[i] instanceof ShapePart && allParts[i].highlightForJoint) || Util.ObjectInArray(allParts[i], selectedParts)) isHighlighted = true;
							} else {
								if (!allParts[i].isEditable) myColor = Draw.s_uneditableColor;
								if (allParts[i].isStatic && allParts[i].isEditable) myColor = Draw.s_staticEditableColor;
								if (Util.ObjectInArray(allParts[i], selectedParts)) myColor = Draw.s_selectedColor;
								if (allParts[i].isStatic && !allParts[i].isEditable) myColor = Draw.s_staticColor;
								if (allParts[i] instanceof ShapePart && allParts[i].highlightForJoint) myColor = Draw.s_jointCreatingColor;
							}

							myColor = Draw.DarkenColour(myColor);
							if (isHighlighted) myColor = Draw.DarkenColour(myColor);
							var thickness:number = Math.max(0.1, (this.m_lineThickness * Math.pow(this.m_drawScale, 0.5)) / 8);
							if (allParts[i] instanceof Circle) {
								var circ:Circle = (allParts[i] as Circle);
								this.m_fillAlpha = circ.opacity / 255.0;
								this.DrawSolidCircle(new b2Vec2(circ.centerX, circ.centerY), circ.radius + thickness * 0.8, new b2Rot(circ.angle), myColor, false, false);
							} else if (allParts[i] instanceof Rectangle) {
								var rect:Rectangle = (allParts[i] as Rectangle);
								this.m_fillAlpha = rect.opacity / 255.0;
								this.DrawSolidPolygon(rect.GetVerticesForOutline(thickness), 4, myColor, false, false);
							} else if (allParts[i] instanceof Triangle) {
								var tri:Triangle = (allParts[i] as Triangle);
								this.m_fillAlpha = tri.opacity / 255.0;
								this.DrawSolidPolygon(tri.GetVerticesForOutline(thickness), 3, myColor, false, false);
							} else if (allParts[i] instanceof Cannon) {
								var ca:Cannon = (allParts[i] as Cannon);
								this.m_fillAlpha = ca.opacity / 255.0;
								this.DrawSolidPolygon(ca.GetVerticesForOutline(thickness), 4, myColor, false, false);
							}
						}
					}
				}
			}
			for (i = 0; i < allParts.length; i++) {
				if (!allParts[i].isStatic || allParts[i].isEditable || drawStatic || allParts[i].drawAnyway) {
					if (allParts[i] instanceof ShapePart || allParts[i] instanceof PrismaticJoint) {
						myColor = Draw.s_normalColor;
						isHighlighted = false;
						if (this.drawColours) {
							myColor = new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0);

							if ((allParts[i] instanceof ShapePart && allParts[i].highlightForJoint) || Util.ObjectInArray(allParts[i], selectedParts)) isHighlighted = true;
						} else {
							if (allParts[i] instanceof JointPart) myColor = Draw.s_jointColor;
							if (!allParts[i].isEditable) myColor = Draw.s_uneditableColor;
							if (allParts[i].isStatic && allParts[i].isEditable) myColor = Draw.s_staticEditableColor;
							if (Util.ObjectInArray(allParts[i], selectedParts)) myColor = Draw.s_selectedColor;
							if (allParts[i].isStatic && !allParts[i].isEditable) myColor = Draw.s_staticColor;
							if (allParts[i] instanceof ShapePart && allParts[i].highlightForJoint) myColor = Draw.s_jointCreatingColor;
						}

						if (allParts[i] instanceof Circle) {
							circ = (allParts[i] as Circle);
							if (this.drawColours) this.m_fillAlpha = circ.opacity / 255.0;
							this.DrawSolidCircle(new b2Vec2(circ.centerX, circ.centerY), circ.radius, new b2Rot(circ.angle), myColor, isHighlighted, circ.outline && (!circ.terrain || !this.drawColours) && showOutlines);
						} else if (allParts[i] instanceof Rectangle) {
							rect = (allParts[i] as Rectangle);
							if (this.drawColours) this.m_fillAlpha = rect.opacity / 255.0;
							this.DrawSolidPolygon(rect.GetVertices(), 4, myColor, isHighlighted, rect.outline && (!rect.terrain || !this.drawColours) && showOutlines);
						} else if (allParts[i] instanceof Triangle) {
							tri = (allParts[i] as Triangle);
							if (this.drawColours) this.m_fillAlpha = tri.opacity / 255.0;
							this.DrawSolidPolygon(tri.GetVertices(), 3, myColor, isHighlighted, tri.outline && (!tri.terrain || !this.drawColours) && showOutlines);
						} else if (allParts[i] instanceof Cannon) {
							ca = (allParts[i] as Cannon);
							if (this.drawColours) this.m_fillAlpha = ca.opacity / 255.0;
							this.DrawSolidCannon(ca.GetVertices(), 4, myColor, isHighlighted, ca.outline && (!ca.terrain || !this.drawColours) && showOutlines);
						} else if (allParts[i] instanceof PrismaticJoint) {
							var pjoint:PrismaticJoint = (allParts[i] as PrismaticJoint);
							var x1:number = pjoint.anchorX - pjoint.axis.x * pjoint.initLength / 2;
							var y1:number = pjoint.anchorY - pjoint.axis.y * pjoint.initLength / 2;
							var x2:number = pjoint.anchorX + pjoint.axis.x * pjoint.initLength / 2;
							var y2:number = pjoint.anchorY + pjoint.axis.y * pjoint.initLength / 2;

							var angle:number = Math.atan2(pjoint.axis.y, pjoint.axis.x);

							if (this.drawColours) this.m_fillAlpha = pjoint.opacity / 255.0;

							verts = new Array();
							verts[0] = new b2Vec2(x1 - 0.25, y1 - 0.05);
							verts[1] = new b2Vec2(x1 + 0.25, y1 - 0.05);
							verts[2] = new b2Vec2(x1 + 0.25, y1 + 0.05);
							verts[3] = new b2Vec2(x1 - 0.25, y1 + 0.05);
							var dist:number = Math.sqrt(0.25 * 0.25 + 0.05 * 0.05);
							for (j = 0; j < 4; j++) {
								var vertAngle:number = Math.atan2(verts[j].y - y1, verts[j].x - x1);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = x1 + dist * Math.cos(vertAngle);
								verts[j].y = y1 + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);

							dist = Math.sqrt(0.2 * 0.2 + pjoint.initLength * pjoint.initLength / 4);
							var centerX:number = x1 + dist * Math.cos(Math.atan2(-pjoint.initLength / 2, -0.2) + angle + Math.PI / 2);
							var centerY:number = y1 + dist * Math.sin(Math.atan2(-pjoint.initLength / 2, -0.2) + angle + Math.PI / 2);
							verts[0] = new b2Vec2(x1 - 0.05, y1 - pjoint.initLength / 2);
							verts[1] = new b2Vec2(x1 + 0.05, y1 - pjoint.initLength / 2);
							verts[2] = new b2Vec2(x1 + 0.05, y1 + pjoint.initLength / 2);
							verts[3] = new b2Vec2(x1 - 0.05, y1 + pjoint.initLength / 2);
							dist = Math.sqrt(0.05 * 0.05 + pjoint.initLength * pjoint.initLength / 4);
							for (j = 0; j < 4; j++) {
								vertAngle = Math.atan2(verts[j].y - y1, verts[j].x - x1);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = centerX + dist * Math.cos(vertAngle);
								verts[j].y = centerY + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);

							dist = Math.sqrt(0.2 * 0.2 + pjoint.initLength * pjoint.initLength / 4);
							centerX = x1 + dist * Math.cos(Math.atan2(-pjoint.initLength / 2, 0.2) + angle + Math.PI / 2);
							centerY = y1 + dist * Math.sin(Math.atan2(-pjoint.initLength / 2, 0.2) + angle + Math.PI / 2);
							verts[0] = new b2Vec2(x1 - 0.05, y1 - pjoint.initLength / 2);
							verts[1] = new b2Vec2(x1 + 0.05, y1 - pjoint.initLength / 2);
							verts[2] = new b2Vec2(x1 + 0.05, y1 + pjoint.initLength / 2);
							verts[3] = new b2Vec2(x1 - 0.05, y1 + pjoint.initLength / 2);
							dist = Math.sqrt(0.05 * 0.05 + pjoint.initLength * pjoint.initLength / 4);
							for (j = 0; j < 4; j++) {
								vertAngle = Math.atan2(verts[j].y - y1, verts[j].x - x1);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = centerX + dist * Math.cos(vertAngle);
								verts[j].y = centerY + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);

							dist = Math.sqrt(0.15 * 0.15 + pjoint.initLength * pjoint.initLength);
							centerX = x1 + dist * Math.cos(Math.atan2(-pjoint.initLength, -0.15) + angle + Math.PI / 2);
							centerY = y1 + dist * Math.sin(Math.atan2(-pjoint.initLength, -0.15) + angle + Math.PI / 2);
							verts[0] = new b2Vec2(x1 - 0.1, y1 - 0.05);
							verts[1] = new b2Vec2(x1 + 0.1, y1 - 0.05);
							verts[2] = new b2Vec2(x1 + 0.1, y1 + 0.05);
							verts[3] = new b2Vec2(x1 - 0.1, y1 + 0.05);
							dist = Math.sqrt(0.1 * 0.1 + 0.05 * 0.05);
							for (j = 0; j < 4; j++) {
								vertAngle = Math.atan2(verts[j].y - y1, verts[j].x - x1);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = centerX + dist * Math.cos(vertAngle);
								verts[j].y = centerY + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);

							dist = Math.sqrt(0.15 * 0.15 + pjoint.initLength * pjoint.initLength);
							centerX = x1 + dist * Math.cos(Math.atan2(-pjoint.initLength, 0.15) + angle + Math.PI / 2);
							centerY = y1 + dist * Math.sin(Math.atan2(-pjoint.initLength, 0.15) + angle + Math.PI / 2);
							verts[0] = new b2Vec2(x1 - 0.1, y1 - 0.05);
							verts[1] = new b2Vec2(x1 + 0.1, y1 - 0.05);
							verts[2] = new b2Vec2(x1 + 0.1, y1 + 0.05);
							verts[3] = new b2Vec2(x1 - 0.1, y1 + 0.05);
							dist = Math.sqrt(0.1 * 0.1 + 0.05 * 0.05);
							for (j = 0; j < 4; j++) {
								vertAngle = Math.atan2(verts[j].y - y1, verts[j].x - x1);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = centerX + dist * Math.cos(vertAngle);
								verts[j].y = centerY + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);

							dist = pjoint.initLength / 2 - 0.1;
							centerX = x2 + dist * Math.cos(Math.atan2(pjoint.initLength / 2 - 0.1, 0) + angle + Math.PI / 2);
							centerY = y2 + dist * Math.sin(Math.atan2(pjoint.initLength / 2 - 0.1, 0) + angle + Math.PI / 2);
							verts[0] = new b2Vec2(x2 - 0.05, y2 - pjoint.initLength / 2);
							verts[1] = new b2Vec2(x2 + 0.05, y2 - pjoint.initLength / 2);
							verts[2] = new b2Vec2(x2 + 0.05, y2 + pjoint.initLength / 2);
							verts[3] = new b2Vec2(x2 - 0.05, y2 + pjoint.initLength / 2);
							dist = Math.sqrt(0.05 * 0.05 + pjoint.initLength * pjoint.initLength / 4);
							for (j = 0; j < 4; j++) {
								vertAngle = Math.atan2(verts[j].y - y2, verts[j].x - x2);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = centerX + dist * Math.cos(vertAngle);
								verts[j].y = centerY + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);

							dist = pjoint.initLength - 0.1;
							centerX = x2 + dist * Math.cos(Math.atan2(pjoint.initLength - 0.1, 0) + angle + Math.PI / 2);
							centerY = y2 + dist * Math.sin(Math.atan2(pjoint.initLength - 0.1, 0) + angle + Math.PI / 2);
							verts[0] = new b2Vec2(x2 - 0.15, y2 - 0.05);
							verts[1] = new b2Vec2(x2 + 0.15, y2 - 0.05);
							verts[2] = new b2Vec2(x2 + 0.15, y2 + 0.05);
							verts[3] = new b2Vec2(x2 - 0.15, y2 + 0.05);
							dist = Math.sqrt(0.05 * 0.05 + 0.15 * 0.15);
							for (j = 0; j < 4; j++) {
								vertAngle = Math.atan2(verts[j].y - y2, verts[j].x - x2);
								vertAngle = Util.NormalizeAngle(angle + vertAngle + Math.PI / 2);
								verts[j].x = centerX + dist * Math.cos(vertAngle);
								verts[j].y = centerY + dist * Math.sin(vertAngle);
							}
							this.DrawSolidPolygon(verts, 4, myColor, isHighlighted, pjoint.outline && showOutlines);
						}
					}
				}
			}
			if (showJoints) {
				for (i = 0; i < allParts.length; i++) {
					if (allParts[i] instanceof JointPart || allParts[i] instanceof Thrusters) {
						myColor = Draw.s_jointColor;
						if (!allParts[i].isEditable) myColor = Draw.s_uneditableColor;
						if (allParts[i].isStatic && allParts[i].isEditable) myColor = Draw.s_staticEditableColor;
						if (Util.ObjectInArray(allParts[i], selectedParts)) myColor = Draw.s_selectedColor;
						if (allParts[i].isStatic && !allParts[i].isEditable) myColor = Draw.s_staticColor;
						if (allParts[i] instanceof ShapePart && allParts[i].highlightForJoint) myColor = Draw.s_jointCreatingColor;

						if (allParts[i] instanceof FixedJoint) {
							var fjoint:FixedJoint = (allParts[i] as FixedJoint);
							for (var j:number = 0; j < 2; j++) {
								var verts:Array<any> = new Array();
								verts[0] = new b2Vec2(fjoint.anchorX - 0.075 * (j + 1) * 30 / this.m_drawScale, fjoint.anchorY - 0.075 * (j + 1) * 30 / this.m_drawScale);
								verts[1] = new b2Vec2(fjoint.anchorX - 0.075 * (j + 1) * 30 / this.m_drawScale, fjoint.anchorY + 0.075 * (j + 1) * 30 / this.m_drawScale);
								verts[2] = new b2Vec2(fjoint.anchorX + 0.075 * (j + 1) * 30 / this.m_drawScale, fjoint.anchorY + 0.075 * (j + 1) * 30 / this.m_drawScale);
								verts[3] = new b2Vec2(fjoint.anchorX + 0.075 * (j + 1) * 30 / this.m_drawScale, fjoint.anchorY - 0.075 * (j + 1) * 30 / this.m_drawScale);
								this.DrawPolygon(verts, 4, myColor);
							}
						} else if (allParts[i] instanceof RevoluteJoint) {
							var rjoint:RevoluteJoint = (allParts[i] as RevoluteJoint);
							this.DrawCircle(new b2Vec2(rjoint.anchorX, rjoint.anchorY), 0.075 * 30 / this.m_drawScale, myColor);
							this.DrawCircle(new b2Vec2(rjoint.anchorX, rjoint.anchorY), 0.15 * 30 / this.m_drawScale, myColor);
						} else if (allParts[i] instanceof Thrusters) {
							var t:Thrusters = (allParts[i] as Thrusters);
							for (j = 0; j < 2; j++) {
								verts = new Array();
								verts[0] = new b2Vec2(t.centerX + 0.2 * Math.cos(t.angle) * (j + 1) * 30 / this.m_drawScale, t.centerY + 0.2 * Math.sin(t.angle) * (j + 1) * 30 / this.m_drawScale);
								verts[1] = new b2Vec2(t.centerX + 0.1 * Math.cos(t.angle + 2 * Math.PI / 3) * (j + 1) * 30 / this.m_drawScale, t.centerY + 0.1 * Math.sin(t.angle + 2 * Math.PI / 3) * (j + 1) * 30 / this.m_drawScale);
								verts[2] = new b2Vec2(t.centerX + 0.1 * Math.cos(t.angle + 4 * Math.PI / 3) * (j + 1) * 30 / this.m_drawScale, t.centerY + 0.1 * Math.sin(t.angle + 4 * Math.PI / 3) * (j + 1) * 30 / this.m_drawScale);
								this.DrawPolygon(verts, 3, myColor);
							}
						}
					}
				}
			}
		} else {
			var flags:number = this.GetFlags();

			var b:b2Body;
			var s:b2Shape;
			var jnt:b2Joint;
			var bp:b2BroadPhase;
			var xf:b2XForm;

			if (this.drawColours && showOutlines) {
				for (i = 0; i < allParts.length; i++) {
					if (!allParts[i].isStatic || allParts[i].isEditable || drawStatic || allParts[i].drawAnyway) {
						if (allParts[i] instanceof ShapePart && allParts[i].terrain && allParts[i].outline) {
							xf = allParts[i].GetBody().GetTransform()
							if (allParts[i] instanceof Cannon) this.DrawCannonForOutline(allParts[i].GetShape(), xf, new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0), allParts[i].opacity / 255.0);
							else this.DrawShapeForOutline(allParts[i].GetShape(), xf, new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0), allParts[i].opacity / 255.0);
						}
					}
				}
			}
			for (i = 0; i < allParts.length; i++) {
				if (!allParts[i].isStatic || allParts[i].isEditable || drawStatic || allParts[i].drawAnyway) {
					if (allParts[i] instanceof ShapePart) {
						xf = allParts[i].GetBody().GetTransform()
						if (this.drawColours) {
							if (allParts[i] instanceof Cannon) this.DrawCannon(allParts[i].GetShape(), xf, new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0), allParts[i].opacity / 255.0, showOutlines);
							else this.DrawShape(allParts[i].GetShape(), allParts[i].GetUserData(), xf, new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0), allParts[i].opacity / 255.0, showOutlines);
						} else if (allParts[i].isStatic) {
							if (allParts[i] instanceof Cannon) this.DrawCannon(allParts[i].GetShape(), xf, Draw.s_staticColor, 1, showOutlines);
							else this.DrawShape(allParts[i].GetShape(), allParts[i].GetUserData(), xf, Draw.s_staticColor, 1, showOutlines);
						} else {
							if (allParts[i] instanceof Cannon) this.DrawCannon(allParts[i].GetShape(), xf, Draw.s_normalColor, 1, showOutlines);
							else this.DrawShape(allParts[i].GetShape(), allParts[i].GetUserData(), xf, Draw.s_normalColor, 1, showOutlines);
						}
					} else if (allParts[i] instanceof PrismaticJoint) {
						const pj = (allParts[i] as PrismaticJoint)
						var shapes:Array<b2PolygonShape> = pj.GetShapes();
						for (j = 0; j < shapes.length; j++) {
							xf = pj.part2.GetBody().GetTransform();
							if (this.drawColours) {
								this.DrawShape(shapes[j], pj.part2.GetUserData(), xf, new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0), allParts[i].opacity / 255.0, showOutlines);
							} else if (allParts[i].isStatic) {
								this.DrawShape(shapes[j], pj.part2.GetUserData(), xf, Draw.s_staticColor, 1, showOutlines);
							} else {
								this.DrawShape(shapes[j], pj.part2.GetUserData(), xf, Draw.s_normalColor, 1, showOutlines);
							}
						}
					}
				}

				if (allParts[i] instanceof Cannon) {
					for (j = 0; j < allParts[i].cannonballs.length; j++) {
						xf = allParts[i].cannonballs[j].GetTransform();
						if (this.drawColours) {
							this.DrawShape(allParts[i].cannonballs[j].GetShapeList(), allParts[i].GetUserData(), xf, new b2Color(allParts[i].red / 255.0, allParts[i].green / 255.0, allParts[i].blue / 255.0), allParts[i].opacity / 255.0, showOutlines, true);
						} else {
							this.DrawShape(allParts[i].cannonballs[j].GetShapeList(), allParts[i].GetUserData(), xf, Draw.s_normalColor, 1, showOutlines, true);
						}
					}
				}
			}
		}

		for (i = 0; i < allParts.length; i++) {
			if (allParts[i] instanceof TextPart) {
				// allParts[i].m_textField.visible = (notStarted || allParts[i].alwaysVisible || allParts[i].displayKeyPressed);
				// allParts[i].m_textField.x = allParts[i].x * this.m_drawScale - this.m_drawXOff;
				// allParts[i].m_textField.y = allParts[i].y * this.m_drawScale - this.m_drawYOff;
				// allParts[i].m_textField.width = allParts[i].w * this.m_drawScale;
				// allParts[i].m_textField.height = allParts[i].h * this.m_drawScale;
				var format:TextStyle = new TextStyle();
				format.fontSize = (allParts[i].scaleWithZoom ? (allParts[i].size * this.m_drawScale / 30) : allParts[i].size);
				format.fill = allParts[i].red << 16 | allParts[i].green << 8 | allParts[i].blue;
				format.fontFamily = Main.GLOBAL_FONT;
				// allParts[i].m_textField.setTextStyle(format);
				// allParts[i].m_textField.setSelection(0, 0);
				if (notStarted) {
					var selected:boolean = Util.ObjectInArray(allParts[i], selectedParts);
					var color:b2Color = (selected ? new b2Color(1, 1, 1) : new b2Color(0.1, 0.1, 0.1));
					var vertices:Array<any> = new Array();
					vertices[0] = new b2Vec2(allParts[i].x, allParts[i].y);
					vertices[1] = new b2Vec2(allParts[i].x + allParts[i].w, allParts[i].y);
					vertices[2] = new b2Vec2(allParts[i].x + allParts[i].w, allParts[i].y + allParts[i].h);
					vertices[3] = new b2Vec2(allParts[i].x, allParts[i].y + allParts[i].h);
					this.DrawPolygon(vertices, 4, color);
					var newVerts:Array<any> = new Array();
					for (j = 0; j < 4; j++) {
						newVerts[0] = new b2Vec2(vertices[j].x - 4 / this.m_drawScale, vertices[j].y - 4 / this.m_drawScale);
						newVerts[1] = new b2Vec2(vertices[j].x - 4 / this.m_drawScale, vertices[j].y + 4 / this.m_drawScale);
						newVerts[2] = new b2Vec2(vertices[j].x + 4 / this.m_drawScale, vertices[j].y + 4 / this.m_drawScale);
						newVerts[3] = new b2Vec2(vertices[j].x + 4 / this.m_drawScale, vertices[j].y - 4 / this.m_drawScale);
						this.DrawPolygon(newVerts, 4, color);
					}
				}
			}
		}
	}

	public DrawJoint(joint:b2Joint) : void{
		var b1:b2Body = joint.GetBodyA();
		var b2:b2Body = joint.GetBodyA();
		var xf1:b2XForm = b1.GetTransform();
		var xf2:b2XForm = b2.GetTransform();
		var x1:b2Vec2 = xf1.position;
		var x2:b2Vec2 = xf2.position;
		var p1:b2Vec2 = joint.GetAnchorA();
		var p2:b2Vec2 = joint.GetAnchorB();

		var color:b2Color = Draw.s_jointColor;

		switch (joint.GetType())
		{
		case b2JointType.e_revoluteJoint:
			this.DrawCircle(joint.GetAnchorA(), 0.05 * 30 / this.m_drawScale, color);
			this.DrawCircle(joint.GetAnchorB(), 0.1 * 30 / this.m_drawScale, color);
			break;

		case b2JointType.e_prismaticJoint:
			var end1:b2Vec2 = joint.GetBodyA().GetWorldPoint(joint.GetUserData().localPoint1);
			var end2:b2Vec2 = joint.GetBodyB().GetWorldPoint(joint.GetUserData().localPoint2);
			this.DrawSegment(end1, end2, color);
			var midPoint:b2Vec2 = Util.Midpoint(end1, end2);
			this.DrawCircle(midPoint, 0.05 * 30 / this.m_drawScale, color);
			this.DrawCircle(midPoint, 0.1 * 30 / this.m_drawScale, color);
			break;

		case b2JointType.e_mouseJoint:
			this.DrawSegment(p1, p2, color);
			break;

		default:
			if (b1 != this.m_world.m_groundBody)
				this.DrawSegment(x1, p1, color);
			this.DrawSegment(p1, p2, color);
			if (b2 != this.m_world.m_groundBody)
				this.DrawSegment(x2, p2, color);
		}
	}

	public DrawShape(shape:b2Shape, userData: any, xf:b2XForm, color:b2Color, alpha:number, showOutlines:boolean = true, cannonball:boolean = false) : void{
		switch (shape.GetType())
		{
		case b2ShapeType.e_circle:
			{
				var circle:b2CircleShape = (shape as b2CircleShape);

				const center = new b2Vec2()
				b2Transform.MultiplyVec2(xf, circle.m_p, center);
				var radius:number = circle.m_radius;
				var axis:b2Rot = xf.q;

				if (this.drawColours) this.m_fillAlpha = alpha;
				this.DrawSolidCircle(center, radius, axis, color, false, userData.outline && (!this.drawColours || !userData.terrain) && showOutlines, cannonball);
			}
			break;

		case b2ShapeType.e_polygon:
			{
				var i:number;
				var poly:b2PolygonShape = (shape as b2PolygonShape);
				var vertexCount:number = poly.m_count;
				var localVertices:Array<any> = poly.m_vertices;

				var vertices:Array<any> = new Array(b2_maxPolygonVertices);

				for (i = 0; i < vertexCount; ++i)
				{
					const out = new b2Vec2()
					b2Transform.MultiplyVec2(xf, localVertices[i], out);
					vertices[i] = out
				}
				if (this.drawColours) this.m_fillAlpha = alpha;
				this.DrawSolidPolygon(vertices, vertexCount, color, false, userData.outline && (!this.drawColours || !userData.terrain) && showOutlines);
			}
			break;
		}
	}

	public DrawCannon(shape:b2Shape, xf:b2XForm, color:b2Color, alpha:number, showOutlines:boolean = true) : void{
		var poly:b2PolygonShape = (shape as b2PolygonShape);
		var localVertices:Array<any> = poly.m_vertices;
		var vertices:Array<any> = new Array();

		for (var i:number = 0; i < 4; ++i) {
			const out = new b2Vec2()
			b2Transform.MultiplyVec2(xf, localVertices[i], out);
			vertices[i] = out
}

		if (this.drawColours) this.m_fillAlpha = alpha;
		this.DrawSolidCannon(vertices, 4, color, false, poly.GetUserData().outline && (!this.drawColours || !poly.GetUserData().terrain) && showOutlines);
	}

	public DrawShapeForOutline(shape:b2Shape, xf:b2XForm, color:b2Color, alpha:number) : void {
		color = Draw.DarkenColour(color);
		var thickness:number = Math.max(0.1, (this.m_lineThickness * Math.pow(this.m_drawScale, 0.5)) / 8);

		switch (shape.GetType())
		{
		case b2ShapeType.e_circle:
			{
				var circle:b2CircleShape = (shape as b2CircleShape);

				const center = new b2Vec2()
				b2Transform.MultiplyVec2(xf, circle.m_p, center);
				var radius:number = circle.m_radius;
				var axis = xf.q;

				if (this.drawColours) this.m_fillAlpha = alpha;
				this.DrawSolidCircle(center, radius, axis, color, false, false);
			}
			break;

		case b2ShapeType.e_polygon:
			{
				var i:number;
				var poly:b2PolygonShape = (shape as b2PolygonShape);
				var vertexCount:number = poly.m_count;
				var localVertices:Array<any> = poly.m_vertices;

				var vertices:Array<any> = new Array(b2_maxPolygonVertices);

				for (i = 0; i < vertexCount; ++i)
				{
					const out = new b2Vec2()
					b2Transform.MultiplyVec2(xf, localVertices[i], out);
					vertices[i] = out
				}
				vertices = ShapePart.GetOutlineVertices(vertices, vertexCount, thickness);
				if (this.drawColours) this.m_fillAlpha = alpha;
				this.DrawSolidPolygon(vertices, vertexCount, color, false, false);
			}
			break;
		}
	}

	public DrawCannonForOutline(shape:b2Shape, xf:b2XForm, color:b2Color, alpha:number) : void {
		color = Draw.DarkenColour(color);
		var thickness:number = Math.max(0.1, (this.m_lineThickness * Math.pow(this.m_drawScale, 0.5)) / 8);

		var poly:b2PolygonShape = (shape as b2PolygonShape);
		var localVertices:Array<any> = poly.m_vertices;
		var vertices:Array<any> = new Array(b2_maxPolygonVertices);

		for (var i:number = 0; i < 4; ++i) {
			const out = new b2Vec2()
			b2Transform.MultiplyVec2(xf, localVertices[i], out);
			vertices[i] = out
		}
		vertices = ShapePart.GetOutlineVertices(vertices, 4, thickness);
		if (this.drawColours) this.m_fillAlpha = alpha;
		this.DrawSolidCannon(vertices, 4, color, false, false);
	}

	public DrawTempShape(creatingItem:number, actionStep:number, firstClickX:number, firstClickY:number, secondClickX:number, secondClickY:number, mouseX:number, mouseY:number):void {
		var vertices:Array<any>;
		if (this.drawColours) this.m_fillAlpha = 1;
		else this.m_fillAlpha = 0.5;
		if (creatingItem == ControllerGameGlobals.NEW_CIRCLE && actionStep == 1) {
			var rad:number = Util.GetDist(firstClickX, firstClickY, mouseX, mouseY);
			if (rad < Circle.MIN_RADIUS) rad = Circle.MIN_RADIUS;
			if (rad > Circle.MAX_RADIUS) rad = Circle.MAX_RADIUS;
			if (this.drawColours) this.m_fillAlpha = ControllerGameGlobals.defaultO / 255.0;
			const rot = new b2Rot()
			rot.c = (mouseX - firstClickX) / rad
			rot.s = (mouseY - firstClickY) / rad
			this.DrawSolidCircle(new b2Vec2(firstClickX, firstClickY), rad, rot, (this.drawColours ? new b2Color(ControllerGameGlobals.defaultR / 255.0, ControllerGameGlobals.defaultG / 255.0, ControllerGameGlobals.defaultB / 255.0) : Draw.s_selectedColor));
		} else if (creatingItem == ControllerGameGlobals.NEW_RECT && actionStep == 1) {
			var w:number = mouseX - firstClickX;
			var h:number = mouseY - firstClickY;
			if (Math.abs(w) < Rectangle.MIN_WIDTH) {
				if (w < 0) w = -Rectangle.MIN_WIDTH;
				else w = Rectangle.MIN_WIDTH;
			}
			if (Math.abs(w) > Rectangle.MAX_WIDTH) {
				if (w < 0) w = -Rectangle.MAX_WIDTH;
				else w = Rectangle.MAX_WIDTH;
			}
			if (Math.abs(h) < Rectangle.MIN_WIDTH) {
				if (h < 0) h = -Rectangle.MIN_WIDTH;
				else h = Rectangle.MIN_WIDTH;
			}
			if (Math.abs(h) > Rectangle.MAX_WIDTH) {
				if (h < 0) h = -Rectangle.MAX_WIDTH;
				else h = Rectangle.MAX_WIDTH;
			}

			vertices = new Array(4);
			vertices[0] = new b2Vec2(firstClickX, firstClickY);
			vertices[1] = new b2Vec2(firstClickX + w, firstClickY);
			vertices[2] = new b2Vec2(firstClickX + w, firstClickY + h);
			vertices[3] = new b2Vec2(firstClickX, firstClickY + h);
			if (this.drawColours) this.m_fillAlpha = ControllerGameGlobals.defaultO / 255.0;
			this.DrawSolidPolygon(vertices, 4, (this.drawColours ? new b2Color(ControllerGameGlobals.defaultR / 255.0, ControllerGameGlobals.defaultG / 255.0, ControllerGameGlobals.defaultB / 255.0) : Draw.s_selectedColor));
		} else if (creatingItem == ControllerGameGlobals.NEW_CANNON && actionStep == 1) {
			var positive:boolean = (mouseX >= firstClickX || mouseY >= firstClickY);
			w = (positive ? Math.max(mouseX - firstClickX, 2 * (mouseY - firstClickY)) : Math.min(mouseX - firstClickX, 2 * (mouseY - firstClickY)));
			if (Math.abs(w) < Cannon.MIN_WIDTH) {
				if (w < 0) w = -Cannon.MIN_WIDTH;
				else w = Cannon.MIN_WIDTH;
			}
			if (Math.abs(w) > Cannon.MAX_WIDTH) {
				if (w < 0) w = -Cannon.MAX_WIDTH;
				else w = Cannon.MAX_WIDTH;
			}

			vertices = new Array(4);
			vertices[0] = new b2Vec2(firstClickX, firstClickY);
			vertices[1] = new b2Vec2(firstClickX + w, firstClickY);
			vertices[2] = new b2Vec2(firstClickX + w, firstClickY + w / 2);
			vertices[3] = new b2Vec2(firstClickX, firstClickY + w / 2);
			if (this.drawColours) this.m_fillAlpha = ControllerGameGlobals.defaultO / 255.0;
			this.DrawSolidCannon(vertices, 4, (this.drawColours ? new b2Color(ControllerGameGlobals.defaultR / 255.0, ControllerGameGlobals.defaultG / 255.0, ControllerGameGlobals.defaultB / 255.0) : Draw.s_selectedColor));
		} else if (creatingItem == ControllerGameGlobals.NEW_TRIANGLE && actionStep == 1) {
			var x2:number = mouseX;
			var y2:number = mouseY;

			var sideLen:number = Util.GetDist(firstClickX, firstClickY, mouseX, mouseY);
			var angle:number;
			if (sideLen < Triangle.MIN_SIDE_LENGTH) {
				angle = Math.atan2(firstClickY - mouseY, mouseX - firstClickX);
				x2 = firstClickX + Triangle.MIN_SIDE_LENGTH * Math.cos(angle);
				y2 = firstClickY - Triangle.MIN_SIDE_LENGTH * Math.sin(angle);
			} else if (sideLen > Triangle.MAX_SIDE_LENGTH) {
				angle = Math.atan2(firstClickY - mouseY, mouseX - firstClickX);
				x2 = firstClickX + Triangle.MAX_SIDE_LENGTH * Math.cos(angle);
				y2 = firstClickY - Triangle.MAX_SIDE_LENGTH * Math.sin(angle);
			}
			this.DrawSegment(new b2Vec2(firstClickX, firstClickY), new b2Vec2(x2, y2), (this.drawColours ? new b2Color(0.0666, 0.0666, 0.0666) : Draw.s_selectedColor));
		} else if (creatingItem == ControllerGameGlobals.NEW_TRIANGLE && actionStep == 2) {
			var sideLen1:number = Util.GetDist(firstClickX, firstClickY, mouseX, mouseY);
			var sideLen2:number = Util.GetDist(secondClickX, secondClickY, mouseX, mouseY);
			var sideLen0:number = Util.GetDist(firstClickX, firstClickY, secondClickX, secondClickY);
			var angle1:number = Util.NormalizeAngle(Math.acos((sideLen0 * sideLen0 + sideLen1 * sideLen1 - sideLen2 * sideLen2) / (2 * sideLen0 * sideLen1)));
			var angle2:number = Util.NormalizeAngle(Math.acos((sideLen0 * sideLen0 + sideLen2 * sideLen2 - sideLen1 * sideLen1) / (2 * sideLen0 * sideLen2)));
			var angle3:number = Util.NormalizeAngle(Math.acos((sideLen1 * sideLen1 + sideLen2 * sideLen2 - sideLen0 * sideLen0) / (2 * sideLen1 * sideLen2)));

			if ((sideLen1 <= Triangle.MAX_SIDE_LENGTH) && sideLen1 >= Triangle.MIN_SIDE_LENGTH && (sideLen2 <= Triangle.MAX_SIDE_LENGTH) && sideLen2 >= Triangle.MIN_SIDE_LENGTH && angle1 >= Triangle.MIN_TRIANGLE_ANGLE && angle2 >= Triangle.MIN_TRIANGLE_ANGLE && angle3 >= Triangle.MIN_TRIANGLE_ANGLE) {
				vertices = new Array(3);
				vertices[0] = new b2Vec2(firstClickX, firstClickY);
				vertices[1] = new b2Vec2(secondClickX, secondClickY);
				vertices[2] = new b2Vec2(mouseX, mouseY);
				if (this.drawColours) this.m_fillAlpha = ControllerGameGlobals.defaultO / 255.0;
				this.DrawSolidPolygon(vertices, 3, (this.drawColours ? new b2Color(ControllerGameGlobals.defaultR / 255.0, ControllerGameGlobals.defaultG / 255.0, ControllerGameGlobals.defaultB / 255.0) : Draw.s_selectedColor));
			} else {
				this.DrawSegment(new b2Vec2(firstClickX, firstClickY), new b2Vec2(secondClickX, secondClickY), (this.drawColours ? new b2Color(0.0666, 0.0666, 0.0666) : Draw.s_selectedColor));
			}
		} else if (creatingItem == ControllerGameGlobals.NEW_FIXED_JOINT || creatingItem == ControllerGameGlobals.NEW_REVOLUTE_JOINT || creatingItem == ControllerGameGlobals.NEW_PRISMATIC_JOINT || creatingItem == ControllerGameGlobals.FINALIZING_JOINT) {
			this.DrawCircle(new b2Vec2(mouseX, mouseY), 0.075 * 30 / this.m_drawScale, Draw.s_selectedColor);
			this.DrawCircle(new b2Vec2(mouseX, mouseY), 0.15 * 30 / this.m_drawScale, Draw.s_selectedColor);
			if (creatingItem == ControllerGameGlobals.NEW_PRISMATIC_JOINT && actionStep == 1) {
				this.DrawCircle(new b2Vec2(firstClickX, firstClickY), 0.075 * 30 / this.m_drawScale, Draw.s_selectedColor);
				this.DrawCircle(new b2Vec2(firstClickX, firstClickY), 0.15 * 30 / this.m_drawScale, Draw.s_selectedColor);
				this.DrawSegment(new b2Vec2(firstClickX, firstClickY), new b2Vec2(mouseX, mouseY), Draw.s_selectedColor);
			}
		} else if (creatingItem == ControllerGameGlobals.BOX_SELECTING || (creatingItem == ControllerGameGlobals.NEW_TEXT && actionStep == 1) || (creatingItem == ControllerGameGlobals.DRAWING_BOX && actionStep == 1) || (creatingItem == ControllerGameGlobals.DRAWING_BUILD_BOX && actionStep == 1)) {
			vertices = new Array(4);
			vertices[0] = new b2Vec2(firstClickX, firstClickY);
			vertices[1] = new b2Vec2(firstClickX, mouseY);
			vertices[2] = new b2Vec2(mouseX, mouseY);
			vertices[3] = new b2Vec2(mouseX, firstClickY);
			if (this.drawColours) this.m_fillAlpha = 0.5;
			this.DrawSolidPolygon(vertices, 4, new b2Color(0.8, 0.5, 0.5));
		} else if (creatingItem == ControllerGameGlobals.NEW_THRUSTERS) {
			this.DrawCircle(new b2Vec2(mouseX, mouseY), 0.075 * 30 / this.m_drawScale, Draw.s_selectedColor);
			this.DrawCircle(new b2Vec2(mouseX, mouseY), 0.15 * 30 / this.m_drawScale, Draw.s_selectedColor);
		} else if (creatingItem == ControllerGameGlobals.DRAWING_HORIZONTAL_LINE && actionStep == 1) {
			this.DrawSegment(new b2Vec2(firstClickX, firstClickY), new b2Vec2(mouseX, firstClickY), new b2Color(0.0666, 0.0666, 0.0666));
		} else if (creatingItem == ControllerGameGlobals.DRAWING_VERTICAL_LINE && actionStep == 1) {
			this.DrawSegment(new b2Vec2(firstClickX, firstClickY), new b2Vec2(firstClickX, mouseY), new b2Color(0.0666, 0.0666, 0.0666));
		}
	}
}
