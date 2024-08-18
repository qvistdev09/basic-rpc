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
