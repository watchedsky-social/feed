import { Client } from "pg";
import { Database, DatabaseConfig } from "./db";
import { DidResolver } from "@atproto/identity";

export type AppContext = {
  db: Database;
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
