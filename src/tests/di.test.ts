import { test } from "node:test";
import { Container } from "../server/dependency-injection/container.js";
import assert from "node:assert";
import { Registration } from "../server/dependency-injection/registration.js";

test("transient: transient services should always be unique", () => {
  const container = new Container();
  const transient = Registration.transient(() => ({ status: "transient" }));
  const scope = container.createScope();
  const [instance1, instance2] = scope.getInstances(transient, transient);
  assert.notStrictEqual(instance1, instance2);
});

test("transient: dependencies that rely on the same transient service should get their own copies", () => {
  const container = new Container();
  const transient = Registration.transient(() => ({ status: "transient" }));

  const dependencyA = Registration.scoped((transient) => ({ myTransient: transient }), [transient]);

  const dependencyB = Registration.scoped((transient) => ({ myTransient: transient }), [transient]);

  const main = Registration.scoped((a, b) => ({ a, b }), [dependencyA, dependencyB]);

  const scope = container.createScope();

  const [mainInstance] = scope.getInstances(main);

  assert.notStrictEqual(mainInstance.a.myTransient, mainInstance.b.myTransient);
});

test("scoped: scoped services should be the same in one scope", () => {
  const container = new Container();
  const service = Registration.scoped(() => ({ identity: "scoped" }));
  const scope = container.createScope();
  const [instance1, instance2] = scope.getInstances(service, service);
  assert.strictEqual(instance1, instance2);
});

test("scoped: scoped services from different scopes should be unique instances", () => {
  const container = new Container();
  const service = Registration.scoped(() => ({ identity: "scoped" }));
  const scope = container.createScope();
  const [instance1] = scope.getInstances(service);
  const scope2 = container.createScope();
  const [instance2] = scope2.getInstances(service);
  assert.notStrictEqual(instance1, instance2);
});

test("singleton: singletons should be the same instance when instantiated in different scopes", () => {
  const container = new Container();
  const service = Registration.singleton(() => ({ identity: "singleton" }));
  const scope = container.createScope();
  const [instance1] = scope.getInstances(service);
  const scope2 = container.createScope();
  const [instance2] = scope2.getInstances(service);
  assert.strictEqual(instance1, instance2);
});

test("singleton: services can be registered with an instance with automatically makes them a singleton", () => {
  const container = new Container();
  const service = Registration.instance({ identity: "singleton" });
  assert.strictEqual(service.scope, "singleton");
  const scope = container.createScope();
  const [instance1] = scope.getInstances(service);
  const scope2 = container.createScope();
  const [instance2] = scope2.getInstances(service);
  assert.strictEqual(instance1, instance2);
});

test("general: mix of scopes and dependencies", () => {
  assert.doesNotThrow(() => {
    const container = new Container();
    const singletonInstance = Registration.instance({});
    const singletonFactory = Registration.singleton(() => ({}), [singletonInstance]);
    const transient = Registration.transient(() => ({}), [singletonInstance, singletonFactory]);
    const transientB = Registration.transient(() => ({}), [transient]);
    const scopedA = Registration.scoped(
      () => ({}),
      [singletonInstance, singletonFactory, transient]
    );
    const scopedB = Registration.scoped(() => ({}), [scopedA, transientB, transient]);
    const scope = container.createScope();
    scope.getInstances(
      singletonInstance,
      singletonFactory,
      transient,
      transientB,
      scopedA,
      scopedB
    );
  });
});
