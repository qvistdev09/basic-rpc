import http, { IncomingMessage, ServerResponse, Server } from "http";
import { AppComposition, ErrorHandler, Middleware, Next } from "../types.js";
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
} from "./core-middleware.js";

const bold = "\x1b[1m";
const reset = "\x1b[0m";
const underline = "\x1b[4m";
const red = "\x1b[31m";
const blue = "\x1b[34m";

export class RpcServer<T extends AppComposition> {
  private endpoint: string = "/api/procedures";

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

  public readonly server: Server;

  constructor(private app: T) {
    this.server = http.createServer((req, res) => {
      this.runMiddlewares(req, res);
    });
  }

  private log(message: string) {
    console.log(`${bold}[basic-rpc]${reset} ${message}`);
  }

  private runMiddlewares(req: IncomingMessage, res: ServerResponse) {
    let index = 0;

    const rpcReq = new RpcRequest(req);
    const rpcRes = new RpcResponse(res);

    const next: Next = async (err) => {
      if (err) {
        return this.errorHandler(rpcReq, rpcRes, err);
      }

      const middleware = this.middlewares[index];
      index++;

      try {
        await middleware(rpcReq, rpcRes, next);
      } catch (err) {
        this.errorHandler(rpcReq, rpcRes, err);
      }
    };

    next();
  }

  private errorHandler: ErrorHandler = (req, res, err) => {
    console.log(err);
    res.status(500).message(JSON.stringify("Server error"));
  };

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
      this.log("RPC server is listening on http://localhost:${port}");
    });
  }
}
