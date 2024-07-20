import { ScopedContainer } from "./scoped-container.js";
import { DependencyArray, Scope, MappedDependencies, Service } from "./service.js";

export class Container {
  private readonly servicesRegistry: Set<Service<any, DependencyArray>> = new Set();
  private readonly singletonContext: Map<Service<any, DependencyArray>, any> = new Map();

  createScope() {
    return new ScopedContainer(this.singletonContext, this.servicesRegistry);
  }

  registerService<T, D extends DependencyArray>(
    scope: Scope,
    factory: D extends undefined
      ? () => T
      : D extends Array<any>
      ? (...dependencies: MappedDependencies<D>) => T
      : never,
    dependencies?: D
  ) {
    const service = new Service({ scope, factory, dependencies });
    this.servicesRegistry.add(service);
    return service;
  }

  registerInstance<T>(instance: T) {
    const service = new Service({ instance });
    this.servicesRegistry.add(service);
    return service;
  }
}
