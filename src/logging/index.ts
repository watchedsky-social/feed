import { NextFunction, Request, Response } from "express";
import winston, { createLogger } from "winston";

const logLevel = (process.env.FEEDGEN_LOG_LEVEL ?? "info").toLowerCase();

export const appLogger = createLogger({
  format: winston.format.json(),
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
