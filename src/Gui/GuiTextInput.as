public class GuiTextInput extends TextInput
{
	private var baseSkin:BitmapAsset = GuiTextArea.textAreaBase();
	private var rollSkin:BitmapAsset = GuiTextArea.textAreaRoll();
	private var isMouseOver:Boolean = false;
	private var hasFocus:Boolean = false;

	public function GuiTextInput(xPos:Number, yPos:Number, w:Number, format:TextFormat = null)
	{
		focusEnabled = false;
		x = xPos;
		y = yPos;
		width = w;
		if (!format) format = new TextFormat();
		format.font = Main.GLOBAL_FONT;
		format.color = 0x4C3D57;
		setStyle("textFormat", format);
		setStyle("disabledTextFormat", format);
		setStyle("upSkin", baseSkin);
		setStyle("disabledSkin", GuiTextArea.textAreaDisabled());
		addEventListener(MouseEvent.MOUSE_OVER, mouseOver, false, 0, true);
		addEventListener(MouseEvent.MOUSE_OUT, mouseOut, false, 0, true);
		addEventListener(FocusEvent.FOCUS_IN, gotFocus, false, 0, true);
		addEventListener(FocusEvent.FOCUS_OUT, lostFocus, false, 0, true);
		addEventListener(ComponentEvent.ENTER, enterPressed, false, 0, true);
	}

	private function mouseOver(e:MouseEvent):void {
		if (enabled && editable) {
			e.currentTarget.setStyle("upSkin", rollSkin);
			isMouseOver = true;
		}
	}

	private function mouseOut(e:MouseEvent):void {
		if (!hasFocus) e.currentTarget.setStyle("upSkin", baseSkin);
		isMouseOver = false;
	}

	private function gotFocus(e:Event):void {
		if (enabled && editable) {
			e.currentTarget.setStyle("upSkin", rollSkin);
			hasFocus = true;
		}
	}

	private function lostFocus(e:Event):void {
		if (!isMouseOver) e.currentTarget.setStyle("upSkin", baseSkin);
		hasFocus = false;
	}

	private function enterPressed(e:Event):void {
		stage.focus = null;
	}
}
