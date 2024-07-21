import { Authenticator, ProcedureConfig, ProcedureFunction, Validator } from "../types.js";
import { DependencyArray } from "./dependency-injection/registration.js";

export class Procedure<
  ClientPayload,
  ReturnData,
  Dependencies extends DependencyArray,
  User,
  AuthRequired extends boolean
> {
  constructor(
    public procedure: ProcedureFunction<
      ClientPayload,
      ReturnData,
      User,
      AuthRequired,
      Dependencies
    >,
    public validator?: Validator<ClientPayload>,
    public authentication?: { authenticator: Authenticator<User>; require: boolean | undefined },
    public dependencies?: DependencyArray
  ) {}
}

export function createProcedure<
  ClientPayload,
  ReturnData,
  Dependencies extends DependencyArray,
  User = undefined,
  AuthRequired extends boolean | undefined = undefined
>(
  config: ProcedureConfig<ClientPayload, ReturnData, User, AuthRequired, Dependencies>
): Procedure<
  ClientPayload,
  ReturnData,
  Dependencies,
  User,
  AuthRequired extends boolean ? AuthRequired : never
> {
  return new Procedure(
    config.procedure,
    config.validator,
    config.authentication,
    config.dependencies
  );
}
