import { createProcedure, createRpcServer } from "./server/utils.js";

const getUsers = createProcedure({
  validator: () => ({ valid: true, data: { message: "hello" } }),
  mainFunction: async (ctx, payload) => {
    return { status: 200, data: { answer: "world" } };
  },
});

const app = { getUsers };

const server = createRpcServer(app);

server.listen(8080);
