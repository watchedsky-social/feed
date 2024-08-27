export type DatabaseConfig = {
  host: string;
  username: string;
  password: string;
  name: string;
};

const defaultDatabaseConfig: Partial<DatabaseConfig> = {
  host: "pg.lab.verysmart.house",
  username: "watchedsky-social",
  name: "watchedsky-social",
};

export const makeConfig = (
  ...configs: Partial<DatabaseConfig>[]
): DatabaseConfig => {
  const config: Partial<DatabaseConfig> = {};
  configs.push(defaultDatabaseConfig);

  for (const cfg of configs) {
    config.host ??= cfg.host;
    config.username ??= cfg.username;
    config.password ??= cfg.password;
    config.name ??= cfg.name;
  }

  const missingFields: string[] = [];
  if (!config.host) {
    missingFields.push("host");
  }

  if (!config.username) {
    missingFields.push("username");
  }

  if (!config.password) {
    missingFields.push("password");
  }

  if (!config.name) {
    missingFields.push("name");
  }

  if (missingFields.length > 0) {
    throw new Error(
      `missing the following required fields: ${missingFields.join(", ")}`,
    );
  }

  return config as DatabaseConfig;
};
