import { NextFunction, Request, Response } from "express";
import winston, { createLogger, format } from "winston";

const logLevel = (process.env.FEEDGEN_LOG_LEVEL ?? "info").toLowerCase();

// taken from https://github.com/winstonjs/logform/issues/290
interface ParsedError {
  readonly message: string;
  readonly originalLine: number;
  readonly originalColumn: number;
  readonly line: number;
  readonly column: number;
  readonly sourceURL: string;
  readonly stack: string;
}

/** Turns an error into a plain object. */
function parseError(err: Error): ParsedError {
  return JSON.parse(
    JSON.stringify(err, Object.getOwnPropertyNames(err)),
  ) as ParsedError;
}

const jsonReplacer = (key: string, value: unknown): any => {
  if (value instanceof Error) {
    return parseError(value);
  }

  return value;
};

export const appLogger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.json({ deterministic: true, space: 0, replacer: jsonReplacer }),
  ),
  level: logLevel,
  handleExceptions: true,
  handleRejections: true,
  exitOnError: false,
  transports: [new winston.transports.Console()],
});

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => {
  const { ip, method, path } = req;

  if (!path.startsWith("/xrpc")) {
    if (next) {
      next();
    }
    return;
  }

  const ua = req.headers["user-agent"] ?? "-";

  const start = Date.now();
  if (next) {
    next();
  }
  const end = Date.now();
  const elapsedTime = end - start;

  const status = res.statusCode;
  appLogger.info({ ip, method, path, status, elapsedTime, ua });
};
