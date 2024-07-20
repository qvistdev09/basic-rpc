export class Service<T, D extends DependencyArray> {
  public readonly instance?: T;
  public readonly scope: Scope;
  public readonly dependencies?: D;
  public readonly factory?: (...params: any[]) => T;

  constructor(config: ServiceConfig<T, D>) {
    if ("instance" in config) {
      this.instance = config.instance;
      this.scope = "singleton";
    } else {
      if (
        config.scope === "singleton" &&
        config.dependencies?.some(({ scope }) => ["scoped", "transient"].includes(scope))
      ) {
        throw new Error("Singletons can only have other singletons as their dependencies");
      }
      this.scope = config.scope;
      this.dependencies = config.dependencies;
      this.factory = config.factory;
    }
  }
}

type ServiceConfig<T, D extends DependencyArray> =
  | { instance: T }
  | {
      factory: D extends undefined
        ? () => T
        : D extends Array<any>
        ? (...dependencies: MappedDependencies<D>) => T
        : never;
      scope: Scope;
      dependencies?: D;
    };

export type MappedDependencies<T> = {
  [Key in keyof T]: T[Key] extends Service<infer TS, any> ? TS : never;
};

type Scope = "transient" | "singleton" | "scoped";

export type DependencyArray = [...Service<any, any>[], Service<any, any>] | undefined;

export function createService<T, D extends DependencyArray>(config: ServiceConfig<T, D>) {
  return new Service(config);
}
