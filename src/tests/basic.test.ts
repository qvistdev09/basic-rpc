import { test } from "node:test";
import { Server } from "http";
import { RpcServer } from "../server/rpc-server.js";
import { createProcedure } from "../server/utils.js";
import { MockReq, MockRes, MockServer } from "./mocks.js";
import assert from "node:assert/strict";

await test("happy path, no payload", async () => {
  const mockServer = new MockServer();

  new RpcServer(
    {
      helloWorld: createProcedure({
        async procedure(ctx, payload) {
          return { status: 200, data: { message: "Hello world" } };
        },
      }),
    },
    mockServer as unknown as Server
  );

  const mockReq = new MockReq()
    .setMethod("POST")
    .setUrl("/api/procedures")
    .setHeader("content-type", "application/json")
    .setBody(JSON.stringify({ procedure: "helloWorld", payload: null }));

  const mockRes = new MockRes();

  mockServer.emitMockHttpRequest(mockReq, mockRes);

  await mockRes.waitForResponse();

  assert.deepEqual(JSON.parse(mockRes.data), { message: "Hello world" });
  assert.equal(mockRes.status, 200);
  assert.equal(mockRes.headers["content-type"], "application/json");
});
