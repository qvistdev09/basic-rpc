import { IncomingMessage } from "http";
import { Procedure } from "./server/procedure.js";
import { RpcRequest, RpcResponse } from "./server/rpc-http.js";
import { RpcServer } from "./server/rpc-server.js";
import { ScopedContainer } from "./server/dependency-injection/scoped-container.js";
import { DependencyArray, MappedDependencies } from "./server/dependency-injection/registration.js";

export type ProcedureReturn<ReturnData> =
  | { data: ReturnData; status: number }
  | { status: number; message: string };

export type Validator<ClientPayload> = (
  data: unknown
) =>
  | { valid: true; data: ClientPayload }
  | { valid: false; errors: { message: string; location: string }[] };

export type ProcedureFunction<
  ClientPayload,
  ReturnData,
  User,
  AuthRequired extends boolean,
  Dependencies extends DependencyArray
> = ClientPayload extends undefined
  ? (ctx: Context<User, AuthRequired, Dependencies>) => Promise<ProcedureReturn<ReturnData>>
  : (
      ctx: Context<User, AuthRequired, Dependencies>,
      payload: ClientPayload
    ) => Promise<ProcedureReturn<ReturnData>>;

export type Context<
  User,
  AuthRequired extends boolean,
  Dependencies extends DependencyArray
> = User extends undefined
  ? {
      req: IncomingMessage;
      services: Dependencies extends undefined ? [] : MappedDependencies<Dependencies>;
    }
  : {
      req: IncomingMessage;
      services: Dependencies extends undefined ? [] : MappedDependencies<Dependencies>;
      user: AuthRequired extends true ? User : User | null;
    };

export type ProcedureConfig<
  ClientPayload,
  ReturnData,
  User,
  AuthRequired extends boolean | undefined,
  Dependencies extends DependencyArray
> = {
  procedure: ProcedureFunction<
    ClientPayload,
    ReturnData,
    User,
    AuthRequired extends boolean ? AuthRequired : never,
    Dependencies
  >;
  validator?: Validator<ClientPayload>;
  authentication?: {
    authenticator: Authenticator<User>;
    require: AuthRequired extends boolean ? AuthRequired : never;
  };
  dependencies?: Dependencies;
};

export type AppComposition = { [key: string]: Procedure<any, any, any, any, any> | undefined };

export type Authenticator<User> = (req: IncomingMessage) => Promise<User | null>;

export type InferredClient<T extends RpcServer<any>> = T extends RpcServer<infer TS>
  ? { [Key in keyof TS]: RemoteProcedure<TS[Key]> }
  : never;

type ClientParametersPayload<T> = {
  payload: T;
  headers?: Record<string, string>;
  abortController?: AbortController;
};

type ClientParameters = {
  headers?: Record<string, string>;
  abortController?: AbortController;
};

export type RemoteProcedure<T> = T extends Procedure<
  infer ClientPayload,
  infer ReturnData,
  any,
  any,
  any
>
  ? ClientPayload extends object
    ? (
        parameters: ClientParametersPayload<ClientPayload>
      ) => ReturnData extends undefined ? never : Promise<ReturnData>
    : (parameters?: ClientParameters) => ReturnData extends undefined ? never : Promise<ReturnData>
  : never;

export type Middleware = (ctx: MiddlewareContext, next: Next) => Promise<void>;

export type ErrorHandler = (err: any, ctx: MiddlewareContext, next: Next) => Promise<void>;

export type Next = (err?: any) => void;

export type MiddlewareContext = {
  req: RpcRequest;
  res: RpcResponse;
  container: ScopedContainer;
};
