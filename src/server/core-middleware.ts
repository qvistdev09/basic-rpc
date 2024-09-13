import { AppComposition, ErrorHandler, Middleware } from "./rpc-server.js";
import { getClientJson } from "./utils.js";
import {
  AuthenticationRequired,
  FailedPayloadValidation,
  InvalidContentType,
  InvalidHttpMethod,
  InvalidPayloadStructure,
  InvalidUrl,
  MissingProcedure,
  NoProcedureResponse,
  ProcedureDoesNotExist,
} from "./errors.js";
import { Registration } from "./dependency-injection/registration.js";
import { ContentType } from "./enums/content-type.js";
import { HttpMethod } from "./enums/http-method.js";

export const validateMethod: Middleware = async (ctx, next) => {
  if (ctx.req.httpMethod !== HttpMethod.Post) {
    return next(new InvalidHttpMethod());
  }
  next();
};

export const validateEndpoint = (rpcEndpoint: string): Middleware => {
  const endpointRegex = new RegExp(`^${rpcEndpoint}[a-zA-Z]+$`);

  return async (ctx, next) => {
    const { url } = ctx.req;

    if (!url || !endpointRegex.test(url)) {
      return next(new InvalidUrl(`RPC requests must be posted to '${rpcEndpoint}'`));
    }

    next();
  };
};

export const validateContentType: Middleware = async (ctx, next) => {
  if (ctx.req.contentType !== ContentType.ApplicationJson) {
    return next(new InvalidContentType());
  }
  next();
};

export const parseBody: Middleware = async (ctx, next) => {
  ctx.req.body = await getClientJson(ctx.req);
  next();
};

export const validateProcedure =
  (app: AppComposition): Middleware =>
  async (ctx, next) => {
    const procedureName = (ctx.req.url ?? "").split("/").pop()!;

    const procedure = app[procedureName];

    if (!procedure) {
      return next(new ProcedureDoesNotExist());
    }

    ctx.req.procedure = procedure;

    next();
  };

export const authenticate: Middleware = async (ctx, next) => {
  if (!ctx.req.procedure) {
    return next(new MissingProcedure());
  }

  if (!ctx.req.procedure.authenticator) {
    return next();
  }

  const authenticator =
    ctx.req.procedure.authenticator instanceof Registration
      ? ctx.container.getInstance(ctx.req.procedure.authenticator)
      : ctx.req.procedure.authenticator;

  ctx.req.user = await authenticator(ctx.req);

  if (ctx.req.procedure.authRequired && ctx.req.user === null) {
    return next(new AuthenticationRequired());
  }

  next();
};

export const validatePayload: Middleware = async (ctx, next) => {
  if (!ctx.req.procedure) {
    return next(new MissingProcedure());
  }

  if (!ctx.req.procedure.validator) {
    return next();
  }

  const validationResult = ctx.req.procedure.validator(ctx.req.body);

  if (!validationResult.valid) {
    return next(new FailedPayloadValidation(validationResult.errors));
  }

  next();
};

export const runProcedure: Middleware = async (ctx, next) => {
  const { procedure } = ctx.req;

  if (!procedure) {
    return next(new MissingProcedure());
  }

  const procedureArguments: any[] = [];

  if (procedure.validator) {
    procedureArguments.push(ctx.req.body);
  }

  if (procedure.authenticator) {
    procedureArguments.push(ctx.req.user);
  }

  const services = procedure.dependencies
    ? ctx.container.getInstances(...procedure.dependencies)
    : undefined;

  if (services) {
    procedureArguments.push(...services);
  }

  ctx.res.procedureReturn = await procedure.run(...procedureArguments);

  next();
};

export const sendProcedureResponse: Middleware = async (ctx, next) => {
  const { procedureReturn } = ctx.res;

  if (!procedureReturn) {
    return next(new NoProcedureResponse());
  }

  if ("data" in procedureReturn) {
    return ctx.res.status(procedureReturn.status).json(procedureReturn.data);
  }

  ctx.res.status(procedureReturn.status).message(procedureReturn.message);
};

export const defaultErrorHandler: ErrorHandler = async (err, ctx) => {
  if (err instanceof InvalidHttpMethod) {
    return ctx.res.status(405).message("Only post requests are allowed");
  }

  if (err instanceof InvalidUrl) {
    return ctx.res.status(404).message(err.invalidUrlMessage);
  }

  if (err instanceof InvalidContentType) {
    return ctx.res.status(415).message("Only content-type 'application/json' is allowed");
  }

  if (err instanceof InvalidPayloadStructure) {
    return ctx.res
      .status(400)
      .message(
        "Request body is not structured correctly. It should contain 'procedure' and 'payload'"
      );
  }

  if (err instanceof ProcedureDoesNotExist) {
    return ctx.res.status(400).message("Procedure does not exist");
  }

  if (err instanceof AuthenticationRequired) {
    return ctx.res.status(401).message("This procedure is only for authenticated users");
  }

  if (err instanceof FailedPayloadValidation) {
    return ctx.res.status(400).json(err.validationErrors);
  }

  console.log(err);
  ctx.res.status(500).message(JSON.stringify("Server error"));
};
