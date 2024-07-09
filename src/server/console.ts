import { AppComposition } from "../types";

export const bold = "\x1b[1m";
export const reset = "\x1b[0m";
export const underline = "\x1b[4m";
export const blue = "\x1b[34m";

function log(message: string) {
  console.log(`${bold}[basic-rpc]${reset} ${message}`);
}

export function logStartupInfo(procedures: AppComposition) {
  log("Starting server");
  log(`Application consists of ${Object.keys(procedures).length} procedures`);
  Object.keys(procedures).forEach((key) => {
    const procedure = procedures[key]!;
    const info = [];

    if (procedure.authentication) {
      info.push(`${blue}[Auth]${reset}`);
    }

    if (procedure.validator) {
      info.push("[Accepts payload]");
    }

    log(`Procedure: ${underline}${key}${reset} ${info.join(" - ")}`);
  });
}
