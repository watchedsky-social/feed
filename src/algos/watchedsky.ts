import { sql } from "kysely";
import { AppContext } from "../config";
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from "../lexicon/types/app/bsky/feed/getFeedSkeleton";
import AtpAgent, { AppBskyActorGetProfile } from "@atproto/api";
import { errorFeed, noAlertsFoundFeed, noWatchIDFeed } from "./fallbackfeeds";
import { PoolClient } from "pg";

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
          WHERE id = ?
          LIMIT 1
        ), 0
      )
    )`;

const alertQueryCursorCondition = "AND a.sent < ?";
const alertQueryOrderLimits = "ORDER BY a.sent DESC LIMIT ?;";

const alertQuery = (cursor?: string): string => {
  let query = alertQueryBase;

  if (cursor) {
    query = `${query} ${alertQueryCursorCondition}`
  }

  return `${query} ${alertQueryOrderLimits}`;
}

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
      return errorFeed;
    }

    if (watchID === "") {
      return noWatchIDFeed;
    }

    let client: PoolClient | undefined = undefined;
    try {
      client = await ctx.db.connect();

      const vars: (string|number)[] = [watchID];
      if (params.cursor) {
        vars.push(params.cursor);
      }
      vars.push(params.limit);

      const result = await client.query(alertQuery(params.cursor), vars);

      if (result.rows.length === 0) {
        return noAlertsFoundFeed;
      }

      const out: AlgoOutput =  result.rows.reduce(
        (output, row) => {
          output.feed.push({ post: row["uri"] });
        },
        { feed: [] },
      );


    } catch (e) {
      return errorFeed;
    } finally {
      client?.release();
    }
  }

  return errorFeed;
};
