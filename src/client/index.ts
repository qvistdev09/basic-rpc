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

  const cachedMethods = new Map<string, (parameters?: GenericParameters) => any>();

  return new Proxy(
    {},
    {
      get: (_, procedure: string) => {
        if (cachedMethods.has(procedure)) {
          return cachedMethods.get(procedure);
        }
        cachedMethods.set(procedure, (parameters?: GenericParameters) =>
          callRpc(procedure, parameters?.payload, parameters?.headers, parameters?.abortController)
        );
        return cachedMethods.get(procedure);
      },
    }
  ) as InferredClient<T>;
}

type GenericParameters = {
  payload: any;
  headers?: Record<string, string>;
  abortController?: AbortController;
};
