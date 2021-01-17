import { Texture } from "pixi.js";

export class Gradient {
  static getLinearGradientTexture([startColor, endColor]: Array<string>): Texture {
    const quality = 512;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = quality;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, quality);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, quality);

    return Texture.from(canvas);
  }
}
