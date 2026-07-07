import { b2ContactFilter } from "../Box2D";

export class ContactFilter extends b2ContactFilter {
  constructor() {
    super();
  }

  public ShouldCollide(shape1: any, shape2: any):boolean {
    if ((shape1.GetUserData() && shape1.GetUserData().isSandbox) || (shape2.GetUserData() && shape2.GetUserData().isSandbox)) return true;

    if (shape1.GetUserData() && shape2.GetUserData() && !shape1.GetUserData().collide && (!shape1.GetUserData().editable || shape2.GetUserData().editable) && (shape1.GetUserData().isPiston == -1 || shape2.GetUserData().isPiston == -1)) return false;
    if (shape1.GetUserData() && shape2.GetUserData() && !shape2.GetUserData().collide && (!shape2.GetUserData().editable || shape1.GetUserData().editable) && (shape1.GetUserData().isPiston == -1 || shape2.GetUserData().isPiston == -1)) return false;

    if (shape1.GetUserData() && shape2.GetUserData() && shape1.GetUserData().isPiston != -1 && shape2.GetUserData().isPiston != -1 && !shape1.GetUserData().collide && (!shape1.GetUserData().editable || shape2.GetUserData().editable)) return false;
    if (shape1.GetUserData() && shape2.GetUserData() && shape1.GetUserData().isPiston != -1 && shape2.GetUserData().isPiston != -1 && !shape2.GetUserData().collide && (!shape2.GetUserData().editable || shape1.GetUserData().editable)) return false;

    // NEW in Jaybit (ContactFilter.as:36-39): two shaft segments of the SAME
    // piston on different bodies never collide. The decompiled source gates
    // this on `Boolean(userData.isDestroyed)`, but PrismaticJoint.Init stores a
    // bound METHOD REFERENCE there (not a call), so the AS3 Boolean() coercion
    // is always true — the intended "only once the piston is destroyed" check
    // never took effect and CE's force-collide clause (same piston + same
    // groupIndex -> true) became dead code. We replicate the SHIPPED behavior
    // (spec §7.1 decision): the clause fires unconditionally and the dead
    // force-collide clause is dropped.
    if (shape1.GetUserData() && shape2.GetUserData() && shape1.GetUserData().isPiston != -1 && shape2.GetUserData().isPiston != -1 && shape1.GetUserData().isPiston == shape2.GetUserData().isPiston && shape1.GetBody() != shape2.GetBody()) return false;

    return super.ShouldCollide(shape1, shape2);
  }
}
