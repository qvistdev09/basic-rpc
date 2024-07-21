import { test } from "node:test";
import { IncomingMessage, Server } from "http";
import assert from "node:assert/strict";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import { createRpcServer, createProcedure, createServiceRegistration } from "../index.js";

test("auth: successful required authentication", async () => {
  const mockServer = new MockServer();

  const authenticator = createServiceRegistration("transient", () => {
    return async (req: IncomingMessage) => ({ id: 2525 });
  });

  const procedures = {
    testAuth: createProcedure({
      authentication: {
        require: true,
        authenticator,
      },
      async procedure(ctx) {
        return { status: 200, data: { user: ctx.user } };
      },
    }),
  };

  const testServer = createRpcServer(procedures);

  testServer.addRpcMiddleware().addSendRpcResponse();

  const mockReq = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures")
    .setHeader("content-type", "application/json")
    .setHeader("host", "localhost")
    .setBody(JSON.stringify({ procedure: "testAuth", payload: null }));

  const mockRes = new MockRes();

  testServer.listen(3000, mockServer as unknown as Server);

  mockServer.emitMockHttpRequest(mockReq, mockRes);

  await mockRes.waitForResponse();

  assert.deepEqual(JSON.parse(mockRes.data), { user: { id: 2525 } });
  assert.equal(mockRes.status, 200);
  assert.equal(mockRes.headers["content-type"], "application/json");
});
