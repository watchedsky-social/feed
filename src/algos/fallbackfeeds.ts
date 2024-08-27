import { OutputSchema as AlgoOutput } from "../lexicon/types/app/bsky/feed/getFeedSkeleton";
const noAlertsFoundFeed: AlgoOutput = {
  feed: [
    {
      post: "at://did:plc:hvjfuy2w6zqu6abmpkwcpulc/app.bsky.feed.post/3l2ptjrpzls2d",
    },
  ],
};
const errorFeed: AlgoOutput = {
  feed: [
    {
      post: "at://did:plc:hvjfuy2w6zqu6abmpkwcpulc/app.bsky.feed.post/3l2ptkrasqx2k",
    },
  ],
};
const noWatchIDFeed: AlgoOutput = {
  feed: [
    {
      post: "at://did:plc:hvjfuy2w6zqu6abmpkwcpulc/app.bsky.feed.post/3l2ptmim5bv25",
    },
  ],
};

export { noAlertsFoundFeed, errorFeed, noWatchIDFeed };
