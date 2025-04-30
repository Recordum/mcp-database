// 기본 데이터베이스 설정 인터페이스
export interface BaseConfig {
  // 모든 데이터베이스 유형에 공통적인 기본 속성들
  connectionAlias: string;
  type: DatabaseType;
  [key: string]: any;
}

// MySQL 특화 설정
export interface MySQLConfig extends BaseConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
  ssl?: any;
  connectionLimit?: number;
}

// PostgreSQL 특화 설정
export interface PostgresConfig extends BaseConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
  ssl?: any;
  maxConnections?: number;
  idleTimeoutMillis?: number;
}

// 다른 DB 유형들을 위한 설정은 나중에 추가 가능

// 관계형 데이터베이스 설정
export type RelationalDBConfig = MySQLConfig | PostgresConfig;

export type DatabaseConfig = RelationalDBConfig;

// 쿼리 결과 인터페이스
export interface QueryResult {
  rows: any[];
  fields?: any[];
  rowCount?: number;
  [key: string]: any; // 추가 결과 속성
}

// 기본 데이터베이스 드라이버 인터페이스
export interface DatabaseDriver {
  // 기본 메서드
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<QueryResult>;
  getType(): string;
}

// 데이터베이스 유형 열거형
export enum DatabaseType {
  MYSQL = "mysql",
  POSTGRES = "postgres",
  // 나중에 추가할 수 있는 데이터베이스 유형들:
  // BIGQUERY = 'bigquery',
  // ATHENA = 'athena',
  // SNOWFLAKE = 'snowflake',
}
