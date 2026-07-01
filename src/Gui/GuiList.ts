import { Container, Graphics, NineSlicePlane, Text, TextStyle } from "pixi.js";
import { Resource } from "../Game/Graphics/Resource"

// Minimal pixi-8-native replacement for the abandoned `pixi-scrollbox`-based
// list. A masked content Container is scrolled by mouse wheel; each item is a
// clickable row that updates selectedIndex. Preserves the surface the legacy
// Gui uses: length, clear(), push(), selectedIndex.
export class GuiList extends Container {
  private background: NineSlicePlane;
  private content: Container;
  private mask_: Graphics;
  private textStyle: TextStyle;
  private _items: Array<any> = [];
  private _renderedItems: Array<any> = [];
  private _boxWidth: number;
  private _boxHeight: number;
  private _scrollY: number = 0;
  public selectedIndex: number | null = 0;

  get length() {
    return this._items.length
  }

  constructor(width: number, height: number, style: TextStyle) {
    super()
    this._boxWidth = width
    this._boxHeight = height
    this.textStyle = style

    this.background = new NineSlicePlane(Resource.cGuiTextAreaBase, 50, 20, 50, 20);
    this.background.width = width;
    this.background.height = height;
    this.addChild(this.background)

    this.content = new Container();
    this.addChild(this.content);

    this.mask_ = new Graphics();
    this.mask_.rect(0, 0, width, height).fill(0xffffff);
    this.addChild(this.mask_);
    this.content.mask = this.mask_;

    this.eventMode = "static";
    this.on("wheel", (event: any) => {
      const delta = event.deltaY ?? (event.nativeEvent && event.nativeEvent.deltaY) ?? 0;
      this._scrollY = Math.min(0, this._scrollY - delta);
      const maxScroll = Math.max(0, this._items.length * 20 - this._boxHeight);
      if (this._scrollY < -maxScroll) this._scrollY = -maxScroll;
      this.content.y = this._scrollY;
    });

    this.draw()
  }

  public clear() {
    this._items = []
    this._scrollY = 0
    this.content.y = 0
    this.draw()
  }

  public push(item: any) {
    this._items.push(item)
    this.draw()
  }

  private draw() {
    this.background.width = this._boxWidth
    this.background.height = this._boxHeight
    this.mask_.clear();
    this.mask_.rect(0, 0, this._boxWidth, this._boxHeight).fill(0xffffff);

    const containerHeight = 20
    this.content.removeChildren()
    this._renderedItems = this._items.map((item, index) => {
      const row = new Container()
      const background = new NineSlicePlane(index === this.selectedIndex ? Resource.cGuiListboxWideClick : Resource.cGuiListboxWideBase, 230, 10, 230, 10)
      const label = new Text({ text: item.label, style: this.textStyle })
      label.anchor.set(0, 0.5)
      label.x = 5
      label.y = 20 / 2
      background.width = this._boxWidth
      background.height = containerHeight

      row.eventMode = "static"
      row.cursor = "pointer"
      row.y = index * containerHeight
      row.addChild(background)
      row.addChild(label)

      row.on('mouseover', () => background.texture = Resource.cGuiListboxWideRoll)
      row.on('mouseout', () => background.texture = index === this.selectedIndex ? Resource.cGuiListboxWideClick : Resource.cGuiListboxWideBase)
      row.on('pointertap', () => {
        this.selectedIndex = index
        this.draw()
      })
      return row
    })

    this._renderedItems.map(item => this.content.addChild(item))
  }
}
