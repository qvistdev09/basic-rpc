import { DependencyArray, MappedDependencies, Service } from "./service";

export class ScopedContainer {
  private readonly singletonContext: Context;
  private readonly servicesRegistry: Set<Service<any, DependencyArray>>;
  private readonly scopedContext: Context = new Map();

  constructor(singletonContext: Context, servicesRegistry: Set<Service<any, DependencyArray>>) {
    this.singletonContext = singletonContext;
    this.servicesRegistry = servicesRegistry;
  }

  private attemptGetDependencies(
    service: Service<any, DependencyArray>,
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

  private instantiateService(service: Service<any, DependencyArray>) {
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
      for (const [index, service] of remaining.entries()) {
        if (processedIndexes.includes(index)) {
          continue;
        }
        switch (service.scope) {
          case "singleton":
            if (this.singletonContext.has(service)) {
              processedIndexes.push(index);
              progress = true;
              break;
            }
            if (service.instance) {
              this.singletonContext.set(service, service.instance);
              processedIndexes.push(index);
              progress = true;
              break;
            }
            if (!service.dependencies) {
              this.singletonContext.set(service, service.factory!());
              processedIndexes.push(index);
              progress = true;
              break;
            }
            const singletonDependencies = this.attemptGetDependencies(service, transientStore);
            if (singletonDependencies !== null) {
              this.singletonContext.set(service, service.factory!(...singletonDependencies));
              processedIndexes.push(index);
              progress = true;
              break;
            }
          case "scoped":
            if (this.scopedContext.has(service)) {
              processedIndexes.push(index);
              progress = true;
              break;
            }
            if (!service.dependencies) {
              this.scopedContext.set(service, service.factory!());
              processedIndexes.push(index);
              progress = true;
              break;
            }
            const scopedServiceDependencies = this.attemptGetDependencies(service, transientStore);
            if (scopedServiceDependencies !== null) {
              this.scopedContext.set(service, service.factory!(...scopedServiceDependencies));
              processedIndexes.push(index);
              progress = true;
              break;
            }
          case "transient":
            if (!service.dependencies) {
              const copies = transientStore.get(service) ?? [];
              copies.push(service.factory!());
              transientStore.set(service, copies);
              processedIndexes.push(index);
              progress = true;
              break;
            }
            const transientServiceDependencies = this.attemptGetDependencies(
              service,
              transientStore
            );
            if (transientServiceDependencies !== null) {
              const copies = transientStore.get(service) ?? [];
              copies.push(service.factory!(...transientServiceDependencies));
              transientStore.set(service, copies);
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
        throw new Error();
      }
    }

    const serviceDependenciesInstances = this.attemptGetDependencies(service, transientStore);
    if (!serviceDependenciesInstances === null) {
      throw new Error();
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

  public getInstances<T extends [...Service<any, any>[], Service<any, any>]>(...services: T) {
    for (const service of services) {
      if (!this.servicesRegistry.has(service)) {
        throw new Error("Service has not been registered in the container");
      }
    }
    return services.map((service) => this.instantiateService(service)) as MappedDependencies<T>;
  }
}

function getFlattenedDependencies(
  service: Service<any, DependencyArray>,
  dependencies: Service<any, DependencyArray>[] = []
) {
  if (service.dependencies) {
    service.dependencies.forEach((dependency) => {
      if (dependency.scope === "transient") {
        dependencies.push(dependency);
        return;
      }
      if (!dependencies.includes(dependency)) {
        dependencies.push(dependency);
      }
    });
    service.dependencies.forEach((dependency) =>
      getFlattenedDependencies(dependency, dependencies)
    );
  }
  return dependencies;
}

type Context = Map<Service<any, DependencyArray>, any>;

type TransientStore = Map<Service<any, DependencyArray>, any[]>;
