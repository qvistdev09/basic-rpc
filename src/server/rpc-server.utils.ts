import { IncomingMessage, ServerResponse } from "http";
import { ErrorHandler as ErrorHandler, Middleware, Next } from "../types.js";
import { RpcRequest, RpcResponse } from "./rpc-http.js";
import { defaultErrorHandler } from "./core-middleware.js";

export function createRunner(
  errorHandlers: ErrorHandler[],
  protocol: "http" | "https",
  middlewares: Middleware[]
) {
  const errorRunner = createErrorHandlerRunner(errorHandlers);
  return (req: IncomingMessage, res: ServerResponse) => {
    let index = 0;
    const rpcReq = new RpcRequest(req, protocol);
    const rpcRes = new RpcResponse(res);

    const next: Next = (err) => {
      if (err) {
        return errorRunner(err, rpcReq, rpcRes);
      }
      const middleware = middlewares[index];
      index++;

      middleware(rpcReq, rpcRes, next).catch((err) => {
        errorRunner(err, rpcReq, rpcRes);
      });
    };

    next();
  };
}

export function createErrorHandlerRunner(errorHandlers: ErrorHandler[]) {
  const handlers = [...errorHandlers, defaultErrorHandler];
  return (err: any, req: RpcRequest, res: RpcResponse) => {
    let index = 0;
    const next: Next = (err) => {
      const errorMiddleware = handlers[index];
      index++;
      errorMiddleware(err, req, res, next).catch(() => {
        res.status(500).message("Server error");
      });
    };
    next(err);
  };
}
