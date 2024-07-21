import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { Procedure } from "./procedure.js";
import { ProcedureReturn } from "../types.js";

export class RpcRequest {
  public body: unknown | undefined;
  public procedure: Procedure<any, any, any, any, any> | undefined;
  public procedureName: string | undefined;
  public payload: unknown | undefined;
  public user: unknown | undefined;
  public query: Record<string, string | undefined> = {};

  constructor(public httpReq: IncomingMessage, protocol: string) {
    const url = new URL(httpReq.url ?? "", `${protocol}://${httpReq.headers.host ?? ""}`);
    url.searchParams.forEach((value, name) => {
      this.query[name] = value;
    });
  }

  public getContentType() {
    return this.httpReq.headers["content-type"];
  }

  public getMethod() {
    return (this.httpReq.method ?? "").toUpperCase();
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
  public responseData: ProcedureReturn<any> | null = null;

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
