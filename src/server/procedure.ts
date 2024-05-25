import { Authenticator, ProcedureFunction, Validator } from "../types.js";

export class Procedure<ClientPayload, ReturnData, User, AuthRequired extends boolean> {
  constructor(
    public procedure: ProcedureFunction<ClientPayload, ReturnData, User, AuthRequired>,
    public validator?: Validator<ClientPayload>,
    public authentication?: { authenticator: Authenticator<User>; require: boolean | undefined }
  ) {}
}
