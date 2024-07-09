import http, { IncomingMessage, ServerResponse, Server } from "http";
import { AppComposition, ErrorMiddleware as ErrorHandler, Middleware, Next } from "../types";
import { RpcRequest, RpcResponse } from "./rpc-http.js";
import {
  authenticate,
  defaultErrorHandler,
  parseBody as parseJsonBody,
  runProcedure,
  sendProcedureResponse,
  validateContentType,
  validateEndpoint,
  validateMeta,
  validateMethod,
  validatePayload,
  validateProcedure,
} from "./core-middleware.js";
import { logStartupInfo } from "./console.js";

interface RpcServerConfig<T extends AppComposition> {
  middlewares: Middleware[];
  errorHandlers: ErrorHandler[];
  protocol: "http" | "https";
  httpServer: Server;
  procedures: T;
}

export interface RpcServer<T extends AppComposition> {
  config: RpcServerConfig<T>;
  addMiddleware: (middleware: Middleware) => RpcServer<T>;
  addErrorHandler: (errorHandler: ErrorHandler) => RpcServer<T>;
  setProtocol: (protocol: "http" | "https") => RpcServer<T>;
  addRpcMiddleware: (rpcEndpoint?: string) => RpcServer<T>;
  addSendRpcResponse: () => RpcServer<T>;
  listen: (port: number) => void;
}

function bind<T extends AppComposition>(config: RpcServerConfig<T>): RpcServer<T> {
  return {
    config,
    addMiddleware: (middleware: Middleware) => {
      config.middlewares.push(middleware);
      return bind(config);
    },
    addErrorHandler: (errorHandler: ErrorHandler) => {
      config.errorHandlers.push(errorHandler);
      return bind(config);
    },
    setProtocol: (protocol: "http" | "https") => {
      config.protocol = protocol;
      return bind(config);
    },
    addRpcMiddleware: (rpcEndpoint: string = "/api/procedures") => {
      config.middlewares.push(
        validateMethod,
        validateEndpoint(rpcEndpoint),
        validateContentType,
        validateMeta,
        validateProcedure(config.procedures),
        authenticate,
        validatePayload,
        runProcedure
      );
      return bind(config);
    },
    addSendRpcResponse: () => {
      config.middlewares.push(sendProcedureResponse);
      return bind(config);
    },
    listen: (port: number) => {
      const runner = createRunner(config);
      config.httpServer.on("request", runner);
      config.httpServer.listen(port, () => {
        logStartupInfo(config.procedures);
      });
    },
  };
}

function createRunner(
  config: Pick<RpcServerConfig<any>, "errorHandlers" | "middlewares" | "protocol">
) {
  const { errorHandlers, protocol, middlewares } = config;
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

function createErrorHandlerRunner(errorHandlers: ErrorHandler[]) {
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

export function createRpcServer<T extends AppComposition>(procedures: T, httpServer?: Server) {
  return bind({
    middlewares: [parseJsonBody],
    errorHandlers: [],
    protocol: "http",
    httpServer: httpServer ?? http.createServer(),
    procedures,
  });
}
