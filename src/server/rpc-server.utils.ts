import { IncomingMessage, ServerResponse } from "http";
import { ErrorHandler as ErrorHandler, Middleware, MiddlewareContext, Next } from "../types.js";
import { RpcRequest, RpcResponse } from "./rpc-http.js";
import { defaultErrorHandler } from "./core-middleware.js";
import { Container } from "./dependency-injection/container.js";
import { INCOMING_MESSAGE, SERVER_RESPONSE } from "./dependency-injection/di-consts.js";

export function createRunner(
  errorHandlers: ErrorHandler[],
  protocol: "http" | "https",
  middlewares: Middleware[],
  container: Container
) {
  const errorRunner = createErrorHandlerRunner(errorHandlers);
  return (req: IncomingMessage, res: ServerResponse) => {
    let index = 0;

    const rpcReq = new RpcRequest(req, protocol);
    const rpcRes = new RpcResponse(res);

    const scopedContainer = container.createScope();
    scopedContainer.setScopedInstance(INCOMING_MESSAGE, req);
    scopedContainer.setScopedInstance(SERVER_RESPONSE, res);

    const ctx: MiddlewareContext = {
      req: rpcReq,
      res: rpcRes,
      container: scopedContainer,
    };

    const next: Next = (err) => {
      if (err) {
        return errorRunner(err, ctx);
      }
      const middleware = middlewares[index];
      index++;

      middleware(ctx, next).catch((err) => {
        errorRunner(err, ctx);
      });
    };

    next();
  };
}

export function createErrorHandlerRunner(errorHandlers: ErrorHandler[]) {
  const handlers = [...errorHandlers, defaultErrorHandler];
  return (err: any, ctx: MiddlewareContext) => {
    let index = 0;
    const next: Next = (err) => {
      const errorMiddleware = handlers[index];
      index++;
      errorMiddleware(err, ctx, next).catch(() => {
        defaultErrorHandler(err, ctx, next);
      });
    };
    next(err);
  };
}
