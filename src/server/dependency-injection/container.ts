import { Scope } from "./scope.js";
import { DependencyArray, Service } from "./service.js";

export class Container {
  private readonly singletonContext: Map<Service<any, DependencyArray>, any> = new Map();

  createScope() {
    return new Scope(this.singletonContext);
  }
}
