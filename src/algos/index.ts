import { AppContext } from "../config";
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from "../lexicon/types/app/bsky/feed/getFeedSkeleton";
import * as watchedsky from "./watchedsky";

type AlgoHandler = (
  ctx: AppContext,
  params: QueryParams,
  requesterDid?: string,
) => Promise<AlgoOutput>;

const algos: Record<string, AlgoHandler> = {
  [watchedsky.shortname]: watchedsky.handler,
};

export default algos;
