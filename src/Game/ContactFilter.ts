import { b2Shape, b2ContactFilter, b2Fixture } from "@box2d/core";

export class ContactFilter extends b2ContactFilter
{
	constructor() {
		super()
	}

	public ShouldCollide(fixture1:b2Fixture, fixture2:b2Fixture):boolean {
		const userData1 = fixture1.GetBody().GetUserData()
		const userData2 = fixture2.GetBody().GetUserData()

		if ((userData1 && userData1.isSandbox) || (userData2 && userData2.isSandbox)) return true;

		if (userData1 && userData2 && !userData1.collide && (!userData1.editable || userData2.editable) && (userData1.isPiston == -1 || userData2.isPiston == -1)) return false;
		if (userData1 && userData2 && !userData2.collide && (!userData2.editable || userData1.editable) && (userData1.isPiston == -1 || userData2.isPiston == -1)) return false;

		if (userData1 && userData2 && userData1.isPiston != -1 && userData2.isPiston != -1 && !userData1.collide && (!userData1.editable || userData2.editable)) return false;
		if (userData1 && userData2 && userData1.isPiston != -1 && userData2.isPiston != -1 && !userData2.collide && (!userData2.editable || userData1.editable)) return false;

		if (userData1 && userData2 && userData1.isPiston != -1 && userData2.isPiston != -1 && userData1.isPiston == userData2.isPiston && fixture1.GetBody() != fixture2.GetBody() && fixture1.GetFilterData().groupIndex == fixture2.GetFilterData().groupIndex) return true;

		return super.ShouldCollide(fixture1, fixture2);
	}
}
