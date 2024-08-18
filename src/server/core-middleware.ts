import { AppComposition, ErrorHandler, Middleware } from "../types.js";
import { getClientJson } from "./utils.js";
import {
  AuthenticationRequired,
  FailedPayloadValidation,
  InvalidContentType,
  InvalidHttpMethod,
  InvalidPayloadStructure,
  InvalidUrl,
  MissingProcedure,
  MissingProcedureName,
  NoProcedureResponse,
  ProcedureDoesNotExist,
} from "./errors.js";
import { Registration } from "./dependency-injection/registration.js";

export const validateMethod: Middleware = async (ctx, next) => {
  if (ctx.req.getMethod() !== "POST") {
    return next(new InvalidHttpMethod());
  }
  next();
};

export const validateEndpoint = (rpcEndpoint: string): Middleware => {
  const endpointRegex = new RegExp(`^${rpcEndpoint}[a-zA-Z]+$`);

  return async (ctx, next) => {
    const requestUrl = ctx.req.getUrl();

    if (!requestUrl || !endpointRegex.test(requestUrl)) {
      return next(new InvalidUrl(`RPC requests must be posted to '${rpcEndpoint}'`));
    }

    next();
  };
};

export const validateContentType: Middleware = async (ctx, next) => {
  if (ctx.req.getContentType() !== "application/json") {
    return next(new InvalidContentType());
  }
  next();
};

export const parseBody: Middleware = async (ctx, next) => {
  if (ctx.req.getContentType() === "application/json") {
    ctx.req.body = await getClientJson(ctx.req.httpReq);
  }
  next();
};

export const validateMeta: Middleware = async (ctx, next) => {
  const procedureName = ctx.req.getUrl()!.split("/").pop()!;
  ctx.req.procedureName = procedureName;
  ctx.req.payload = ctx.req.body;
  next();
};

export const validateProcedure =
  (app: AppComposition): Middleware =>
  async (ctx, next) => {
    if (!ctx.req.procedureName) {
      return next(new MissingProcedureName());
    }

    const procedure = app[ctx.req.procedureName];

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

  if (!ctx.req.procedure.authentication) {
    return next();
  }

  const { authentication } = ctx.req.procedure;

  const authenticator =
    authentication.authenticator instanceof Registration
      ? ctx.container.getInstance(authentication.authenticator)
      : authentication.authenticator;

  ctx.req.user = await authenticator(ctx.req.httpReq);

  if (authentication.require && !ctx.req.user) {
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

  const validationResult = ctx.req.procedure.validator(ctx.req.payload);

  if (!validationResult.valid) {
    return next(new FailedPayloadValidation(validationResult.errors));
  }

  next();
};

export const runProcedure: Middleware = async (ctx, next) => {
  if (!ctx.req.procedure) {
    return next(new MissingProcedure());
  }

  const services = ctx.req.procedure.dependencies
    ? ctx.container.getInstances(...ctx.req.procedure.dependencies)
    : [];

  const context =
    ctx.req.user !== undefined
      ? { req: ctx.req.httpReq, user: ctx.req.user, services }
      : { req: ctx.req.httpReq, services };

  ctx.res.responseData = await ctx.req.procedure.procedure(context as any, ctx.req.payload);

  next();
};

export const sendProcedureResponse: Middleware = async (ctx, next) => {
  if (!ctx.res.responseData) {
    return next(new NoProcedureResponse());
  }

  if ("data" in ctx.res.responseData) {
    return ctx.res.status(ctx.res.responseData.status).json(ctx.res.responseData.data);
  }

  ctx.res.status(ctx.res.responseData.status).message(ctx.res.responseData.message);
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
