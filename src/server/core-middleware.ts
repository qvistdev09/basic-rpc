import { AppComposition, Middleware } from "../types.js";
import { getClientJson, getMeta } from "./utils.js";
import { MissingProcedure, MissingProcedureName } from "./errors.js";

export const validateMethod: Middleware = async (req, res, next) => {
  if (req.getMethod() !== "POST") {
    return res.status(405).message("Only post requests are allowed");
  }
  next();
};

export const validateEndpoint =
  (getEndpoint: () => string): Middleware =>
  async (req, res, next) => {
    const endpoint = getEndpoint();
    const requestUrl = req.getUrl();

    if (!requestUrl || requestUrl !== endpoint) {
      return res.status(404).message(`Requests must be posted to '${endpoint}'`);
    }

    next();
  };

export const validateContentType: Middleware = async (req, res, next) => {
  if (req.getContentType() !== "application/json") {
    return res.status(415).message("Only content-type 'application/json' is allowed");
  }
  next();
};

export const parseBody: Middleware = async (req, res, next) => {
  req.body = await getClientJson(req.httpReq);
  next();
};

export const validateMeta: Middleware = async (req, res, next) => {
  const meta = getMeta(req.body);

  if (!meta.valid) {
    return res
      .status(400)
      .message(
        "Request body is not structured correctly. It should contain 'procedure' and 'payload'"
      );
  }

  req.procedureName = meta.procedureName;
  req.payload = meta.payload;

  next();
};

export const validateProcedure =
  (app: AppComposition): Middleware =>
  async (req, res, next) => {
    if (!req.procedureName) {
      throw new MissingProcedureName();
    }

    const procedure = app[req.procedureName];

    if (!procedure) {
      return res.status(400).message("Procedure does not exist");
    }

    req.procedure = procedure;

    next();
  };

export const authenticate: Middleware = async (req, res, next) => {
  if (!req.procedure) {
    throw new MissingProcedure();
  }

  if (!req.procedure.authentication) {
    return next();
  }

  const { authenticator, require } = req.procedure.authentication;

  req.user = await authenticator(req.getHeader("authorization"));

  if (require && req.user === undefined) {
    return res.status(401).message("This procedure is only for authenticated users");
  }

  next();
};

export const validatePayload: Middleware = async (req, res, next) => {
  if (!req.procedure) {
    throw new MissingProcedure();
  }

  if (req.procedure.validator) {
    const validationResult = req.procedure.validator(req.payload);

    if (!validationResult.valid) {
      return res.status(400).json(validationResult.errors);
    }
  }

  next();
};

export const runProcedure: Middleware = async (req, res, next) => {
  if (!req.procedure) {
    throw new MissingProcedure();
  }

  const context =
    req.user !== undefined ? { req: req.httpReq, user: req.user } : { req: req.httpReq };

  const output = await req.procedure.procedure(context, req.payload);

  if ("data" in output) {
    return res.status(output.status).json(output.data);
  }

  res.status(output.status).message(output.message);
};
