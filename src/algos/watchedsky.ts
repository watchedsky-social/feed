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

const alertQueryBase = `
  SELECT a.skeet_info::jsonb->>'uri' AS uri, a.sent AS sent
  FROM alerts a
  WHERE
    ST_Intersects(
      ST_Buffer(a.border,0),
      ST_Buffer(
        (
          SELECT s.border AS border
          FROM saved_areas s
          WHERE id = $1
          LIMIT 1
        ), 0
      )
    )`;

const alertQueryCursorCondition = "AND a.sent < $2";
const alertQueryOrderLimits = (n: number): string => `ORDER BY a.sent DESC LIMIT $${n};`

const alertQuery = (cursor?: string): string => {
  let query = alertQueryBase;

  let n = 2;
  if (cursor) {
    query = `${query} ${alertQueryCursorCondition}`;
    n = 3;
  }

  return `${query} ${alertQueryOrderLimits(n)}`;
};

export const handler = async (
  ctx: AppContext,
  params: QueryParams,
  requesterDid?: string,
): Promise<AlgoOutput> => {
  if (requesterDid) {
    let watchID: string = "";

    try {
      const profile = await agent.api.app.bsky.actor.getProfile({
        actor: requesterDid,
      });

      if (profile.data.description) {
        const matches = watchIDRegex.exec(profile.data.description);
        if (matches?.length === 2) {
          watchID = matches[1];
        }
      }
    } catch (e) {
      appLogger.debug("NICE");
      return errorFeed;
    }

    if (watchID === "") {
      return noWatchIDFeed;
    }

    let client: PoolClient | undefined = undefined;
    try {
      client = await ctx.db.connect();

      const vars: (string | number)[] = [watchID];
      if (params.cursor) {
        vars.push(params.cursor);
      }
      vars.push(params.limit);

      const query = alertQuery(params.cursor);
      appLogger.debug({ ctx: "algos.watchedsky", query: query.replaceAll(/\s+/g, " "), vars: vars });
      const result = await client.query(alertQuery(params.cursor), vars);

      if (result.rows.length === 0) {
        appLogger.debug("LINE 90");
        return noAlertsFoundFeed;
      }

      const out: AlgoOutput = result.rows.reduce(
        (output, row) => {
          output.feed.push({ post: row["uri"] });
        },
        { feed: [] },
      );

      const lastRow = result.rows.at(-1);
      out.cursor = lastRow["sent"];
    } catch (e) {
      console.error(e);
      appLogger.debug({line: 104, error: e});
      return errorFeed;
    } finally {
      client?.release();
    }
  }

  appLogger.debug("LINE 111");
  return errorFeed;
};
