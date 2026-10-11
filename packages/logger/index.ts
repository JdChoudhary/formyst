import winston from "winston";
import { env } from "./env";

type LoggerLevel = "error" | "warn" | "info" | "debug" | "verbose";

const isDevelopment = env.NODE_ENV === "development";

/**
 * An explicit LOGGER_LEVEL always wins. Otherwise development logs everything
 * from `debug` up, while production only emits `warn` and above — the previous
 * production default of `error` hid every warning.
 */
const logLevel: LoggerLevel = env.LOGGER_LEVEL ?? (isDevelopment ? "debug" : "warn");

const devFormat = winston.format.combine(
  // Makes Error instances (with their stack) serialisable to the console.
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";
    return `${timestamp} [${level}]: ${message}${metaString}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: logLevel,
  format: isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
  // A logging transport failure must never take down the process.
  exitOnError: false,
});

/** Normalises `logger.error("msg", err)` and `logger.error(err)` call shapes. */
export function logError(message: string, error: unknown): void {
  logger.error(message, { err: error });
}
