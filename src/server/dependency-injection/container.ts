import { ScopedContainer } from "./scoped-container.js";
import { DependencyArray, Registration } from "./registration.js";

export class Container {
  private readonly singletonContext: Map<Registration<any, DependencyArray>, any> = new Map();

  createScope() {
    return new ScopedContainer(this.singletonContext);
  }
}
