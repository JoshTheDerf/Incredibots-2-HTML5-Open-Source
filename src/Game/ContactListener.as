package Game
{
	import Box2D.Dynamics.b2ContactListener;
	import Box2D.Collision.b2ContactPoint;

	public class ContactListener extends b2ContactListener
	{
		private var cont:ControllerGame;
		
		public function ContactListener(contr:ControllerGame) {
			cont = contr;
		}
		
		/// Called when a contact point is added. This includes the geometry
		/// and the forces.
		public override function Add(point:b2ContactPoint):void {
			cont.ContactAdded(point);
		}
	}
}