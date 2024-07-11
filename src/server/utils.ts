import { IncomingMessage } from "http";

export function getClientJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on("data", (chunk: Buffer) => chunks.push(chunk))
      .on("end", () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString());
          resolve(json);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => reject(err));
  });
}

export function getMeta(
  body: unknown
): { valid: false } | { valid: true; procedureName: string; payload: object | null } {
  if (typeof body !== "object") {
    return { valid: false };
  }

  if (body === null) {
    return { valid: false };
  }

  if (
    "procedure" in body &&
    "payload" in body &&
    typeof body.procedure === "string" &&
    typeof body.payload === "object"
  ) {
    return { valid: true, procedureName: body.procedure, payload: body.payload };
  }

  return { valid: false };
}
