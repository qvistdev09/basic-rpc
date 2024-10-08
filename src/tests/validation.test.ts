import { test } from "node:test";
import { Server } from "http";
import assert from "node:assert/strict";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import { Procedure } from "../server/procedure.js";
import { RpcServer } from "../server/rpc-server.js";

test("validator: invalid and valid results", async () => {
  const mockServer = new MockServer();

  let markPayloadAsValid = true;

  const procedures = {
    withValidator: new Procedure({
      validator: () => {
        if (markPayloadAsValid) {
          return { valid: true, data: { message: "valid" } };
        }
        return { valid: false, errors: [{ location: "root", message: "invalid" }] };
      },
      async procedure(payload) {
        return { status: 200, data: payload };
      },
    }),
  };

  const testServer = new RpcServer(procedures);

  testServer.addRpcMiddleware().addSendRpcResponse();

  const mockReqValid = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures/withValidator")
    .setHeader("content-type", "application/json")
    .setHeader("host", "localhost")
    .setBody(JSON.stringify({ message: "this payload should come back" }));

  const mockResValid = new MockRes();

  testServer.listen({ port: 3000, httpServer: mockServer as unknown as Server });

  mockServer.emitMockHttpRequest(mockReqValid, mockResValid);

  await mockResValid.waitForResponse();

  assert.deepEqual(JSON.parse(mockResValid.data), { message: "this payload should come back" });
  assert.equal(mockResValid.status, 200);
  assert.equal(mockResValid.headers["content-type"], "application/json");

  markPayloadAsValid = false;

  const mockReqInvalid = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures/withValidator")
    .setHeader("content-type", "application/json")
    .setHeader("host", "localhost")
    .setBody(JSON.stringify({ message: "this payload should not come back" }));

  const mockResInvalid = new MockRes();

  mockServer.emitMockHttpRequest(mockReqInvalid, mockResInvalid);

  await mockResInvalid.waitForResponse();

  assert.deepEqual(JSON.parse(mockResInvalid.data), [{ location: "root", message: "invalid" }]);
  assert.equal(mockResInvalid.status, 400);
  assert.equal(mockResInvalid.headers["content-type"], "application/json");
});
