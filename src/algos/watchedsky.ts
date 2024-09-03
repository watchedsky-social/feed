import AtpAgent from "@atproto/api";
import { PoolClient } from "pg";
import { AppContext } from "../config";
import {
  OutputSchema as AlgoOutput,
  QueryParams,
} from "../lexicon/types/app/bsky/feed/getFeedSkeleton";
import { appLogger } from "../logging";
import { errorFeed, noAlertsFoundFeed, noWatchIDFeed } from "./fallbackfeeds";

export const shortname = "watchedsky";

const watchIDRegex = /🌩️👀 ([a-zA-Z0-9\-_]{12})/;

const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

const alertQueryBase =
  "WITH target_area AS (SELECT border FROM saved_areas WHERE ID = $1::text LIMIT 1) " +
  "SELECT a.skeet_info::jsonb->>'uri' AS uri, EXTRACT(EPOCH FROM a.sent) * 1000 AS sent " +
  "FROM alerts a, target_area t WHERE skeet_info IS NOT NULL AND a.border && t.border " +
  "AND ST_Intersects(a.border, t.border)";

const alertQueryCursorCondition = "AND sent < $2::numeric";
const alertQueryOrderLimits = (n: number): string =>
  `ORDER BY sent DESC LIMIT $${n}::int;`;

const alertQuery = (cursor?: string): string => {
  let query = alertQueryBase;

  let n = 2;
  if (cursor) {
    query = `${query} ${alertQueryCursorCondition}`;
    n = 3;
  }

  return `${query} ${alertQueryOrderLimits(n)}`;
};

const saveDIDWID = async (
  client: PoolClient,
  did: string,
  wid: string,
): Promise<void> => {
  const query =
    "INSERT INTO didwids (did, wid) VALUES ($1, $2) ON CONFLICT(did) DO UPDATE SET wid=EXCLUDED.wid;";
  const vars = [did, wid];

  await client.query(query, vars);
};

const findWIDinDB = async (
  client: PoolClient,
  did: string,
): Promise<string> => {
  const query = "SELECT wid FROM didwids WHERE did = $1;";

  try {
    const response = await client.query(query, [did]);
    if (response.rows.length === 0) {
      return "";
    }

    return response.rows[0]["wid"];
  } catch (e) {
    return "";
  }
};

export const handler = async (
  ctx: AppContext,
  params: QueryParams,
  requesterDid?: string,
): Promise<AlgoOutput> => {
  if (requesterDid) {
    let watchID: string = "";

    let client: PoolClient | undefined = undefined;

    try {
      client = await ctx.db.connect();
      watchID = await findWIDinDB(client, requesterDid);

      if (watchID === "") {
        const profile = await agent.api.app.bsky.actor.getProfile({
          actor: requesterDid,
        });

        if (profile.data.description) {
          const matches = watchIDRegex.exec(profile.data.description);
          if (matches?.length === 2) {
            watchID = matches[1];
          }
        }
      }
    } catch (e) {
      return errorFeed;
    }

    if (watchID === "") {
      return noWatchIDFeed;
    }

    try {
      client = await ctx.db.connect();

      await saveDIDWID(client, requesterDid, watchID);

      const vars: (string | number)[] = [watchID];
      if (params.cursor) {
        vars.push(params.cursor);
      }
      vars.push(params.limit);

      const query = alertQuery(params.cursor);
      appLogger.debug({
        ctx: "algos.watchedsky",
        query,
        vars,
      });
      const result = await client.query(alertQuery(params.cursor), vars);

      if (result.rows.length === 0) {
        return noAlertsFoundFeed;
      }

      const feed = result.rows.map((row) => ({ post: row["uri"] as string }));

      const lastRow = result.rows.at(-1);
      const cursor = lastRow["sent"];
      return {
        feed: feed,
        cursor: feed.length < params.limit ? undefined : cursor,
      };
    } catch (e) {
      appLogger.debug({ line: 104, error: e });
      return errorFeed;
    } finally {
      client?.release();
    }
  }

  return errorFeed;
};
