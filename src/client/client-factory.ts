import { Procedure } from "../server/procedure.js";
import { RpcServer } from "../server/rpc-server.js";

export function createClient<T extends RpcServer<any>>(rpcEndpoint: string = "/api/procedures/") {
  async function callRpc(
    procedure: string,
    payload: any,
    headers?: Record<string, string>,
    abortSignal?: AbortSignal
  ) {
    const response = await fetch(`${rpcEndpoint}${procedure}`, {
      method: "POST",
      body: JSON.stringify(payload ?? null),
      headers: { ...(headers ?? {}), ["Content-Type"]: "application/json" },
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} - ${response.statusText}}`);
    }

    return await response.json();
  }

  const cachedMethods = new Map<string, (...args: any[]) => any>();

  return new Proxy(
    {},
    {
      get: (_, procedure: string) => {
        if (cachedMethods.has(procedure)) {
          return cachedMethods.get(procedure);
        }
        cachedMethods.set(
          procedure,
          (first: unknown, second: undefined | OptionalRequestOptions) => {
            if (first === undefined || isOptionalParameters(first)) {
              return callRpc(procedure, null, first?.headers, first?.abortSignal);
            }
            return callRpc(procedure, first, second?.headers, second?.abortSignal);
          }
        );
        return cachedMethods.get(procedure);
      },
    }
  ) as InferredClient<T>;
}

type InferredClient<T> = T extends RpcServer<infer TS>
  ? { [Key in keyof TS]: RemoteProcedure<TS[Key]> }
  : never;

type RemoteProcedure<T> = T extends Procedure<infer PayloadType, infer ReturnType, any, any, any>
  ? PayloadType extends object
    ? (payload: PayloadType, parameters?: OptionalRequestOptions) => ClientReturnData<ReturnType>
    : (parameters?: OptionalRequestOptions) => ClientReturnData<ReturnType>
  : never;

type ClientReturnData<T> = Promise<T extends undefined ? never : T> extends Promise<never>
  ? Promise<void>
  : Promise<T extends undefined ? never : T>;

type OptionalRequestOptions = {
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
};

function isObj(obj: unknown): obj is object {
  return obj !== null && typeof obj === "object" && !Array.isArray(obj);
}

function isOptionalParameters(obj: unknown): obj is OptionalRequestOptions {
  if (!isObj(obj)) {
    return false;
  }

  if (
    "headers" in obj &&
    isObj(obj.headers) &&
    Object.keys(obj.headers).every((key) => typeof key === "string") &&
    Object.values(obj.headers).every((value) => typeof value === "string")
  ) {
    return true;
  }

  if ("abortSignal" in obj && obj.abortSignal instanceof AbortSignal) {
    return true;
  }

  return false;
}
