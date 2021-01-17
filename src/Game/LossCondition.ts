import { Condition } from "../imports";

export class LossCondition extends Condition {
  public immediate: boolean;

  constructor(n: string, s: number, o: number, i: boolean) {
    super(n, s, o);
    this.immediate = i;
  }
}
