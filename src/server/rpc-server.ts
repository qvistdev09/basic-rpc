import http, { IncomingMessage, ServerResponse, Server } from "http";
import { AppComposition } from "../types.js";
import { getClientJson, getMeta } from "./utils.js";

export class RpcServer<T extends AppComposition> {
  public readonly server: Server;

  constructor(private app: T) {
    this.server = http.createServer((req, res) => {
      this.handle(req, res).catch((err) => {
        console.log(err);
        res.writeHead(500).end();
      });
    });
  }

  public listen(port: number) {
    this.server.listen(port, () => {
      console.log(`[Geschwind] RPC server is listening on http://localhost:${port}`);
    });
  }

  private handle = async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("content-type", "application/json");

    if (req.method !== "POST") {
      return res.writeHead(405).end(JSON.stringify({ message: "Only post requests are allowd" }));
    }

    if (!req.url || req.url !== "/api/procedures") {
      return res
        .writeHead(404)
        .end(JSON.stringify({ message: "Requests must be posted to '/api/procedures'" }));
    }

    if (req.headers["content-type"] !== "application/json") {
      return res
        .writeHead(415)
        .end(JSON.stringify({ message: "Only content-type 'application/json' is allowed" }));
    }

    if (!req.headers["content-length"] || req.headers["content-length"] === "0") {
      return res
        .writeHead(400)
        .end(JSON.stringify({ message: "Content-length is missing or has no length" }));
    }

    const body = await getClientJson(req);

    const meta = getMeta(body);

    if (!meta.valid) {
      return res.writeHead(400).end(
        JSON.stringify({
          message:
            "Request body is not structured correctly. It should contain 'procedure' and 'payload'",
        })
      );
    }

    const { procedureName, payload } = meta;

    const procedure = this.app[procedureName];

    if (!procedure) {
      return res.writeHead(400).end(JSON.stringify({ message: "Procedure does not exist" }));
    }

    const validation = procedure.validator(payload);

    if (!validation.valid) {
      return res.writeHead(400).end(JSON.stringify(validation.errors));
    }

    const output = await procedure.mainFunction({}, validation.data);

    if ("data" in output) {
      return res.writeHead(output.status).end(JSON.stringify(output.data));
    }

    res.writeHead(output.status).end(JSON.stringify({ message: output.message }));
  };
}
