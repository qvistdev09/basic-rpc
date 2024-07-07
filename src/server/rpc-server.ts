import http, { IncomingMessage, ServerResponse, Server } from "http";
import { AppComposition, ErrorMiddleware, Middleware, Next } from "../types.js";
import { RpcRequest, RpcResponse } from "./rpc-http.js";
import {
  validateMethod,
  validateEndpoint,
  validateContentType,
  parseBody,
  validateMeta,
  validateProcedure,
  authenticate,
  validatePayload,
  runProcedure,
  defaultErrorHandler,
} from "./core-middleware.js";
import { bold, reset, blue, underline } from "./console.js";

export class RpcServer<T extends AppComposition> {
  private endpoint: string = "/api/procedures";
  private protocol: string = "http";

  private middlewares: Middleware[] = [
    validateMethod,
    validateEndpoint(() => this.endpoint),
    validateContentType,
    parseBody,
    validateMeta,
    validateProcedure(this.app),
    authenticate,
    validatePayload,
    runProcedure,
  ];

  private errorMiddlewares: ErrorMiddleware[] = [defaultErrorHandler];
  private customErrorMiddlewares: ErrorMiddleware[] = [];

  public readonly server: Server;

  constructor(private app: T, server?: Server) {
    this.server = server ?? http.createServer();
    this.server.on("request", (req, res) => {
      this.runMiddlewares(req, res);
    });
  }

  public setProtocol(protocol: "http" | "https") {
    this.protocol = protocol;
    return this;
  }

  public addErrorMiddleware(middleware: ErrorMiddleware) {
    this.customErrorMiddlewares.push(middleware);
    return this;
  }

  private log(message: string) {
    console.log(`${bold}[basic-rpc]${reset} ${message}`);
  }

  private runMiddlewares(req: IncomingMessage, res: ServerResponse) {
    let index = 0;

    const rpcReq = new RpcRequest(req, this.protocol);
    const rpcRes = new RpcResponse(res);

    const next: Next = (err) => {
      if (err) {
        return this.runErrorMiddlewares(err, rpcReq, rpcRes);
      }

      const middleware = this.middlewares[index];
      index++;

      middleware(rpcReq, rpcRes, next).catch((err) => {
        this.runErrorMiddlewares(err, rpcReq, rpcRes);
      });
    };

    next();
  }

  private runErrorMiddlewares(err: any, req: RpcRequest, res: RpcResponse) {
    let index = 0;

    const errorMiddlewares =
      this.customErrorMiddlewares.length > 0 ? this.customErrorMiddlewares : this.errorMiddlewares;

    const next: Next = (err) => {
      const errorMiddleware = errorMiddlewares[index];
      index++;

      errorMiddleware(err, req, res, next).catch(() => {
        res.status(500).message("Server error");
      });
    };

    next(err);
  }

  private logStartupInfo() {
    this.log("Starting server");
    this.log(`Application consists of ${Object.keys(this.app).length} procedures`);
    Object.keys(this.app).forEach((key) => {
      const procedure = this.app[key]!;
      const info = [];

      if (procedure.authentication) {
        info.push(`${blue}[Auth]${reset}`);
      }

      if (procedure.validator) {
        info.push("[Accepts payload]");
      }

      this.log(`Procedure: ${underline}${key}${reset} ${info.join(" - ")}`);
    });
  }

  public listen(port: number) {
    this.logStartupInfo();
    this.server.listen(port, () => {
      this.log(`RPC server is listening on http://localhost:${port}`);
    });
  }
}
