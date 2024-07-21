import { Registration, DependencyArray } from "./registration.js";

export function getFlattenedDependencies(
  service: Registration<any, DependencyArray>,
  dependencies: Registration<any, DependencyArray>[] = []
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
