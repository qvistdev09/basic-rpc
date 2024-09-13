import test from "node:test";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import { Server } from "node:http";
import assert from "node:assert/strict";
import { Registration } from "../server/dependency-injection/registration.js";
import { Procedure } from "../server/procedure.js";
import { RpcServer } from "../server/rpc-server.js";

test("basic-with-di: procedures should get their dependencies", async () => {
  class SomeDependency {
    constructor(public name: string) {}
  }

  const someDependencyRegistration = Registration.scoped(() => new SomeDependency("test"));

  let receivedService: any;

  const procedures = {
    helloWorld: new Procedure({
      dependencies: [someDependencyRegistration],
      async procedure(someDependency) {
        receivedService = someDependency;
        return { status: 200, data: { message: "Hello world" } };
      },
    }),
  };

  const mockServer = new MockServer();

  const testServer = new RpcServer(procedures);

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
