import { getFlattenedDependencies } from "./di-utils";
import { DependencyArray, MappedDependencies, Registration } from "./registration";

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
        const copies = transientStore.get(dependency);
        if (!copies || copies.length === 0) {
          return null;
        }
        instances.push(copies.pop());
      }
    }
    return instances;
  }

  private instantiateService(service: Registration<any, DependencyArray>) {
    if (service.scope === "singleton" && this.singletonContext.has(service)) {
      return this.singletonContext.get(service);
    }

    if (service.scope === "singleton" && service.instance) {
      this.singletonContext.set(service, service.instance);
      return service.instance;
    }

    if (service.scope === "singleton" && !service.dependencies) {
      const instance = service.factory!();
      this.singletonContext.set(service, instance);
      return instance;
    }

    if (service.scope === "scoped" && this.scopedContext.has(service)) {
      return this.scopedContext.get(service);
    }

    if (service.scope === "scoped" && !service.dependencies) {
      const instance = service.factory!();
      this.scopedContext.set(service, instance);
      return instance;
    }

    if (service.scope === "transient" && !service.dependencies) {
      return service.factory!();
    }

    const transientStore: TransientStore = new Map();
    const remaining = getFlattenedDependencies(service);
    const processedIndexes: number[] = [];
    while (remaining.length !== processedIndexes.length) {
      let progress = false;
      for (const [index, nestedDependency] of remaining.entries()) {
        if (processedIndexes.includes(index)) {
          continue;
        }

        switch (nestedDependency.scope) {
          case "singleton":
            if (this.singletonContext.has(nestedDependency)) {
              processedIndexes.push(index);
              progress = true;
              break;
            }
            if (nestedDependency.instance) {
              this.singletonContext.set(nestedDependency, nestedDependency.instance);
              processedIndexes.push(index);
              progress = true;
              break;
            }
            if (!nestedDependency.dependencies) {
              this.singletonContext.set(nestedDependency, nestedDependency.factory!());
              processedIndexes.push(index);
              progress = true;
              break;
            }
            const singletonDependencies = this.attemptGetDependencies(
              nestedDependency,
              transientStore
            );
            if (singletonDependencies !== null) {
              this.singletonContext.set(
                nestedDependency,
                nestedDependency.factory!(...singletonDependencies)
              );
              processedIndexes.push(index);
              progress = true;
              break;
            }
          case "scoped":
            if (this.scopedContext.has(nestedDependency)) {
              processedIndexes.push(index);
              progress = true;
              break;
            }
            if (!nestedDependency.dependencies) {
              this.scopedContext.set(nestedDependency, nestedDependency.factory!());
              processedIndexes.push(index);
              progress = true;
              break;
            }
            const scopedServiceDependencies = this.attemptGetDependencies(
              nestedDependency,
              transientStore
            );
            if (scopedServiceDependencies !== null) {
              this.scopedContext.set(
                nestedDependency,
                nestedDependency.factory!(...scopedServiceDependencies)
              );
              processedIndexes.push(index);
              progress = true;
              break;
            }
          case "transient":
            if (!nestedDependency.dependencies) {
              const copies = transientStore.get(nestedDependency) ?? [];
              copies.push(nestedDependency.factory!());
              transientStore.set(nestedDependency, copies);
              processedIndexes.push(index);
              progress = true;
              break;
            }
            const transientServiceDependencies = this.attemptGetDependencies(
              nestedDependency,
              transientStore
            );
            if (transientServiceDependencies !== null) {
              const copies = transientStore.get(nestedDependency) ?? [];
              copies.push(nestedDependency.factory!(...transientServiceDependencies));
              transientStore.set(nestedDependency, copies);
              processedIndexes.push(index);
              progress = true;
              break;
            }
        }
        if (progress) {
          break;
        }
      }
      if (!progress) {
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

type TransientStore = Map<Registration<any, DependencyArray>, any[]>;
