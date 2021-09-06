import { b2CircleShape, b2Contact, b2PolygonShape, b2Transform, b2Vec2 } from "@box2d/core";
import { Part, ShapePart } from "../imports";

export class Condition {
  public name: String;
  public subject: number;
  public object: number;

  public minX: number;
  public maxX: number;
  public minY: number;
  public maxY: number;

  public shape1: ShapePart = null;
  public shape1Index: number = -1;
  public shape2: ShapePart = null;
  public shape2Index: number = -1;

  public isSatisfied: boolean = false;

  constructor(n: String, s: number, o: number) {
    this.name = n;
    this.subject = s;
    this.object = o;
  }

  public Update(parts: Array<any>, cannonballs: Array<any>): void {
    var minShapeX: number = Number.MAX_VALUE,
      maxShapeX: number = -Number.MAX_VALUE,
      minShapeY: number = Number.MAX_VALUE,
      maxShapeY: number = -Number.MAX_VALUE;
    if (this.subject == 0) {
      if (this.shape1.GetShape() instanceof b2CircleShape) {
        var circle: b2CircleShape = this.shape1.GetShape() as b2CircleShape;
        var center = new b2Vec2()
        b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), circle.m_p, center);
        minShapeX = center.x - circle.m_radius;
        maxShapeX = center.x + circle.m_radius;
        minShapeY = center.y - circle.m_radius;
        maxShapeY = center.y + circle.m_radius;
      } else if (this.shape1.GetShape() instanceof b2PolygonShape) {
        var poly: b2PolygonShape = this.shape1.GetShape() as b2PolygonShape;
        var vertexCount: number = poly.m_count;
        var localVertices: Array<any> = poly.m_vertices;

        for (i = 0; i < vertexCount; i++) {
          const vertex = new b2Vec2()
          b2Transform.MultiplyVec2(this.shape1.GetBody().GetTransform(), localVertices[i], vertex)
          if (vertex.x < minShapeX) minShapeX = vertex.x;
          if (vertex.x > maxShapeX) maxShapeX = vertex.x;
          if (vertex.y < minShapeY) minShapeY = vertex.y;
          if (vertex.y > maxShapeY) maxShapeY = vertex.y;
        }
      }
      if (this.object == 0) {
        this.isSatisfied =
          minShapeX > this.minX && maxShapeX < this.maxX && minShapeY > this.minY && maxShapeY < this.maxY;
      } else if (this.object == 1) {
        this.isSatisfied = maxShapeY < this.minY;
      } else if (this.object == 2) {
        this.isSatisfied = minShapeY > this.maxY;
      } else if (this.object == 3) {
        this.isSatisfied = maxShapeX < this.minX;
      } else if (this.object == 4) {
        this.isSatisfied = minShapeX > this.maxX;
      } else if (this.object == 5) {
        this.isSatisfied = false;
      }
    } else if (this.subject == 1) {
      parts = parts.filter(this.PartIsntStatic);
      if (this.object < 5) {
        this.isSatisfied = false;
        for (var i: number = 0; i < parts.length; i++) {
          (minShapeX = Number.MAX_VALUE),
            (maxShapeX = -Number.MAX_VALUE),
            (minShapeY = Number.MAX_VALUE),
            (maxShapeY = -Number.MAX_VALUE);
          if (parts[i].GetShape() instanceof b2CircleShape) {
            circle = parts[i].GetShape() as b2CircleShape;
            var center = new b2Vec2()
            b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), circle.m_p, center);
            minShapeX = center.x - circle.m_radius;
            maxShapeX = center.x + circle.m_radius;
            minShapeY = center.y - circle.m_radius;
            maxShapeY = center.y + circle.m_radius;
          } else if (parts[i].GetShape() instanceof b2PolygonShape) {
            poly = parts[i].GetShape() as b2PolygonShape;
            vertexCount = poly.m_count;
            localVertices = poly.m_vertices;

            for (var j: number = 0; j < vertexCount; j++) {
              const vertex = new b2Vec2()
              b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), localVertices[j], vertex)
              if (vertex.x < minShapeX) minShapeX = vertex.x;
              if (vertex.x > maxShapeX) maxShapeX = vertex.x;
              if (vertex.y < minShapeY) minShapeY = vertex.y;
              if (vertex.y > maxShapeY) maxShapeY = vertex.y;
            }
          }
          if (this.object == 0) {
            if (minShapeX > this.minX && maxShapeX < this.maxX && minShapeY > this.minY && maxShapeY < this.maxY)
              this.isSatisfied = true;
          } else if (this.object == 1) {
            if (maxShapeY < this.minY) this.isSatisfied = true;
          } else if (this.object == 2) {
            if (minShapeY > this.maxY) this.isSatisfied = true;
          } else if (this.object == 3) {
            if (maxShapeX < this.minX) this.isSatisfied = true;
          } else if (this.object == 4) {
            if (minShapeX > this.maxX) this.isSatisfied = true;
          }
        }
        for (i = 0; i < cannonballs.length; i++) {
          circle = cannonballs[i].GetShapeList() as b2CircleShape;
          const center = new b2Vec2()
          b2Transform.MultiplyVec2(cannonballs[i].GetTransform(), circle.m_p, center);
          minShapeX = center.x - circle.m_radius;
          maxShapeX = center.x + circle.m_radius;
          minShapeY = center.y - circle.m_radius;
          maxShapeY = center.y + circle.m_radius;
          if (this.object == 0) {
            if (minShapeX > this.minX && maxShapeX < this.maxX && minShapeY > this.minY && maxShapeY < this.maxY)
              this.isSatisfied = true;
          } else if (this.object == 1) {
            if (maxShapeY < this.minY) this.isSatisfied = true;
          } else if (this.object == 2) {
            if (minShapeY > this.maxY) this.isSatisfied = true;
          } else if (this.object == 3) {
            if (maxShapeX < this.minX) this.isSatisfied = true;
          } else if (this.object == 4) {
            if (minShapeX > this.maxX) this.isSatisfied = true;
          }
        }
      } else if (this.object == 5) {
        this.isSatisfied = false;
      }
    } else if (this.subject == 2) {
      parts = parts.filter(this.PartIsEditable).filter(this.PartIsntStatic);
      if (parts.length == 0) {
        this.isSatisfied = false;
        return;
      }
      if (this.object < 5) {
        this.isSatisfied = true;
        for (i = 0; i < parts.length; i++) {
          (minShapeX = Number.MAX_VALUE),
            (maxShapeX = -Number.MAX_VALUE),
            (minShapeY = Number.MAX_VALUE),
            (maxShapeY = -Number.MAX_VALUE);
          if (parts[i].GetShape() instanceof b2CircleShape) {
            circle = parts[i].GetShape() as b2CircleShape;
            var center = new b2Vec2()
            b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), circle.m_p, center);
            minShapeX = center.x - circle.m_radius;
            maxShapeX = center.x + circle.m_radius;
            minShapeY = center.y - circle.m_radius;
            maxShapeY = center.y + circle.m_radius;
          } else if (parts[i].GetShape() instanceof b2PolygonShape) {
            poly = parts[i].GetShape() as b2PolygonShape;
            vertexCount = poly.m_count;
            localVertices = poly.m_vertices;

            for (j = 0; j < vertexCount; j++) {
              const vertex = new b2Vec2()
              b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), localVertices[j], vertex)
              if (vertex.x < minShapeX) minShapeX = vertex.x;
              if (vertex.x > maxShapeX) maxShapeX = vertex.x;
              if (vertex.y < minShapeY) minShapeY = vertex.y;
              if (vertex.y > maxShapeY) maxShapeY = vertex.y;
            }
          }
          if (this.object == 0) {
            if (minShapeX < this.minX || maxShapeX > this.maxX || minShapeY < this.minY || maxShapeY > this.maxY)
              this.isSatisfied = false;
          } else if (this.object == 1) {
            if (maxShapeY > this.minY) this.isSatisfied = false;
          } else if (this.object == 2) {
            if (minShapeY < this.maxY) this.isSatisfied = false;
          } else if (this.object == 3) {
            if (maxShapeX > this.minX) this.isSatisfied = false;
          } else if (this.object == 4) {
            if (minShapeX < this.maxX) this.isSatisfied = false;
          }
        }
      } else if (this.object == 5) {
        this.isSatisfied = false;
      }
    } else if (this.subject == 3) {
      parts = parts.filter(this.PartIsntEditable).filter(this.PartIsntStatic);
      if (this.object < 5) {
        this.isSatisfied = false;
        for (i = 0; i < parts.length; i++) {
          (minShapeX = Number.MAX_VALUE),
            (maxShapeX = -Number.MAX_VALUE),
            (minShapeY = Number.MAX_VALUE),
            (maxShapeY = -Number.MAX_VALUE);
          if (parts[i].GetShape() instanceof b2CircleShape) {
            circle = parts[i].GetShape() as b2CircleShape;
            var center = new b2Vec2()
            b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), circle.m_p, center);
            minShapeX = center.x - circle.m_radius;
            maxShapeX = center.x + circle.m_radius;
            minShapeY = center.y - circle.m_radius;
            maxShapeY = center.y + circle.m_radius;
          } else if (parts[i].GetShape() instanceof b2PolygonShape) {
            poly = parts[i].GetShape() as b2PolygonShape;
            vertexCount = poly.m_count;
            localVertices = poly.m_vertices;

            for (j = 0; j < vertexCount; j++) {
              const vertex = new b2Vec2()
              b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), localVertices[j], vertex)
              if (vertex.x < minShapeX) minShapeX = vertex.x;
              if (vertex.x > maxShapeX) maxShapeX = vertex.x;
              if (vertex.y < minShapeY) minShapeY = vertex.y;
              if (vertex.y > maxShapeY) maxShapeY = vertex.y;
            }
          }
          if (this.object == 0) {
            if (minShapeX > this.minX && maxShapeX < this.maxX && minShapeY > this.minY && maxShapeY < this.maxY)
              this.isSatisfied = true;
          } else if (this.object == 1) {
            if (maxShapeY < this.minY) this.isSatisfied = true;
          } else if (this.object == 2) {
            if (minShapeY > this.maxY) this.isSatisfied = true;
          } else if (this.object == 3) {
            if (maxShapeX < this.minX) this.isSatisfied = true;
          } else if (this.object == 4) {
            if (minShapeX > this.maxX) this.isSatisfied = true;
          }
        }
      } else if (this.object == 5) {
        this.isSatisfied = false;
      }
    } else {
      if (this.object < 5) {
        this.isSatisfied = false;
        for (i = 0; i < cannonballs.length; i++) {
          circle = cannonballs[i].GetShapeList() as b2CircleShape;
          var center = new b2Vec2()
          b2Transform.MultiplyVec2(parts[i].GetBody().GetTransform(), circle.m_p, center);
          minShapeX = center.x - circle.m_radius;
          maxShapeX = center.x + circle.m_radius;
          minShapeY = center.y - circle.m_radius;
          maxShapeY = center.y + circle.m_radius;
          if (this.object == 0) {
            if (minShapeX > this.minX && maxShapeX < this.maxX && minShapeY > this.minY && maxShapeY < this.maxY)
              this.isSatisfied = true;
          } else if (this.object == 1) {
            if (maxShapeY < this.minY) this.isSatisfied = true;
          } else if (this.object == 2) {
            if (minShapeY > this.maxY) this.isSatisfied = true;
          } else if (this.object == 3) {
            if (maxShapeX < this.minX) this.isSatisfied = true;
          } else if (this.object == 4) {
            if (minShapeX > this.maxX) this.isSatisfied = true;
          }
        }
      }
    }
  }

  public ContactAdded(contact: b2Contact, parts: Array<any>, cannonballs: Array<any>): void {
    const shapeA = contact.GetFixtureA().GetShape()
    const shapeB = contact.GetFixtureB().GetShape()
    if (this.object == 5 || this.object == 6) {
      if (this.subject == 0) {
        if (
          (shapeA == this.shape1.GetShape() && shapeB == this.shape2.GetShape()) ||
          (shapeA == this.shape2.GetShape() && shapeB == this.shape1.GetShape())
        )
          this.isSatisfied = true;
      } else if (this.subject == 1) {
        if (shapeA == this.shape2.GetShape() || shapeB == this.shape2.GetShape()) this.isSatisfied = true;
      } else if (this.subject == 2) {
        if (shapeA == this.shape2.GetShape() || shapeB == this.shape2.GetShape()) {
          parts = parts.filter(this.PartIsEditable);
          for (var i: number = 0; i < parts.length; i++) {
            if (shapeA == parts[i].GetShape() || shapeB == parts[i].GetShape()) this.isSatisfied = true;
          }
        }
      } else if (this.subject == 3) {
        if (shapeA == this.shape2.GetShape() || shapeB == this.shape2.GetShape()) {
          parts = parts.filter(this.PartIsntEditable);
          for (i = 0; i < parts.length; i++) {
            if (shapeA == parts[i].GetShape() || shapeB == parts[i].GetShape()) this.isSatisfied = true;
          }
        }
      } else {
        if (shapeA == this.shape2.GetShape() || shapeB == this.shape2.GetShape()) {
          for (i = 0; i < cannonballs.length; i++) {
            if (shapeA == cannonballs[i].GetShapeList() || shapeB == cannonballs[i].GetShapeList()) {
              this.isSatisfied = true;
            }
          }
        }
      }
    }
  }

  private PartIsntStatic(p: Part, index: number, array: Array<any>): boolean {
    return p instanceof ShapePart && !p.isStatic;
  }

  private PartIsEditable(p: Part, index: number, array: Array<any>): boolean {
    return p instanceof ShapePart && p.isEditable;
  }

  private PartIsntEditable(p: Part, index: number, array: Array<any>): boolean {
    return p instanceof ShapePart && !p.isEditable;
  }
}
