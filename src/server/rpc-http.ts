import { IncomingMessage, ServerResponse } from "http";
import { Procedure } from "./procedure.js";

export class RpcRequest {
  public body: unknown | undefined;
  public procedure: Procedure<any, any, any, any> | undefined;
  public procedureName: string | undefined;
  public payload: unknown | undefined;
  public user: unknown | undefined;
  constructor(public httpReq: IncomingMessage) {}

  public getContentType() {
    return this.httpReq.headers["content-type"];
  }

  public getMethod() {
    return this.httpReq.method;
  }

  public getUrl() {
    return this.httpReq.url;
  }

  public getHeader(key: string): string | null {
    const value = this.httpReq.headers[key];

    if (!value) {
      return null;
    }

    return Array.isArray(value) ? value[0] : value;
  }
}

export class RpcResponse {
  private statusCode: number = 200;

  constructor(public httpRes: ServerResponse) {
    this.httpRes.setHeader("content-type", "application/json");
  }

  public status(status: number) {
    this.statusCode = status;
    return this;
  }

  public json(data: any) {
    this.httpRes.writeHead(this.statusCode).end(JSON.stringify(data));
  }

  public message(message: string) {
    this.httpRes.writeHead(this.statusCode).end(JSON.stringify({ message }));
  }
}
