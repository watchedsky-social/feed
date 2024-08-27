import { AtUri } from "@atproto/syntax";

export type AlertsTable = {
  id?: string;
  headline?: string;
  sent?: Date;
  uri?: AtUri;
  border?: any;
};

export type Database = {
  alerts: AlertsTable;
};
