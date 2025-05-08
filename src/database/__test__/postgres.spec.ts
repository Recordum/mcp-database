import { getCaPath } from "../../util/path.js";
import { DatabaseType } from "../driver.js";
import { PostgresDriver } from "../drivers/postgres.js";

let driver: PostgresDriver;
const baseConfig = {
  username: "testuser",
  password: "testpass",
  database: "postgres",
};

afterEach(async () => {
  if (driver) {
    await driver.cleanup();
  }
});

describe("Postgres SSL connection tests", () => {
  it("should connect to non-SSL postgres", async () => {
    driver = new PostgresDriver({
      host: "localhost",
      port: 5450,
      connectionAlias: "no-ssl",
      type: DatabaseType.POSTGRES,
      ssl: false,
      ...baseConfig,
    });

    await expect(driver.connect()).resolves.not.toThrow();
    await driver.disconnect();
  });

  it("should connect to SSL postgres with rejectUnauthorized=false", async () => {
    driver = new PostgresDriver({
      host: "localhost",
      port: 5455,
      connectionAlias: "ssl-no-auth",
      type: DatabaseType.POSTGRES,
      ssl: {
        rejectUnauthorized: false,
      },
      ...baseConfig,
    });

    await expect(driver.connect()).resolves.not.toThrow();
    await driver.disconnect();
  });

  it("should connect to SSL postgres with CA", async () => {
    driver = new PostgresDriver({
      host: "localhost",
      port: 5455,
      connectionAlias: "ssl-auth",
      type: DatabaseType.POSTGRES,
      ssl: {
        rejectUnauthorized: true,
        ca: getCaPath("postgres"),
      },
      ...baseConfig,
    });

    await expect(driver.connect()).resolves.not.toThrow();
    await driver.disconnect();
  });

  it("should fail to connect to SSL postgres without ssl config", async () => {
    driver = new PostgresDriver({
      host: "localhost",
      port: 5455,
      connectionAlias: "missing-ssl",
      type: DatabaseType.POSTGRES,
      ssl: false,
      ...baseConfig,
    });

    await expect(driver.connect()).rejects.toThrow(/no encryption/);
  });
});
