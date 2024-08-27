import { Pool } from "pg";
import { DatabaseConfig } from "./config";

export { DatabaseConfig } from "./config";

export type Database = Pool;

export const createDB = (cfg: DatabaseConfig): Database => {
  return new Pool({
    database: cfg.name,
    host: cfg.host,
    user: cfg.username,
    password: cfg.password,
    ssl: true,
    max: 50,
  });
};
