import { b2ContactFilter, b2Fixture } from "@box2d/core";

export class ContactFilter extends b2ContactFilter
{
	constructor() {
		super()
	}

	public ShouldCollide(fixture1:b2Fixture, fixture2:b2Fixture):boolean {
		if ((fixture1.GetUserData() && fixture1.GetUserData().isSandbox) || (fixture2.GetUserData() && fixture2.GetUserData().isSandbox)) return true;

		if (fixture1.GetUserData() && fixture2.GetUserData() && !fixture1.GetUserData().collide && (!fixture1.GetUserData().editable || fixture2.GetUserData().editable) && (fixture1.GetUserData().isPiston == -1 || fixture2.GetUserData().isPiston == -1)) return false;
		if (fixture1.GetUserData() && fixture2.GetUserData() && !fixture2.GetUserData().collide && (!fixture2.GetUserData().editable || fixture1.GetUserData().editable) && (fixture1.GetUserData().isPiston == -1 || fixture2.GetUserData().isPiston == -1)) return false;

		if (fixture1.GetUserData() && fixture2.GetUserData() && fixture1.GetUserData().isPiston != -1 && fixture2.GetUserData().isPiston != -1 && !fixture1.GetUserData().collide && (!fixture1.GetUserData().editable || fixture2.GetUserData().editable)) return false;
		if (fixture1.GetUserData() && fixture2.GetUserData() && fixture1.GetUserData().isPiston != -1 && fixture2.GetUserData().isPiston != -1 && !fixture2.GetUserData().collide && (!fixture2.GetUserData().editable || fixture1.GetUserData().editable)) return false;

		if (fixture1.GetUserData() && fixture2.GetUserData() && fixture1.GetUserData().isPiston != -1 && fixture2.GetUserData().isPiston != -1 && fixture1.GetUserData().isPiston == fixture2.GetUserData().isPiston && fixture1.GetBody() != fixture2.GetBody() && fixture1.m_filter.groupIndex == fixture2.m_filter.groupIndex) return true;

		return super.ShouldCollide(fixture1, fixture2);
	}
}
