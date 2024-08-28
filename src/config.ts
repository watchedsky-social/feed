import { Client, Pool } from "pg";
import { Database, DatabaseConfig } from "./db";
import { DidResolver } from "@atproto/identity";

export type AppContext = {
  db: Pool;
  didResolver: DidResolver;
  cfg: Config;
};

export type Config = {
  port: number;
  listenhost: string;
  hostname: string;
  database: DatabaseConfig;
  serviceDid: string;
  publisherDid: string;
};
