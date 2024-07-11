import { RpcServer } from "../server/rpc-server.js";
import { InferredClient } from "../types.js";

export function createClient<T extends RpcServer<any>>(rpcEndpoint: string) {
  async function callRpc(
    procedure: string,
    payload: any,
    headers?: Record<string, string>,
    abortController?: AbortController
  ) {
    const response = await fetch(rpcEndpoint, {
      method: "POST",
      body: JSON.stringify({ payload: payload ?? null, procedure }),
      headers,
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
        return ({ payload, headers, abortController }: GenericParameters) =>
          callRpc(procedure, payload, headers, abortController);
      },
    }
  ) as InferredClient<T>;
}

type GenericParameters = {
  payload: any;
  headers?: Record<string, string>;
  abortController?: AbortController;
};
