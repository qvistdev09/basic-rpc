import http, { Server } from "http";
import { AppComposition, ErrorHandler, Middleware, MiddlewareContext, Next } from "../types.js";
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
import { Container } from "./dependency-injection/container.js";

export class RpcServer<T extends AppComposition> {
  private middlewares: Middleware[] = [parseBody];
  private errorHandlers: ErrorHandler[] = [];
  private protocol: "http" | "https" = "http";
  private procedures: T;

  public readonly container = new Container();

  constructor(procedures: T) {
    this.procedures = procedures;
  }

  addMiddleware(middleware: (ctx: MiddlewareContext, next: Next) => Promise<void>) {
    this.middlewares.push(middleware);
    return this;
  }

  addErrorHandler(errorHandler: (err: any, ctx: MiddlewareContext, next: Next) => Promise<void>) {
    this.errorHandlers.push(errorHandler);
    return this;
  }

  setProtocol(protocol: "http" | "https") {
    this.protocol = protocol;
    return this;
  }

  /**
   * Adds RPC middleware which handles requests to the RPC endpoint.
   * @param rpcEndpoint
   * The endpoint which handles RPC requests. Must include an initial and ending forward slash.
   * @default "/api/procedures/"
   */
  addRpcMiddleware(rpcEndpoint: string = "/api/procedures/") {
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
    const runner = createRunner(
      this.errorHandlers,
      this.protocol,
      this.middlewares,
      this.container
    );
    const server = httpServer ?? http.createServer();
    server.on("request", runner);
    server.listen(port, () => {
      logStartupInfo(this.procedures);
    });
  }
}

export function createRpcServer<T extends AppComposition>(procedures: T): RpcServer<T> {
  return new RpcServer(procedures);
}
