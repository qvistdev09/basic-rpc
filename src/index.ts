import { createProcedure, createRpcServer } from "./server/utils.js";

const validator = (data: unknown) => ({ valid: true as true, data: { message: "hello" } });

const authenticator = async (token: string | null) => {
  if (token === null) {
    return null;
  }
  return { sub: 25 };
};

const getUsers = createProcedure({
  validator,
  authentication: {
    authenticator,
    require: true,
  },
  procedure: async (ctx, payload) => {
    return { status: 200, data: { answer: "world" } };
  },
});

const app = { getUsers };

const server = createRpcServer(app);

server.listen(8080);
