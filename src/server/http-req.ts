import { IncomingMessage } from "http";
import { ContentType } from "./content-type.js";
import { HttpHeader } from "./http-header.js";
import { RpcServerConfig } from "./rpc-server.js";
import { Procedure } from "./procedure.js";
import { HttpMethod } from "./http-method.js";

function parseQueryFromUrl(url: string | undefined): Record<string, string | undefined> {
  if (!url) {
    return {};
  }

  const split = url.split("?");
  const queryString = split.length === 1 ? split[0] : split.slice(1).join("");
  const query: Record<string, string | undefined> = {};

  new URLSearchParams(queryString).forEach((value, key) => {
    query[key] = value;
  });

  return query;
}

function getContentType(req: IncomingMessage): ContentType | null {
  const header = req.headers["content-type"];
  if (!header) {
    return null;
  }

  if (Object.values(ContentType).includes(header.toLowerCase() as ContentType)) {
    return header as ContentType;
  }

  return null;
}

function getHeader(this: Req, header: HttpHeader): string | null {
  const raw = this.headers[header];
  if (!raw) {
    return null;
  }
  if (Array.isArray(raw) && raw.length === 0) {
    return null;
  }
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

function getIpFromXForwardedFor(req: IncomingMessage): string | null {
  const header = req.headers["x-forwarded-for"];
  if (!header) {
    return null;
  }
  const value = Array.isArray(header) ? header[0] : header;
  return value.split(",").map((str) => str.trim())[0];
}

function getIpFromSocket(req: IncomingMessage): string | null {
  return req.socket.remoteAddress ?? null;
}

function getHttpMethod(req: IncomingMessage) {
  const value = req.method?.toUpperCase() ?? "";

  if (Object.values(HttpMethod).includes(value as HttpMethod)) {
    return value as HttpMethod;
  }

  return null;
}

export function createReq(req: IncomingMessage, config: RpcServerConfig): Req {
  return Object.assign(req, {
    contentType: getContentType(req),
    getHeader,
    query: parseQueryFromUrl(req.url),
    ip: config.trustXForwardedFor ? getIpFromXForwardedFor(req) : getIpFromSocket(req),
    httpMethod: getHttpMethod(req),
    body: undefined,
    procedure: null,
    user: undefined,
  });
}

export type Req = IncomingMessage & {
  /**
   * Retrieves the content type of the request.
   */
  contentType: ContentType | null;

  /**
   * Retrieves the value for a given header key. For duplicate headers, interface directly
   * with the 'headers' object.
   */
  getHeader(this: Req, header: HttpHeader): string | null;

  /**
   * The query params parsed from the request's url.
   */
  query: Record<string, string | undefined>;

  /**
   * The client's IP address, sourced either from the x-forwarded-for header or the socket's remote address, depending
   * on the trustXForwardedFor setting in the RpcServer's config.
   */
  ip: string | null;

  /**
   * The request's http method.
   */
  httpMethod: HttpMethod | null;

  body: unknown;

  procedure: Procedure<any, any, any, any, any> | null;

  user: unknown;
};
