import { IncomingMessage, ServerResponse } from "http";
import { defaultErrorHandler } from "./core-middleware.js";
import { Container } from "./dependency-injection/container.js";
import { REQ, RES } from "./dependency-injection/di-consts.js";
import {
  ErrorHandler,
  Middleware,
  MiddlewareContext,
  Next,
  RpcServerConfig,
} from "./rpc-server.js";
import { createReq } from "./http-req.js";
import { createRes } from "./http-res.js";

export function createRunner(
  errorHandlers: ErrorHandler[],
  config: RpcServerConfig,
  middlewares: Middleware[],
  container: Container
) {
  const errorRunner = createErrorHandlerRunner(errorHandlers);
  return (incomingMessage: IncomingMessage, serverResponse: ServerResponse) => {
    let index = 0;

    const req = createReq(incomingMessage, config);
    const res = createRes(serverResponse);

    const scopedContainer = container.createScope();
    scopedContainer.setScopedInstance(REQ, req);
    scopedContainer.setScopedInstance(RES, res);

    const ctx: MiddlewareContext = {
      req,
      res,
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
