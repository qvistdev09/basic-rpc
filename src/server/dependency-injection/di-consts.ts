import { IncomingMessage, ServerResponse } from "http";
import { createServiceRegistration } from "./registration.js";

export const INCOMING_MESSAGE = createServiceRegistration(
  "scoped",
  () => null as unknown as IncomingMessage
);

export const SERVER_RESPONSE = createServiceRegistration(
  "scoped",
  () => null as unknown as ServerResponse
);
