import {
  DatabaseDriver,
  DatabaseType,
  BaseConfig,
  MySQLConfig,
  PostgresConfig,
  DatabaseConfig,
} from "./driver.js";
import { MySQLDriver } from "./drivers/mysql.js";
import { PostgresDriver } from "./drivers/postgres.js";
import * as fs from "fs";

export class DatabaseFactory {
  // 지정된 데이터베이스 유형에 맞는 드라이버 인스턴스 생성 (설정 주입)
  static createDriver(config: DatabaseConfig): DatabaseDriver {
    switch (config.type) {
      case DatabaseType.MYSQL:
        return new MySQLDriver(config);
      case DatabaseType.POSTGRES:
        return new PostgresDriver(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
}
