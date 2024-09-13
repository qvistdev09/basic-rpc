import { Registration } from "./registration.js";
import { Req } from "../http-req.js";
import { Res } from "../http-res.js";

export const REQ = Registration.scoped(() => null as unknown as Req);

export const RES = Registration.scoped(() => null as unknown as Res);
