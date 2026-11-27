// One shared pino logger for the whole service.
// pino writes one JSON object per line, so tools like CloudWatch can search the fields.
// LOG_LEVEL picks how much to log: trace, debug, info (default), warn, error, fatal, silent.
import { pino } from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
