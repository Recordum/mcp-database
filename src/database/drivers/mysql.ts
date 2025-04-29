import mysql from "mysql2/promise";
import { DatabaseDriver, QueryResult, MySQLConfig } from "../driver.js";

export class MySQLDriver implements DatabaseDriver {
  private pool: mysql.Pool | null = null;
  private connection: mysql.PoolConnection | null = null;
  private config: MySQLConfig | null = null;

  constructor(config: MySQLConfig) {
    if (config) {
      this.config = config;
    }

    this.pool = mysql.createPool({
      host: config.host,
      port: config.port || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: config.connectionLimit || 10,
      ...config.ssl ? { ssl: config.ssl } : {}
    });
  }

  getType(): string {
    return "mysql";
  }

  async connect(): Promise<void> {
    if (!this.pool) {
      throw new Error("No MySQL pool created");
    }

    try {
      this.connection = await this.pool.getConnection();
    } catch (error) {
      this.connection = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.release();
      this.connection = null;
    }
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    if (!this.connection) {
      await this.connect();
    }

    try {
      const [rows, fields] = await this.connection!.query(sql, params);

      return {
        rows: Array.isArray(rows) ? rows : [],
        fields,
        rowCount: Array.isArray(rows) ? rows.length : 0,
      };
    } catch (error) {
      throw error;
    } finally {
      try {
        // 항상 ROLLBACK 시도
        await this.connection?.query('ROLLBACK');
      } catch (rollbackError) {
        console.warn("MySQL rollback failed:", rollbackError);
      }
      await this.disconnect();
    }
  }
}
