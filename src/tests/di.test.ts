import { test } from "node:test";
import { Container } from "../server/dependency-injection/container.js";
import { Service } from "../server/dependency-injection/service.js";
import assert from "node:assert";

test("transient: transient services should always be unique", () => {
  const transient = new Service({ scope: "transient", factory: () => ({ status: "transient" }) });
  const container = new Container();
  const scope = container.createScope();

  const [instance1, instance2] = scope.getInstances(transient, transient);

  assert.notStrictEqual(instance1, instance2);
});

test("transient: dependencies that rely on the same transient service should get their own copies", () => {
  const transient = new Service({ scope: "transient", factory: () => ({ status: "transient" }) });

  const dependencyA = new Service({
    scope: "scoped",
    dependencies: [transient],
    factory: (transient) => ({ myTransient: transient }),
  });

  const dependencyB = new Service({
    scope: "scoped",
    dependencies: [transient],
    factory: (transient) => ({ myTransient: transient }),
  });

  const main = new Service({
    scope: "scoped",
    dependencies: [dependencyA, dependencyB],
    factory: (a, b) => ({ a, b }),
  });

  const container = new Container();
  const scope = container.createScope();

  const [mainInstance] = scope.getInstances(main);

  assert.notStrictEqual(mainInstance.a.myTransient, mainInstance.b.myTransient);
});

test("scoped: scoped services should be the same in one scope", () => {
  const service = new Service({ scope: "scoped", factory: () => ({ identity: "scoped" }) });
  const container = new Container();
  const scope = container.createScope();

  const [instance1, instance2] = scope.getInstances(service, service);

  assert.strictEqual(instance1, instance2);
});

test("scoped: scoped services from different scopes should be unique instances", () => {
  const service = new Service({ scope: "scoped", factory: () => ({ identity: "scoped" }) });
  const container = new Container();
  const scope = container.createScope();

  const [instance1] = scope.getInstances(service);

  const scope2 = container.createScope();

  const [instance2] = scope2.getInstances(service);

  assert.notStrictEqual(instance1, instance2);
});

test("singleton: singletons should be the same instance when instantiated in different scopes", () => {
  const service = new Service({ scope: "singleton", factory: () => ({ identity: "singleton" }) });

  const container = new Container();

  const scope = container.createScope();

  const [instance1] = scope.getInstances(service);

  const scope2 = container.createScope();

  const [instance2] = scope2.getInstances(service);

  assert.strictEqual(instance1, instance2);
});

test("singleton: services can be registered with an instance with automatically makes them a singleton", () => {
  const service = new Service({ instance: { identity: "singleton" } });
  assert.strictEqual(service.scope, "singleton");

  const container = new Container();

  const scope = container.createScope();

  const [instance1] = scope.getInstances(service);

  const scope2 = container.createScope();

  const [instance2] = scope2.getInstances(service);

  assert.strictEqual(instance1, instance2);
});
