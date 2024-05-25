import { Procedure } from "./server/procedure.js";

export type Return<R> = { data: R; status: number } | { status: number; message: string };

export type Validator<P> = (
  data: unknown
) => { valid: true; data: P } | { valid: false; errors: { message: string; location: string }[] };

export type MainFunction<P, R> = (ctx: Context, payload: P) => Promise<Return<R>>;

export type Context = {};

export type ProcedureConfig<P, R> = {
  validator: Validator<P>;
  mainFunction: MainFunction<P, R>;
};

export type AppComposition = { [key: string]: Procedure<any, any> | undefined };
