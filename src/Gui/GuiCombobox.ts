import PIXIsound from "pixi-sound";
import { Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { GuiComboboxItem, Main, Resource } from "../imports";
type Sound = PIXIsound.Sound;

type ComboBoxItem = {
  label: string;
};

const ComboBoxes: Array<GuiCombobox> = [];

export class GuiCombobox extends Container {
  private buttonOffset: boolean = false;

  public static rolloverSound: Sound = Resource.cRoll;
  public static clickSound: Sound = Resource.cClick;

  public label: Text = new Text("");
  public background: Sprite = new Sprite();
  public itemsTextStyle: TextStyle | null = null;
  public itemsContainer: Container;
  public itemsContainerBackground: Graphics;

  private upTexture: Texture;
  private overTexture: Texture;
  private downTexture: Texture;

  private _selectedIndex: number = 0;
  private _menuOpen: boolean = false;
  private items: Array<ComboBoxItem> = [];
  private itemsWidgets: Array<GuiComboboxItem> = [];

  set selectedIndex(value: number) {
    this._selectedIndex = value;
    this.itemsWidgets.forEach((widget, index) => {
      if (index === this._selectedIndex) {
        widget.selected = true;
        this.label.text = widget.text;
      } else {
        widget.selected = false;
      }
    });

    this.menuOpen = false;
    this.emit("change", this._selectedIndex);
  }

  get selectedIndex(): number {
    return this._selectedIndex;
  }

  set menuOpen(value: boolean) {
    this._menuOpen = value;
    this.zIndex = this._menuOpen ? 1000 : 0;
    this.itemsContainer.visible = this._menuOpen;
  }

  get menuOpen(): boolean {
    return this._menuOpen;
  }

  constructor(xPos: number, yPos: number, w: number, h: number) {
    super();
    this.width = w;
    this.height = h;
    this.x = xPos;
    this.y = yPos;
    this.zIndex = 1000;

    ComboBoxes.push(this);

    this.upTexture = Resource.cGuiComboboxBase;
    this.overTexture = Resource.cGuiComboboxRoll;
    this.downTexture = Resource.cGuiComboboxClick;

    this.itemsTextStyle = new TextStyle();
    this.itemsTextStyle.fontSize = 11;
    this.itemsTextStyle.fill = "#573D40";
    this.itemsTextStyle.fontFamily = Main.GLOBAL_FONT;
    this.itemsTextStyle.align = "left";

    this.width = w;
    this.height = h;
    this.position.set(xPos, yPos);
    this.buttonMode = true;
    this.interactive = true;

    this.background.texture = this.upTexture;
    this.background.width = w;
    this.background.height = h;
    this.addChild(this.background);

    this.label.text = "";
    this.label.style = this.itemsTextStyle;
    this.label.anchor.set(0, 0.5);
    this.label.x = 10;
    this.label.y = h / 2;
    this.addChild(this.label);

    this.itemsContainer = new Container();
    this.itemsContainer.x = 5;
    this.itemsContainer.width = w - 10;
    this.itemsContainer.height = h;
    this.itemsContainer.y = h;
    this.itemsContainer.visible = this._menuOpen;
    this.addChild(this.itemsContainer);

    this.itemsContainerBackground = new Graphics();
    this.itemsContainerBackground.height = h;
    this.itemsContainerBackground.beginFill(0x0000ff);
    this.itemsContainerBackground.drawRect(0, 0, w - 10, h);
    this.itemsContainerBackground.endFill();
    this.itemsContainer.addChild(this.itemsContainerBackground);

    this.on("click", (event: any) => {
      if (event.target !== this) return;

      this.openMenu();
      if (Main.enableSound) {
        GuiCombobox.clickSound.volume = 0.8;
        GuiCombobox.clickSound.play();
      }
    })
      .on("mousedown", (event: any) => {
        this.background.texture = this.downTexture;

        if (this.buttonOffset) return;
        this.x += 2;
        this.y += 2;
        this.buttonOffset = true;
      })
      .on("mouseover", (event: any) => {
        this.background.texture = this.overTexture;

        if (Main.enableSound) {
          GuiCombobox.rolloverSound.stop();
          GuiCombobox.rolloverSound.volume = 0.2;
          GuiCombobox.rolloverSound.play();
        }
      })
      .on("mouseout", (event: any) => {
        if (this.menuOpen) return;
        this.background.texture = this.upTexture;

        if (!this.buttonOffset) return;
        this.x -= 2;
        this.y -= 2;
        this.buttonOffset = false;
      });

    this.zIndex = 0;
  }

  addItem(item: ComboBoxItem) {
    this.items.push(item);

    this.label.text = this.items[this.selectedIndex].label;

    this.itemsContainer.removeChild(...this.itemsWidgets);
    this.itemsContainerBackground.height = this.items.length * 20;
    this.itemsWidgets = [];

    this.items.forEach((item, i) => {
      const itemWidget = new GuiComboboxItem(item.label, 0, i * 20, this.itemsContainer.width, 20);
      itemWidget.on("select", () => {
        this.selectedIndex = i;
      });
      this.itemsContainer.addChild(itemWidget);
      this.itemsWidgets.push(itemWidget);
    });
  }

  openMenu() {
    // Close all other combo boxes to avoid overlap.
    ComboBoxes.forEach((box) => {
      if (box === this) return;
      box.menuOpen = false;
    });
    this.menuOpen = !this.menuOpen;
  }
}
