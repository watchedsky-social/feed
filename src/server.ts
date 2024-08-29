import { DidResolver, MemoryCache } from "@atproto/identity";
import events from "events";
import express from "express";
import http from "http";
import { AppContext, Config } from "./config";
import { createDB, Database } from "./db";
import { createServer } from "./lexicon";
import describeGenerator from "./methods/describe-generator";
import feedGeneration from "./methods/feed-generation";
import wellKnown from "./well-known";
import packageJSON from "../package.json";
import { PoolClient } from "pg";
import { loggerMiddleware } from "./logging";

export class FeedGenerator {
  public app: express.Application;
  public server?: http.Server;
  public db: Database;
  public cfg: Config;

  constructor(app: express.Application, db: Database, cfg: Config) {
    this.app = app;
    this.db = db;
    this.cfg = cfg;
  }

  static create(cfg: Config) {
    const app = express();
    const db = createDB(cfg.database);

    const didCache = new MemoryCache();
    const didResolver = new DidResolver({
      plcUrl: "https://plc.directory",
      didCache,
    });

    const server = createServer({
      validateResponse: true,
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    });
    const ctx: AppContext = {
      db,
      didResolver,
      cfg,
    };
    feedGeneration(server, ctx);
    describeGenerator(server, ctx);
    app.enable("trust proxy");
    app.use(loggerMiddleware);
    app.use(server.xrpc.router);
    app.use(wellKnown(ctx));
    app.get("/livez", (_, res) => {
      ctx.db
        .connect()
        .then((client: PoolClient) => {
          client.release();
          res.sendStatus(200);
        })
        .catch((e) => {
          res.status(500).json(e);
        });
    });
    app.get("/readyz", (_, res) => {
      res.sendStatus(200);
    });
    app.get("/version", (_, res) => {
      const kw = packageJSON.keywords.filter((k: string) =>
        k.startsWith("ref:"),
      );
      let build_id = "";
      if (kw.length > 0) {
        build_id = kw[0].replace("ref:", "");
      }
      const version = packageJSON.version;
      res.status(200).json({ version, build_id });
    });

    return new FeedGenerator(app, db, cfg);
  }

  async start(): Promise<http.Server> {
    this.server = this.app.listen(this.cfg.port, this.cfg.listenhost);
    await events.once(this.server, "listening");
    return this.server;
  }
}

export default FeedGenerator;
