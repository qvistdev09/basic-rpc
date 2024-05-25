import { RpcServer } from "../server/rpc-server.js";
import { InferredClient } from "../types.js";

export function createClient<T extends RpcServer<any>>(
  rpcEndpoint: string,
  tokenRetriever: () => Promise<string>
) {
  async function authenticatedFetch(procedure: string, payload: any) {
    const token = await tokenRetriever();

    const response = await fetch(rpcEndpoint, {
      method: "POST",
      body: JSON.stringify({ payload: payload ?? null, procedure }),
      headers: { "content-type": "application/json", Authorization: token },
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
        return (payload: any) => authenticatedFetch(procedure, payload);
      },
    }
  ) as InferredClient<T>;
}
