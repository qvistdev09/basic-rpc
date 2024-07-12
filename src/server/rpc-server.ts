import http, { Server } from "http";
import { AppComposition, ErrorHandler, Middleware, Next } from "../types";
import {
  authenticate,
  parseBody,
  runProcedure,
  sendProcedureResponse,
  validateContentType,
  validateEndpoint,
  validateMeta,
  validateMethod,
  validatePayload,
  validateProcedure,
} from "./core-middleware.js";
import { createRunner } from "./rpc-server.utils.js";
import { logStartupInfo } from "./console.js";
import { RpcRequest, RpcResponse } from "./rpc-http";

export class RpcServer<T extends AppComposition> {
  private middlewares: Middleware[] = [parseBody];
  private errorHandlers: ErrorHandler[] = [];
  private protocol: "http" | "https" = "http";
  private procedures: T;

  constructor(procedures: T) {
    this.procedures = procedures;
  }

  addMiddleware(middleware: (req: RpcRequest, res: RpcResponse, next: Next) => Promise<void>) {
    this.middlewares.push(middleware);
    return this;
  }

  addErrorHandler(errorHandler: ErrorHandler) {
    this.errorHandlers.push(errorHandler);
    return this;
  }

  setProtocol(protocol: "http" | "https") {
    this.protocol = protocol;
    return this;
  }

  addRpcMiddleware(rpcEndpoint: string = "/api/procedures") {
    this.middlewares.push(
      validateMethod,
      validateEndpoint(rpcEndpoint),
      validateContentType,
      validateMeta,
      validateProcedure(this.procedures),
      authenticate,
      validatePayload,
      runProcedure
    );
    return this;
  }

  addSendRpcResponse() {
    this.middlewares.push(sendProcedureResponse);
    return this;
  }

  listen(port: number, httpServer?: Server) {
    const runner = createRunner(this.errorHandlers, this.protocol, this.middlewares);
    const server = httpServer ?? http.createServer();
    server.on("request", runner);
    server.listen(port, () => {
      logStartupInfo(this.procedures);
    });
  }
}

export function createRpcServer<T extends AppComposition>(procedures: T) {
  return new RpcServer(procedures);
}
