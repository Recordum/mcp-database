import pg from "pg";
import fs from "fs";
import {
  DatabaseDriver,
  QueryResult,
  PostgresConfig,
  BaseConfig,
} from "../driver.js";

export class PostgresDriver implements DatabaseDriver {
  private pool: pg.Pool | null = null;
  private client: pg.PoolClient | null = null;
  private config: PostgresConfig | null = null;

  constructor(config: PostgresConfig) {
    if (config) {
      this.config = config;
    }
    // 설정에서 필요한 속성 추출
    const {
      host,
      port = 5432,
      username,
      password,
      database,
      connectionAlias,
      type,
      ssl,
    } = config;

    // Pool 옵션 설정
    const poolConfig: any = {
      host,
      port,
      user: username,
      password,
      database,
      ssl: ssl
        ? {
            rejectUnauthorized: ssl.rejectUnauthorized,
            ca: ssl.rejectUnauthorized ? fs.readFileSync(ssl.ca) : undefined,
          }
        : undefined,
    };

    this.pool = new pg.Pool(poolConfig);

    // 프로세스 종료 시 풀 종료
    process.on("SIGINT", this.cleanup.bind(this));
    process.on("SIGTERM", this.cleanup.bind(this));
    process.on("exit", this.cleanup.bind(this));    
  }

  getType(): string {
    return "postgres";
  }

  async connect(): Promise<void> {
    try {
      // 이미 설정이 있으면 기존 설정에 새 설정을 병합/ 설정이 없으면 오류
      if (!this.config) {
        throw new Error("No PostgreSQL configuration provided");
      }

      if (!this.pool) {
        throw new Error("No PostgreSQL pool created");
      }

      // 연결 테스트
      this.client = await this.pool.connect();
    } catch (error) {
      this.client = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    // 쿼리 실행 시 연결 (연결이 없으면)
    if (!this.client) {
      await this.connect();
    }

    try {
      const result = await this.client!.query(sql, params);

      const queryResult = {
        rows: result.rows,
        fields: result.fields,
        rowCount: result.rowCount || undefined,
      };

      return queryResult;
    } catch (error) {
      // 오류 발생 시에도 연결 종
      throw error;
    } finally {
      this.client
        ?.query("ROLLBACK")
        .catch((error: any) =>
          console.warn("Could not roll back transaction:", error)
        );

      await this.disconnect()
    }
  }

  async cleanup() {
    if (this.client) {
      this.client.release();
    }
    if (this.pool) {
      await this.pool.end();
    }
  }
}
