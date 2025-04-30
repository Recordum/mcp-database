import {
  RelationalDBConfig,
  DatabaseType,
  DatabaseConfig,
  PostgresConfig,
  MySQLConfig,
} from "../database/driver.js";

/**
 * 환경 변수로부터 설정 생성 & validation
 */
export class EnvConfig {
  private aliases: string[] = [];
  constructor() {
    const aliases = process.env.DB_ALIASES?.split(",");
    if (!aliases) {
      throw new Error("DB_ALIASES is not set");
    }
    this.aliases = aliases.map((alias) => alias.trim());
  }

  getConfigs(): DatabaseConfig[] {
    return this.aliases.map((alias) => this.extractConfigFromEnv(alias));
  }

  private extractConfigFromEnv(alias: string): DatabaseConfig {
    const typeEnv = process.env[`DB_${alias.toUpperCase()}_TYPE`];
    if (!typeEnv) {
      throw new Error(`DB_${alias.toUpperCase()}_TYPE is not set`);
    }
    const validTypes = Object.values(DatabaseType);
    if (!validTypes.includes(typeEnv as DatabaseType)) {
      throw new Error(
        `Unsupported database type for alias ${alias}: ${typeEnv}`
      );
    }

    switch (typeEnv) {
      case DatabaseType.MYSQL:
        return this.extractMySQLConfig(alias);
      case DatabaseType.POSTGRES:
        return this.extractPostgresConfig(alias);
      default:
        throw new Error(
          `Unsupported database type for alias ${alias}: ${typeEnv}`
        );
    }
  }

  private extractMySQLConfig(alias: string): MySQLConfig {
    const host = process.env[`DB_${alias.toUpperCase()}_HOST`];
    const port = process.env[`DB_${alias.toUpperCase()}_PORT`]
      ? parseInt(process.env[`DB_${alias.toUpperCase()}_PORT`]!, 10)
      : undefined;
    const username = process.env[`DB_${alias.toUpperCase()}_USERNAME`];
    const password = process.env[`DB_${alias.toUpperCase()}_PASSWORD`];
    const database = process.env[`DB_${alias.toUpperCase()}_DATABASE`];

    if (!host || !username || !password || !database) {
      throw new Error(`Missing required config for alias ${alias}`);
    }

    const config = {
      type: DatabaseType.MYSQL,
      connectionAlias: alias,
      host,
      port,
      username,
      password,
      database,
    };

    return this.setSSLConfig(config);
  }

  private extractPostgresConfig(alias: string): PostgresConfig {
    const host = process.env[`DB_${alias.toUpperCase()}_HOST`];
    const port = process.env[`DB_${alias.toUpperCase()}_PORT`]
      ? parseInt(process.env[`DB_${alias.toUpperCase()}_PORT`]!, 10)
      : undefined;
    const username = process.env[`DB_${alias.toUpperCase()}_USERNAME`];
    const password = process.env[`DB_${alias.toUpperCase()}_PASSWORD`];
    const database = process.env[`DB_${alias.toUpperCase()}_DATABASE`];

    if (!host || !username || !password || !database) {
      throw new Error(`Missing required config for alias ${alias}`);
    }

    const config = {
      type: DatabaseType.POSTGRES,
      connectionAlias: alias,
      host,
      port,
      username,
      password,
      database,
    };

    return this.setSSLConfig(config);
  }

  private setSSLConfig(config: DatabaseConfig): DatabaseConfig {
    const prefix = `DB_${config.connectionAlias.toUpperCase()}_`;
    // SSL 활성화 여부
    const sslEnabled = process.env[`${prefix}SSL_ENABLED`] === "true";
    if (!sslEnabled) return config;

    // 기본 SSL 설정
    const ssl: Record<string, any> = {};

    // RejectUnauthorized 설정
    if (process.env[`${prefix}SSL_REJECT_UNAUTHORIZED`] !== undefined) {
      ssl.rejectUnauthorized =
        process.env[`${prefix}SSL_REJECT_UNAUTHORIZED`] === "true";
    }

    //todo 실제 CA 인증서 처리 필요
    // 설정에 SSL 추가
    if (Object.keys(ssl).length > 0) {
      config.ssl = ssl;
    }

    return config;
  }
}
