import { RpcServer } from "../server/rpc-server.js";
import { InferredClient } from "../types.js";

export function createClient<T extends RpcServer<any>>(rpcEndpoint: string = "/api/procedures/") {
  async function callRpc(
    procedure: string,
    payload: any,
    headers?: Record<string, string>,
    abortController?: AbortController
  ) {
    const response = await fetch(`${rpcEndpoint}${procedure}`, {
      method: "POST",
      body: JSON.stringify(payload ?? null),
      headers: { ...(headers ?? {}), ["Content-Type"]: "application/json" },
      signal: abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} - ${response.statusText}}`);
    }

    return await response.json();
  }

  return new Proxy(
    {},
    {
      get: (target, procedure: string) => {
        return (parameters?: GenericParameters) =>
          callRpc(procedure, parameters?.payload, parameters?.headers, parameters?.abortController);
      },
    }
  ) as InferredClient<T>;
}

type GenericParameters = {
  payload: any;
  headers?: Record<string, string>;
  abortController?: AbortController;
};
