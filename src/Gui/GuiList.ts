import { Container, NineSlicePlane, Text, TextStyle } from "pixi.js";
import { Main, Resource } from '../imports';
import { Scrollbox } from "pixi-scrollbox";

export class GuiList extends Container {
  private background: NineSlicePlane;
  private scrollbox: Scrollbox;
  private textStyle: TextStyle;
  private _items: Array<any> = [];
  private _renderedItems: Array<any> = [];
  public selectedIndex: number|null = 0;

  get length() {
    return this._items.length
  }

  constructor(width: number, height: number, style: TextStyle) {
    super()
    this._width = width
    this._height = height
    this.textStyle = style

    this.scrollbox = new Scrollbox({
      boxWidth: width,
      boxHeight: height,
      interaction: Main.renderer.renderer.plugins.interaction,
      scrollbarForeground: 0xa08ed2,
      scrollbarBackground: 0xb7aae3
    })

    this.background = new NineSlicePlane(Resource.cGuiTextAreaBase, 50, 20, 50, 20);

    this.addChild(this.background)
    this.addChild(this.scrollbox)
    this.draw()
  }

  public clear() {
    this._items = []
    this.draw()
  }

  public push(item: any) {
    this._items.push(item)
    this.draw()
  }

  private draw() {
    this.scrollbox.boxWidth = this._width
    this.scrollbox.boxHeight = this._height
    this.scrollbox.update()

    this.background.width = this._width
    this.background.height = this._height

    const containerHeight = 20
    this.scrollbox.content.removeChildren()
    this._renderedItems = []
    this._renderedItems = this._items.map((item, index) => {
      const container = new Container()
      const background = new NineSlicePlane(index === this.selectedIndex ? Resource.cGuiListboxWideClick : Resource.cGuiListboxWideBase, 230, 10, 230, 10)
      const label = new Text(item.label)
      label.anchor.set(0, 0.5)
      label.x = 5
      label.y = 20 / 2
      label.style = this.textStyle
      background.width = this.width
      background.height = containerHeight

      container.interactive = true
      container.y = index * containerHeight
      container.addChild(background)
      container.addChild(label)

      container.on('mouseover', () => background.texture = Resource.cGuiListboxWideRoll)
      container.on('mouseout', () => background.texture = index === this.selectedIndex ? Resource.cGuiListboxWideClick : Resource.cGuiListboxWideBase)
      container.on('click', () => {
        this.selectedIndex = index
        this.draw()
      })
      return container
    })

    this._renderedItems.map(item => this.scrollbox.content.addChild(item))
  }
}
