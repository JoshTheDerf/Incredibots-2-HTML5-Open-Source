import { b2ContactFilter } from "../Box2D";

export class ContactFilter extends b2ContactFilter {
  constructor() {
    super();
  }

  public ShouldCollide(shape1, shape2):boolean {
    if ((shape1.GetUserData() && shape1.GetUserData().isSandbox) || (shape2.GetUserData() && shape2.GetUserData().isSandbox)) return true;

    if (shape1.GetUserData() && shape2.GetUserData() && !shape1.GetUserData().collide && (!shape1.GetUserData().editable || shape2.GetUserData().editable) && (shape1.GetUserData().isPiston == -1 || shape2.GetUserData().isPiston == -1)) return false;
    if (shape1.GetUserData() && shape2.GetUserData() && !shape2.GetUserData().collide && (!shape2.GetUserData().editable || shape1.GetUserData().editable) && (shape1.GetUserData().isPiston == -1 || shape2.GetUserData().isPiston == -1)) return false;

    if (shape1.GetUserData() && shape2.GetUserData() && shape1.GetUserData().isPiston != -1 && shape2.GetUserData().isPiston != -1 && !shape1.GetUserData().collide && (!shape1.GetUserData().editable || shape2.GetUserData().editable)) return false;
    if (shape1.GetUserData() && shape2.GetUserData() && shape1.GetUserData().isPiston != -1 && shape2.GetUserData().isPiston != -1 && !shape2.GetUserData().collide && (!shape2.GetUserData().editable || shape1.GetUserData().editable)) return false;

    if (shape1.GetUserData() && shape2.GetUserData() && shape1.GetUserData().isPiston != -1 && shape2.GetUserData().isPiston != -1 && shape1.GetUserData().isPiston == shape2.GetUserData().isPiston && shape1.GetBody() != shape2.GetBody() && shape1.m_filter.groupIndex == shape2.m_filter.groupIndex) return true;

    return super.ShouldCollide(shape1, shape2);
  }
}
