import {
  DependencyArray,
  MappedDependencies,
  Registration,
} from "./dependency-injection/registration.js";
import { Req } from "./http-req.js";

export class Procedure<
  ClientPayload = undefined,
  ReturnData = undefined,
  UserType = undefined,
  Dependencies extends DependencyArray | undefined = undefined,
  AuthRequired extends boolean = false
> {
  public readonly validator?: Validator<ClientPayload>;

  public readonly authenticator?: Authenticator<UserType>;

  public readonly authRequired: boolean;

  public readonly run: ProcedureFunction<
    ClientPayload,
    ReturnData,
    UserType,
    Dependencies,
    AuthRequired
  >;

  public readonly dependencies: DependencyArray | null;

  constructor({
    validator,
    authentication,
    procedure,
    dependencies,
  }: ProcedureConfig<ClientPayload, ReturnData, UserType, Dependencies, AuthRequired>) {
    this.validator = validator;
    this.authenticator = authentication?.authenticator;
    this.authRequired = authentication?.require ?? false;
    this.run = procedure;
    this.dependencies = dependencies ?? null;
  }
}

export type Authenticator<UserType> =
  | ((req: Req) => Promise<UserType | null>)
  | Registration<(req: Req) => Promise<UserType | null>, DependencyArray | undefined>;

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
  UserType,
  Dependencies extends DependencyArray | undefined,
  AuthRequired extends boolean
> = (
  ...args: Dependencies extends DependencyArray
    ? ProcedureArguments<ClientPayload, UserType, Dependencies, AuthRequired>
    : ProcedureArgumentsWithoutServices<ClientPayload, UserType, AuthRequired>
) => Promise<ProcedureReturn<ReturnData>>;

type ProcedureArgumentsWithoutServices<ClientPayload, UserType, AuthRequired extends boolean> = [
  ...(ClientPayload extends undefined ? [] : [ClientPayload]),
  ...(UserType extends undefined ? [] : [AuthRequired extends true ? UserType : UserType | null])
];

type ProcedureArguments<
  ClientPayload,
  UserType,
  Dependencies extends DependencyArray,
  AuthRequired extends boolean
> = [
  ...(ClientPayload extends undefined ? [] : [ClientPayload]),
  ...(UserType extends undefined ? [] : [AuthRequired extends true ? UserType : UserType | null]),
  ...MappedDependencies<Dependencies>
];

export type ProcedureConfig<
  ClientPayload = undefined,
  ReturnData = undefined,
  UserType = undefined,
  Dependencies extends DependencyArray | undefined = undefined,
  AuthRequired extends boolean = false
> = {
  validator?: Validator<ClientPayload>;
  authentication?: {
    authenticator: Authenticator<UserType>;
    require?: AuthRequired;
  };
  dependencies?: Dependencies;
  procedure: ProcedureFunction<ClientPayload, ReturnData, UserType, Dependencies, AuthRequired>;
};
