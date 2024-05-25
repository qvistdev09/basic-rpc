import { Procedure } from "./server/procedure.js";
import { IncomingMessage } from "http";

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
  AuthRequired extends boolean
> = ClientPayload extends undefined
  ? (ctx: Context<User, AuthRequired>) => Promise<ProcedureReturn<ReturnData>>
  : (
      ctx: Context<User, AuthRequired>,
      payload: ClientPayload
    ) => Promise<ProcedureReturn<ReturnData>>;

export type Context<User, AuthRequired extends boolean> = User extends undefined
  ? { req: IncomingMessage }
  : { req: IncomingMessage; user: AuthRequired extends true ? User : User | null };

export type ProcedureConfig<
  ClientPayload,
  ReturnData,
  User,
  AuthRequired extends boolean | undefined
> = {
  procedure: ProcedureFunction<
    ClientPayload,
    ReturnData,
    User,
    AuthRequired extends boolean ? AuthRequired : never
  >;
  validator?: Validator<ClientPayload>;
  authentication?: {
    authenticator: Authenticator<User>;
    require: AuthRequired extends boolean ? AuthRequired : never;
  };
};

export type AppComposition = { [key: string]: Procedure<any, any, any, any> | undefined };

export type Authenticator<User> = (token: string | null) => Promise<User | null>;
