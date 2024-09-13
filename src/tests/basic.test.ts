import { test } from "node:test";
import { Server } from "http";
import assert from "node:assert/strict";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import { Procedure } from "../server/procedure.js";
import { RpcServer } from "../server/rpc-server.js";

test("basic: happy path with no payload", async () => {
  const mockServer = new MockServer();

  const procedures = {
    helloWorld: new Procedure({
      async procedure() {
        return { status: 200, data: { message: "Hello world" } };
      },
    }),
  };

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

  assert.deepEqual(JSON.parse(mockRes.data), { message: "Hello world" });
  assert.equal(mockRes.status, 200);
  assert.equal(mockRes.headers["content-type"], "application/json");
});
