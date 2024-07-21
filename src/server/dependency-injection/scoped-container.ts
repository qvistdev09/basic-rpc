import { getFlattenedDependencies } from "./di-utils.js";
import { DependencyArray, MappedDependencies, Registration } from "./registration.js";
import { TransientStore } from "./transient-store.js";

export class ScopedContainer {
  private readonly singletonContext: Context;
  private readonly scopedContext: Context = new Map();

  constructor(singletonContext: Context) {
    this.singletonContext = singletonContext;
  }

  private attemptGetDependencies(
    service: Registration<any, DependencyArray>,
    transientStore: TransientStore
  ): any[] | null {
    const instances: any[] = [];
    for (const dependency of service.dependencies!) {
      if (dependency.scope === "singleton") {
        const instance = this.singletonContext.get(dependency);
        if (!instance) {
          return null;
        }
        instances.push(instance);
      }
      if (dependency.scope === "scoped") {
        const instance = this.scopedContext.get(dependency);
        if (!instance) {
          return null;
        }
        instances.push(instance);
      }
      if (dependency.scope === "transient") {
        if (!transientStore.has(dependency)) {
          return null;
        }
        instances.push(transientStore.take(dependency));
      }
    }
    return instances;
  }

  private tryGetWithoutResolving(registration: Registration<any, DependencyArray>): any | null {
    switch (registration.scope) {
      case "singleton":
        if (this.singletonContext.has(registration)) {
          return this.singletonContext.get(registration);
        }
        if (registration.instance) {
          this.singletonContext.set(registration, registration.instance);
          return registration.instance;
        }
        if (!registration.dependencies) {
          this.singletonContext.set(registration, registration.factory!());
          return this.singletonContext.get(registration);
        }
      case "scoped":
        if (this.scopedContext.has(registration)) {
          return this.scopedContext.get(registration);
        }
        if (!registration.dependencies) {
          this.scopedContext.set(registration, registration.factory!());
          return this.scopedContext.get(registration);
        }
      case "transient":
        if (!registration.dependencies) {
          return registration.factory!();
        }
    }
    return null;
  }

  private instantiateService(service: Registration<any, DependencyArray>) {
    const availableInstance = this.tryGetWithoutResolving(service);
    if (availableInstance !== null) {
      return availableInstance;
    }

    const transientStore = new TransientStore();
    const allDependencies = getFlattenedDependencies(service);
    const processedIndexes: number[] = [];

    while (allDependencies.length !== processedIndexes.length) {
      let progressMade = false;
      for (const [index, nestedDependency] of allDependencies.entries()) {
        if (processedIndexes.includes(index)) {
          continue;
        }
        const availableNestedInstance = this.tryGetWithoutResolving(nestedDependency);
        if (availableNestedInstance !== null) {
          if (nestedDependency.scope === "transient") {
            transientStore.store(nestedDependency, availableNestedInstance);
          }
          processedIndexes.push(index);
          progressMade = true;
          break;
        }

        const nestedDependencies = this.attemptGetDependencies(nestedDependency, transientStore);
        if (nestedDependencies === null) {
          continue;
        }
        const nestedInstance = nestedDependency.factory!(...nestedDependencies);
        if (nestedDependency.scope === "singleton") {
          this.singletonContext.set(nestedDependency, nestedInstance);
        }
        if (nestedDependency.scope === "scoped") {
          this.scopedContext.set(nestedDependency, nestedInstance);
        }
        if (nestedDependency.scope === "transient") {
          transientStore.store(nestedDependency, nestedInstance);
        }
        processedIndexes.push(index);
        progressMade = true;
        break;
      }
      if (!progressMade) {
        throw new Error("Cannot instantiate all dependencies");
      }
    }

    const serviceDependenciesInstances = this.attemptGetDependencies(service, transientStore);
    if (serviceDependenciesInstances === null) {
      throw new Error("Dependencies do not exist for service");
    }
    const instance = service.factory!(...serviceDependenciesInstances!);
    if (service.scope === "singleton") {
      this.singletonContext.set(service, instance);
    }
    if (service.scope === "scoped") {
      this.scopedContext.set(service, instance);
    }
    return instance;
  }

  public getInstances<T extends [...Registration<any, any>[], Registration<any, any>]>(
    ...services: T
  ) {
    return services.map((service) => this.instantiateService(service)) as MappedDependencies<T>;
  }
}

type Context = Map<Registration<any, DependencyArray>, any>;
