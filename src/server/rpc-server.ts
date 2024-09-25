import http, { Server } from "http";
import {
  authenticate,
  parseBody,
  runProcedure,
  sendProcedureResponse,
  validateContentType,
  validateEndpoint,
  validateMethod,
  validatePayload,
  validateProcedure,
} from "./core-middleware.js";
import { createRunner } from "./rpc-server.utils.js";
import { logStartupInfo } from "./console.js";
import { Container } from "./dependency-injection/container.js";
import { Procedure } from "./procedure.js";
import { ScopedContainer } from "./dependency-injection/scoped-container.js";
import { Req } from "./http-req.js";
import { Res } from "./http-res.js";

export class RpcServer<T extends AppComposition> {
  private middlewares: Middleware[] = [parseBody];
  private errorHandlers: ErrorHandler[] = [];
  private procedures: T;
  public config: RpcServerConfig = { trustXForwardedFor: false };

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

  /**
   * Decides whether to trust the ``x-forwarded-for`` header. If yes, the client's ip address on the req object
   * will be sourced from this header, which is usually the case when running behind a reverse proxy.
   */
  setTrustXForwardedFor(shouldTrust: boolean) {
    this.config.trustXForwardedFor = shouldTrust;
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

  listen({ port, httpServer, hostname }: { port: number; httpServer?: Server; hostname?: string }) {
    const runner = createRunner(this.errorHandlers, this.config, this.middlewares, this.container);
    const server = httpServer ?? http.createServer();
    server.on("request", runner);

    const logStartupCallback = () => {
      logStartupInfo(this.procedures);
    };

    if (hostname) {
      server.listen(port, hostname, logStartupCallback);
    } else {
      server.listen(port, logStartupCallback);
    }
  }
}

export type RpcServerConfig = {
  /**
   * Whether to source client ip from the 'x-forwarded-for' header (i.e. when running behind a reverse proxy).
   * @default false
   */
  trustXForwardedFor: boolean;
};

export type AppComposition = { [key: string]: Procedure<any, any, any, any, any> | undefined };

export type Middleware = (ctx: MiddlewareContext, next: Next) => Promise<void>;

export type ErrorHandler = (err: any, ctx: MiddlewareContext, next: Next) => Promise<void>;

export type Next = (err?: any) => void;

export type MiddlewareContext = {
  req: Req;
  res: Res;
  container: ScopedContainer;
};
