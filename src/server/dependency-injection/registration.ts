export class Registration<T, D extends DependencyArray> {
  public readonly instance?: T;
  public readonly scope: Scope;
  public readonly dependencies?: D;
  public readonly factory?: (...params: any[]) => T;

  constructor(config: RegistrationConfig<T, D>) {
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

type RegistrationConfig<T, D extends DependencyArray> =
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
  [Key in keyof T]: T[Key] extends Registration<infer TS, any> ? TS : never;
};

export type Scope = "transient" | "singleton" | "scoped";

export type DependencyArray = [...Registration<any, any>[], Registration<any, any>] | undefined;

export function createServiceRegistration<T, D extends DependencyArray>(
  scope: Scope,
  factory: D extends undefined
    ? () => T
    : D extends Array<any>
    ? (...dependencies: MappedDependencies<D>) => T
    : never,
  dependencies?: D
) {
  return new Registration({ scope, factory, dependencies });
}

export function createServiceInstanceRegistration<T>(instance: T) {
  return new Registration({ instance });
}
