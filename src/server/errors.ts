export class MissingProcedureName extends Error {}

export class MissingProcedure extends Error {}

export class InvalidHttpMethod extends Error {}

export class InvalidUrl extends Error {
  constructor(public invalidUrlMessage: string) {
    super();
  }
}

export class InvalidContentType extends Error {}

export class InvalidPayloadStructure extends Error {}

export class ProcedureDoesNotExist extends Error {}

export class AuthenticationRequired extends Error {}

export class FailedPayloadValidation extends Error {
  constructor(public validationErrors: { location: string; message: string }[]) {
    super();
  }
}
