import { test } from "node:test";
import { Server } from "http";
import assert from "node:assert/strict";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import { Procedure, Registration, Req, RpcServer } from "../index.js";

test("auth: successful required authentication", async () => {
  const mockServer = new MockServer();

  const authenticator = Registration.transient(() => {
    return async (req: Req) => {
      return { id: 2525 };
    };
  });

  const testAuth = new Procedure({
    authentication: { authenticator, require: true },
    procedure: async (user) => {
      return { status: 200, data: { user } };
    },
  });

  const procedures = {
    testAuth,
  };

  const testServer = new RpcServer(procedures);

  testServer.addRpcMiddleware().addSendRpcResponse();

  const mockReq = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures/testAuth")
    .setHeader("content-type", "application/json")
    .setHeader("host", "localhost")
    .setBody("null");

  const mockRes = new MockRes();

  testServer.listen(3000, mockServer as unknown as Server);

  mockServer.emitMockHttpRequest(mockReq, mockRes);

  await mockRes.waitForResponse();

  assert.deepEqual(JSON.parse(mockRes.data), { user: { id: 2525 } });
  assert.equal(mockRes.status, 200);
  assert.equal(mockRes.headers["content-type"], "application/json");
});
