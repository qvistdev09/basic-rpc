import { ServerResponse } from "http";
import { ContentType } from "./content-type.js";
import { HttpHeader } from "./http-header.js";
import { ProcedureReturn } from "./procedure.js";

function json(this: Res, data: any) {
  this.setHeader("content-type", ContentType.ApplicationJson)
    .writeHead(this.statusHasBeenSet ? this.statusCode : 200)
    .end(JSON.stringify(data));
}

function status(this: Res, status: number) {
  this.statusCode = status;
  this.statusHasBeenSet = true;
  return this;
}

function setContentType(this: Res, contentType: ContentType | string) {
  this.setHeader(HttpHeader.ContentType, contentType);
  return this;
}

function message(this: Res, message: string) {
  this.json({ message });
}

export function createRes(source: ServerResponse): Res {
  return Object.assign(source, {
    statusHasBeenSet: false,
    json,
    status,
    setContentType,
    message,
    procedureReturn: null,
  });
}

export type Res = ServerResponse & {
  /**
   * Sends a JSON response, defaulting to status 200 unless another status has been set.
   */
  json: (this: Res, data: any) => void;
  /**
   * Sets the status code for the response and returns the res object for method chaining.
   */
  status: (this: Res, status: number) => Res;
  /**
   * Sets the content type for the response and returns the res object for chaining.
   */
  setContentType: (this: Res, contentType: ContentType | string) => Res;
  /**
   * Sends a JSON response with the specified message, i.e.
   *
   * ```json
   * { "message": "Success" }
   * ```
   */
  message: (this: Res, message: string) => void;
  /**
   * Indicates whether a status has been actively set with the 'status' method.
   */
  statusHasBeenSet: boolean;
  procedureReturn: ProcedureReturn<any> | null;
};
