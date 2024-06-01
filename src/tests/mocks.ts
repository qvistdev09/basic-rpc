import http, { IncomingMessage, ServerResponse } from "http";

export class MockReq {
  private chunkListener: ((chunk: Buffer) => void) | undefined;
  private requestBody: string | undefined;

  public url: string | undefined = undefined;
  public method: string | undefined = undefined;
  public headers: Record<string, string> = {};

  public setUrl(url: string) {
    this.url = url;
    return this;
  }

  public setHeader(key: string, value: string) {
    this.headers[key] = value;
    return this;
  }

  public setBody(value: string) {
    this.requestBody = value;
    return this;
  }

  public setMethod(method: string) {
    this.method = method;
    return this;
  }

  public on(event: string, callback: Function) {
    if (event === "data") {
      this.chunkListener = callback as (chunk: Buffer) => void;
    }
    if (event === "end") {
      if (this.requestBody && this.chunkListener) {
        this.chunkListener(Buffer.from(this.requestBody));
      }
      callback();
    }
    return this;
  }
}

export class MockRes {
  private onEndListeners: Function[] = [];
  private responseReceived = false;

  public headers: Record<string, string> = {};
  public status: number | undefined = undefined;
  public data: any;

  public waitForResponse(): Promise<void> {
    let resolved = false;

    return new Promise((resolve, reject) => {
      if (this.responseReceived) {
        resolve();
        resolved = true;
      }

      this.onEndListeners.push(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("Waiting for response timed out"));
        }
      }, 5000);
    });
  }

  public setHeader(key: string, value: string) {
    this.headers[key] = value;
    return this;
  }

  public writeHead(status: number) {
    this.status = status;
    return this;
  }

  public end(data: any) {
    this.responseReceived = true;
    this.data = data;
    this.onEndListeners.forEach((listener) => listener());
  }
}

export class MockServer {
  private requestListener: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
  private port: number | null = null;

  private log(message: string) {
    console.log(`[Mock Server] ${message}`);
  }

  public on(event: string, callback: (req: IncomingMessage, res: ServerResponse) => void) {
    this.log(`Event listener was added for event: ${event}`);
    if (event === "request") {
      this.requestListener = callback;
    }
  }

  public listen(port: number, callback: () => void) {
    this.port = port;
    this.log(`Listen method called with port ${port}`);
    callback();
  }

  public emitMockHttpRequest(req: MockReq, res: MockRes) {
    if (!this.requestListener) {
      throw new Error(
        "Mock http request was emitted in a mock server without a 'request'-event listener"
      );
    }
    this.log("Emitting mock request");
    this.requestListener(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  }
}

const server = http.createServer();

server.on("request", (req, res) => {});
