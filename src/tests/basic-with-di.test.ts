import test from "node:test";
import { createServiceRegistration } from "../server/dependency-injection/registration.js";
import { createProcedure } from "../server/procedure.js";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import { createRpcServer } from "../server/rpc-server.js";
import { Server } from "node:http";
import assert from "node:assert/strict";

test("basic-with-di: procedures should get their dependencies", async () => {
  class SomeDependency {
    constructor(public name: string) {}
  }

  const someDependencyRegistration = createServiceRegistration(
    "scoped",
    () => new SomeDependency("test")
  );

  let receivedService: any;

  const procedures = {
    helloWorld: createProcedure({
      dependencies: [someDependencyRegistration],
      async procedure(ctx) {
        const [someDependency] = ctx.services;
        receivedService = someDependency;
        return { status: 200, data: { message: "Hello world" } };
      },
    }),
  };

  const mockServer = new MockServer();

  const testServer = createRpcServer(procedures);

  testServer.addRpcMiddleware().addSendRpcResponse();

  const mockReq = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures/helloWorld")
    .setHeader("content-type", "application/json")
    .setHeader("host", "localhost")
    .setBody("null");

  const mockRes = new MockRes();

  testServer.listen(3000, mockServer as unknown as Server);

  mockServer.emitMockHttpRequest(mockReq, mockRes);

  await mockRes.waitForResponse();

  const serviceIsReal = receivedService instanceof SomeDependency;

  assert.ok(serviceIsReal, "The dependency was not an instance of the mock 'SomeDependency' class");
});
