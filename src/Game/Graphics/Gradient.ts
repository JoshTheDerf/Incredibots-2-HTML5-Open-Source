import { Texture } from 'pixi.js'

export class Gradient {
  static getLinearGradientTexture([startColor, endColor]: Array<string>): Texture {
    const quality = 512
    const canvas = document.createElement('canvas')
    canvas.width = quality;
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, quality, 0)
    gradient.addColorStop(0, startColor)
    gradient.addColorStop(1, endColor)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, quality, 1)

    return Texture.from(canvas)
  }
}
