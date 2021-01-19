import { Texture } from "pixi.js";

export class Gradient {
  static getLinearGradientTexture([startColor, endColor]: Array<string>, length: number = 512, dir: string = 'to top'): Texture {
    const steps = length;
    const canvas = document.createElement("canvas");

    if (dir === 'to top' || dir === 'to bottom') {
      canvas.width = 1;
      canvas.height = steps;
    } else {
      canvas.width = steps;
      canvas.height = 1;
    }

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, steps);

    if (dir === 'to top' || dir === 'to right') {
      gradient.addColorStop(0, startColor);
      gradient.addColorStop(1, endColor);
    } else {
      gradient.addColorStop(0, endColor);
      gradient.addColorStop(1, startColor);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, steps);

    return Texture.from(canvas);
  }
}
