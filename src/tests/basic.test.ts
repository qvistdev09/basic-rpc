import { test } from "node:test";
import { Server } from "http";
import { createProcedure } from "../server/utils.js";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import assert from "node:assert/strict";
import { createRpcServer } from "../server/rpc-server.js";

test("happy path, no payload", async () => {
  const mockServer = new MockServer();

  const procedures = {
    helloWorld: createProcedure({
      async procedure() {
        return { status: 200, data: { message: "Hello world" } };
      },
    }),
  };

  const testServer = createRpcServer(procedures, mockServer as unknown as Server);

  testServer.addRpcMiddleware().addSendRpcResponse();

  const mockReq = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures")
    .setHeader("content-type", "application/json")
    .setHeader("host", "localhost")
    .setBody(JSON.stringify({ procedure: "helloWorld", payload: null }));

  const mockRes = new MockRes();

  testServer.listen(3000);

  mockServer.emitMockHttpRequest(mockReq, mockRes);

  await mockRes.waitForResponse();

  assert.deepEqual(JSON.parse(mockRes.data), { message: "Hello world" });
  assert.equal(mockRes.status, 200);
  assert.equal(mockRes.headers["content-type"], "application/json");
});
