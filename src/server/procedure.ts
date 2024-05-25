import { MainFunction, Validator } from "../types.js";

export class Procedure<P, R> {
  constructor(public validator: Validator<P>, public mainFunction: MainFunction<P, R>) { }
}
