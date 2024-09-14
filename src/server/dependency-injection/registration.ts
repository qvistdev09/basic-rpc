export class Registration<
  ServiceType,
  Dependencies extends DependencyArray | undefined = undefined
> {
  public readonly instance?: ServiceType;
  public readonly scope: Scope;
  public readonly dependencies?: Dependencies;
  public readonly factory?: (...params: any[]) => ServiceType;

  constructor(config: RegistrationConfig<ServiceType, Dependencies>) {
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

  public static instance<SingletonType>(instance: SingletonType) {
    return new Registration({ instance });
  }

  public static singleton<
    ServiceType,
    Dependencies extends DependencyArray | undefined = undefined
  >(
    factory: Dependencies extends DependencyArray
      ? (...dependencies: MappedDependencies<Dependencies>) => ServiceType
      : () => ServiceType,
    dependencies?: Dependencies
  ) {
    return new Registration({ scope: "singleton", factory, dependencies });
  }

  public static scoped<ServiceType, Dependencies extends DependencyArray | undefined = undefined>(
    factory: Dependencies extends DependencyArray
      ? (...dependencies: MappedDependencies<Dependencies>) => ServiceType
      : () => ServiceType,
    dependencies?: Dependencies
  ) {
    return new Registration({ scope: "scoped", factory, dependencies });
  }

  public static transient<
    ServiceType,
    Dependencies extends DependencyArray | undefined = undefined
  >(
    factory: Dependencies extends DependencyArray
      ? (...dependencies: MappedDependencies<Dependencies>) => ServiceType
      : () => ServiceType,
    dependencies?: Dependencies
  ) {
    return new Registration({ scope: "transient", factory, dependencies });
  }
}

export type RegistrationConfig<
  ServiceType,
  Dependencies extends DependencyArray | undefined = undefined
> =
  | { instance: ServiceType }
  | {
      factory: Dependencies extends DependencyArray
        ? (...dependencies: MappedDependencies<Dependencies>) => ServiceType
        : () => ServiceType;
      scope: Scope;
      dependencies?: Dependencies;
    };

export type MappedDependencies<T extends DependencyArray> = {
  [Key in keyof T]: T[Key] extends Registration<infer TS, any> ? TS : T[Key];
};

type Scope = "transient" | "singleton" | "scoped";

export type DependencyArray = [...Registration<any, any>[], Registration<any, any>];
