import { AppComposition, ErrorHandler, Middleware } from "../types.js";
import { getClientJson, getMeta } from "./utils.js";
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

export const validateMethod: Middleware = async (req, res, next) => {
  if (req.getMethod() !== "POST") {
    return next(new InvalidHttpMethod());
  }
  next();
};

export const validateEndpoint =
  (rpcEndpoint: string): Middleware =>
  async (req, res, next) => {
    const requestUrl = req.getUrl();

    if (!requestUrl || requestUrl !== rpcEndpoint) {
      return next(new InvalidUrl(`Requests must be posted to '${rpcEndpoint}'`));
    }

    next();
  };

export const validateContentType: Middleware = async (req, res, next) => {
  if (req.getContentType() !== "application/json") {
    return next(new InvalidContentType());
  }
  next();
};

export const parseBody: Middleware = async (req, res, next) => {
  if (req.getContentType() === "application/json") {
    req.body = await getClientJson(req.httpReq);
  }
  next();
};

export const validateMeta: Middleware = async (req, res, next) => {
  const meta = getMeta(req.body);

  if (!meta.valid) {
    return next(new InvalidPayloadStructure());
  }

  req.procedureName = meta.procedureName;
  req.payload = meta.payload;

  next();
};

export const validateProcedure =
  (app: AppComposition): Middleware =>
  async (req, res, next) => {
    if (!req.procedureName) {
      return next(new MissingProcedureName());
    }

    const procedure = app[req.procedureName];

    if (!procedure) {
      return next(new ProcedureDoesNotExist());
    }

    req.procedure = procedure;

    next();
  };

export const authenticate: Middleware = async (req, res, next) => {
  if (!req.procedure) {
    return next(new MissingProcedure());
  }

  if (!req.procedure.authentication) {
    return next();
  }

  const { authenticator, require } = req.procedure.authentication;

  req.user = await authenticator(req.getHeader("authorization"));

  if (require && req.user === undefined) {
    return next(new AuthenticationRequired());
  }

  next();
};

export const validatePayload: Middleware = async (req, res, next) => {
  if (!req.procedure) {
    return next(new MissingProcedure());
  }

  if (!req.procedure.validator) {
    return next();
  }

  const validationResult = req.procedure.validator(req.payload);

  if (!validationResult.valid) {
    return next(new FailedPayloadValidation(validationResult.errors));
  }

  next();
};

export const runProcedure: Middleware = async (req, res, next) => {
  if (!req.procedure) {
    return next(new MissingProcedure());
  }

  const context =
    req.user !== undefined ? { req: req.httpReq, user: req.user } : { req: req.httpReq };

  res.responseData = await req.procedure.procedure(context, req.payload);

  next();
};

export const sendProcedureResponse: Middleware = async (req, res, next) => {
  if (!res.responseData) {
    return next(new NoProcedureResponse());
  }

  if ("data" in res.responseData) {
    return res.status(res.responseData.status).json(res.responseData.data);
  }

  res.status(res.responseData.status).message(res.responseData.message);
};

export const defaultErrorHandler: ErrorHandler = async (err, req, res, next) => {
  if (err instanceof InvalidHttpMethod) {
    return res.status(405).message("Only post requests are allowed");
  }

  if (err instanceof InvalidUrl) {
    return res.status(404).message(err.invalidUrlMessage);
  }

  if (err instanceof InvalidContentType) {
    return res.status(415).message("Only content-type 'application/json' is allowed");
  }

  if (err instanceof InvalidPayloadStructure) {
    return res
      .status(400)
      .message(
        "Request body is not structured correctly. It should contain 'procedure' and 'payload'"
      );
  }

  if (err instanceof ProcedureDoesNotExist) {
    return res.status(400).message("Procedure does not exist");
  }

  if (err instanceof AuthenticationRequired) {
    return res.status(401).message("This procedure is only for authenticated users");
  }

  if (err instanceof FailedPayloadValidation) {
    return res.status(400).json(err.validationErrors);
  }

  console.log(err);
  res.status(500).message(JSON.stringify("Server error"));
};
