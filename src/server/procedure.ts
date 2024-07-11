import { Authenticator, ProcedureConfig, ProcedureFunction, Validator } from "../types.js";

export class Procedure<ClientPayload, ReturnData, User, AuthRequired extends boolean> {
  constructor(
    public procedure: ProcedureFunction<ClientPayload, ReturnData, User, AuthRequired>,
    public validator?: Validator<ClientPayload>,
    public authentication?: { authenticator: Authenticator<User>; require: boolean | undefined }
  ) {}
}

export function createProcedure<
  ClientPayload,
  ReturnData,
  User = undefined,
  AuthRequired extends boolean | undefined = undefined
>(
  config: ProcedureConfig<ClientPayload, ReturnData, User, AuthRequired>
): Procedure<ClientPayload, ReturnData, User, AuthRequired extends boolean ? AuthRequired : never> {
  return new Procedure(config.procedure, config.validator, config.authentication);
}
