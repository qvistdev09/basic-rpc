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
