import { b2Mat22, b2Vec2 } from "../Box2D";

export class Util {
  public static Vector(x: number, y: number) {
    var vec = new b2Vec2();
    vec.x = x;
    vec.y = y;
    return vec;
  }

  public static RangedRandom(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  public static NearestInt(n: number): number {
    var decimalPart: number = n - Math.floor(n);
    if (decimalPart >= 0.5) return Math.floor(n) + 1;
    return Math.floor(n);
  }

  public static FormatDate(d: number): string {
    if (isNaN(d)) {
      return "Oct. 17, 2008";
    } else {
      var date: Date = new Date();
      date.setTime(d);
      const MONTHS: Array<any> = [
        "Jan.",
        "Feb.",
        "March",
        "April",
        "May",
        "June",
        "July",
        "Aug.",
        "Sept.",
        "Oct.",
        "Nov.",
        "Dec.",
      ];
      var month: string = MONTHS[date.getMonth()];
      var day: number = date.getDate();
      var year: number = date.getFullYear();
      return month + " " + day + ", " + year;
    }
  }

  // --- Jaybit material conversions (General/Util.as:33/:161/:146) ---
  // UI-scale 1..30 values -> Box2D fixture values. The defaults (friction 11,
  // restitution 7) map to 0.4 / 0.3 — CE's hardcoded values — so a
  // default-valued Jaybit shape is physically identical to a CE shape.

  /** Util.as:33 — friction 1..30 -> 0.15..0.875; default 11 -> 0.4. */
  public static ConvertFrictionToBox2D(friction: number): number {
    return (Math.max(1, Math.min(30, friction)) + 5) / 40;
  }

  /** Util.as:161 — restitution 1..30 -> 0.18..0.76; default 7 -> 0.3. */
  public static ConvertRestitutionToBox2D(restitution: number): number {
    return (Math.max(1, Math.min(30, restitution)) + 8) / 50;
  }

  /**
   * Util.as:146 — density 1..30 -> 0.6..3.5; default 15 -> 2.0. INTENTIONALLY
   * UNWIRED: our port deliberately keeps CE's unclamped (density + 5) / 10 in
   * the part Inits (the "CE FIX" comments) so legacy robots with out-of-range
   * densities keep their behavior. Kept only as a faithful reference for the
   * Jaybit clamped formula; nothing calls it.
   */
  public static ConvertDensityToBox2D(density: number): number {
    return (Math.max(1, Math.min(30, density)) + 5) / 10;
  }

  public static GetDist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
  }

  public static GetAngle(vec): number {
    return Math.atan2(vec.y, vec.x);
  }

  public static NormalizeAngle(angle: number): number {
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    while (angle < 0) angle += 2 * Math.PI;
    return angle;
  }

  public static Midpoint(p1, p2) {
    return new b2Vec2((p1.x + p2.x) / 2.0, (p1.y + p2.y) / 2.0);
  }

  public static HexColour(r: number, g: number, b: number): number {
    return b | (g << 8) | (r << 16);
  }

  public static HexColourString(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  }

  public static b2ColorToHex(color): number {
    return (color._b) | ((color._g) << 8) | ((color._r) << 16);
  }

  public static ObjectInArray(obj: Object, array: Array<any>): boolean {
    if (!array) return false;
    for (var i: number = 0; i < array.length; i++) {
      if (obj == array[i]) return true;
    }
    return false;
  }

  public static RemoveFromArray(obj: Object, array: Array<any>): Array<any> {
    var newArray: Array<any> = new Array();
    for (var i: number = 0; i < array.length; i++) {
      if (obj != array[i]) newArray.push(array[i]);
    }
    return newArray;
  }

  public static InsertIntoArray(obj: Object, array: Array<any>, index: number): Array<any> {
    var newArray: Array<any> = new Array();
    for (var i: number = 0; i < array.length; i++) {
      if (i == index) newArray.push(obj);
      newArray.push(array[i]);
    }
    if (i <= index) newArray.push(obj);
    return newArray;
  }

  public static RemoveDuplicates(array: Array<any>): Array<any> {
    var newArray: Array<any> = new Array();
    for (var i: number = 0; i < array.length; i++) {
      var foundDuplicate: boolean = false;
      for (var j: number = 0; j < i; j++) {
        if (array[i] == array[j]) {
          foundDuplicate = true;
          break;
        }
      }
      if (!foundDuplicate) newArray.push(array[i]);
    }
    return newArray;
  }

  public static SegmentsIntersect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): boolean {
    if ((x1 == x3 && y1 == y3) || (x1 == x4 && y1 == y4) || (x2 == x3 && y2 == y3) || (x2 == x4 && y2 == y4)) {
      return false;
    }

    if (Math.abs(x1 - x2) < 0.00001) {
      // avoids divide by zero errors
      x2 += 0.0001;
    }
    var m1: number = (y2 - y1) / (x2 - x1);

    if (Math.abs(x3 - x4) < 0.00001) {
      // avoids divide by zero errors
      x4 += 0.0001;
    }
    var m2: number = (y4 - y3) / (x4 - x3);

    if (m1 == m2) return false;

    // compute slope and y-intercept of both lines, then set y1 = y2, or m1x + b1 = m2x + b2, or x = (b2 - b1) / (m1 - m2)
    var b1: number = y1 - x1 * m1;
    var b2: number = y3 - x3 * m2;
    var intersectX: number = (b2 - b1) / (m1 - m2);

    if (
      ((intersectX >= x1 && intersectX <= x2) || (intersectX <= x1 && intersectX >= x2)) &&
      ((intersectX >= x3 && intersectX <= x4) || (intersectX <= x3 && intersectX >= x4))
    ) {
      return true;
    }
    return false;
  }

  public static DistanceFromPointToLine(point, linePoint, lineVect): number {
    lineVect.Normalize();
    var r = new b2Vec2(linePoint.x - point.x, linePoint.y - point.y);
    return Math.abs(Util.Determinant(new b2Mat22(0, lineVect, r)));
  }

  public static Determinant(matrix): number {
    return matrix.col1.x * matrix.col2.y - matrix.col1.y * matrix.col2.x;
  }
}
