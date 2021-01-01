import { b2Vec2 } from "@box2d/core";
import { Container, Graphics, Sprite } from "pixi.js";
import { Util } from "../../General/Util";
import { Controller } from "../Controller";
import { ControllerMainMenu } from "../ControllerMainMenu";
import { SandboxSettings } from "../SandboxSettings";
import { Gradient } from "./Gradient";
import { Resource } from "./Resource";

export class Sky
{
  private static topColours = ['#43B0F7', '#171717', '#292935', '#22243C', '#BE4A3C' /*#DD8163*/ /*#C2603C*/ , /*#58ACB4*/ /*#5072BC*/ '#4790EC'];
  private static bottomColours = ['#8ACEF7', '#353738', '#48475F', '#40457E', '#EB7A76' /*#EDAD8D*/ /*#D7A354*/ , /*#E47B4C*/ /*#E1A64C*/ '#EC8D66'];

  private cont:Controller;
  private skyType:number;
  private numClouds:number;
  private sky:Sprite;
  private sClouds:Array<any> = new Array();
  private cloudPositions:Array<any> = new Array();
  private cloudVelocities:Array<any> = new Array();
  private starRadii:Array<any> = new Array();

  public lastCloudIndex:number;

  constructor(contr:Controller, type:number, r:number = 0, g:number = 0, b:number = 0)
  {
    this.cont = contr;
    this.skyType = type;

    this.sky = new Container();

    const gradientSprite = new Sprite(Gradient.getLinearGradientTexture(
      type == SandboxSettings.BACKGROUND_SOLID_COLOUR ? [Util.HexColourString(r, g, b), Util.HexColourString(r, g, b)] : [Sky.topColours[type], Sky.bottomColours[type]]
      ))
      gradientSprite.position.set(0, 0)
      gradientSprite.width = 800
      gradientSprite.height = 600
      this.sky.addChild(gradientSprite)
      this.cont.addChild(this.sky)

      this.lastCloudIndex = this.cont.getChildIndex(this.sky);

      this.numClouds = 0;
      if (type == 0) {
        this.numClouds = Math.min((this.cont.GetMaxX() - this.cont.GetMinX()) / 10.0, 15);
        for (var i:number = 0; i < this.numClouds; i++) {
          var cloud:Sprite = new Sprite();
          var rand:number = Math.random() * 10;
          if (rand == 0) cloud.texture = Resource.cCloud0;
          if (rand == 1) cloud.texture = Resource.cCloud1;
          if (rand == 2) cloud.texture = Resource.cCloud2;
          if (rand == 3) cloud.texture = Resource.cCloud3;
          if (rand == 4) cloud.texture = Resource.cCloud4;
          if (rand == 5) cloud.texture = Resource.cCloud5;
          if (rand == 6) cloud.texture = Resource.cCloud6;
          if (rand == 7) cloud.texture = Resource.cCloud7;
          if (rand == 8) cloud.texture = Resource.cCloud8;
          if (rand >= 9) cloud.texture = Resource.cCloud9;
          this.cont.addChild(cloud);
          this.lastCloudIndex = this.cont.getChildIndex(cloud);
          this.sClouds.push(cloud);
          this.cloudPositions.push(new b2Vec2(Util.RangedRandom(this.cont.GetMinX() - 5, this.cont.GetMaxX() + 5), Util.RangedRandom(-15, 6)));
          this.cloudVelocities.push(3 * Math.random() / 120.0 + 1.0 / 120.0);
        }
      } else if (type == 1) {
        var worldSize:number = this.cont.GetMaxX() - this.cont.GetMinX() + 10;
        if (this.cont instanceof ControllerMainMenu) worldSize *= 1.5;
        this.numClouds = (this.cont.GetMaxX() - this.cont.GetMinX()) * 10;
        var stars = new Graphics();
        stars.beginFill(0xAEC9DA);
        stars.drawCircle(0, 0, 1);
        stars.drawCircle(worldSize * 90, 0, 1);
        stars.drawCircle(0, worldSize * 90, 1);
        stars.drawCircle(worldSize * 90, worldSize * 90, 1);
        stars.endFill();
    for (i = 0; i < this.numClouds; i++) {
          this.cloudPositions.push(Util.Vector(Util.RangedRandom(0, worldSize * 90), Util.RangedRandom(0, worldSize * 90)));
          this.cloudVelocities.push(0);
          this.starRadii.push(this.cont instanceof ControllerMainMenu ? Util.RangedRandom(3, 8) : Util.RangedRandom(2, 6));
          stars.beginFill(0xAEC9DA);
          stars.drawCircle(this.cloudPositions[i].x, this.cloudPositions[i].y, this.starRadii[i]);
          stars.endFill();
        }
        this.cont.addChild(stars);
        this.lastCloudIndex = this.cont.getChildIndex(stars);
        this.sClouds.push(stars);
      }
      this.Update(true, true);
    }

    public Update (hasZoomed:boolean, hasPanned:boolean):void {
      if (hasZoomed) {
        if (this.skyType == 0) {
          for (var i:number = 0; i < this.numClouds; i++) {
            this.sClouds[i].width = this.sClouds[i].measuredWidth * this.cont.GetPhysScale() / 90;
            this.sClouds[i].height = this.sClouds[i].measuredHeight * this.cont.GetPhysScale() / 90;
          }
        } else if (this.skyType == 1) {
          this.sClouds[0].width = this.cont.World2ScreenX(this.cont.GetMaxX() + 5) - this.cont.World2ScreenX(this.cont.GetMinX() - 5);
          this.sClouds[0].height = this.sClouds[0].width;
        }
      }
      if (this.skyType == 0) {
        for (i = 0; i < this.numClouds; i++) {
          if (!this.cont.IsPaused()) {
            this.cloudPositions[i].x -= this.cloudVelocities[i];
            if (this.cloudPositions[i].x < this.cont.GetMinX() - 5) this.cloudPositions[i].x = this.cont.GetMaxX() + 5;
          }
          if (!this.cont.IsPaused() || hasPanned || hasZoomed) {
            this.sClouds[i].x = this.cont.World2ScreenX(this.cloudPositions[i].x) - this.sClouds[i].width / 2;
            this.sClouds[i].y = this.cont.World2ScreenY(this.cloudPositions[i].y) - this.sClouds[i].height / 2;
          }
        }
      } else if (this.skyType == 1) {
        if (!this.cont.IsPaused() || hasPanned || hasZoomed) {
          this.sClouds[0].x = this.cont.World2ScreenX(this.cont.GetMinX() - 5);
          this.sClouds[0].y = this.cont.World2ScreenY(this.cont.GetMinY() - 5);
        }
      }
    }

    public Delete():void {
      this.cont.removeChild(this.sky);
      if (this.skyType == 0) {
        for (var i:number = 0; i < this.numClouds; i++) {
          this.cont.removeChild(this.sClouds[i]);
        }
      } else if (this.skyType == 1) {
        this.cont.removeChild(this.sClouds[0]);
      }
    }
  }
}
