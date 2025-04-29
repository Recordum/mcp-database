import { DatabaseDriver, DatabaseType, BaseConfig, MySQLConfig, PostgresConfig } from './driver.js';
import { MySQLDriver } from './drivers/mysql.js';
import { PostgresDriver } from './drivers/postgres.js';
import * as fs from 'fs';

export class DatabaseFactory {
  // 지정된 데이터베이스 유형에 맞는 드라이버 인스턴스 생성 (설정 주입)
  static createDriver(type: DatabaseType, config?: BaseConfig): DatabaseDriver {
    const validatedConfig = config ? this.validateConfig(config) : undefined;
    
    switch (type) {
      case DatabaseType.MYSQL:
        return new MySQLDriver(validatedConfig as MySQLConfig);
      case DatabaseType.POSTGRES:
        return new PostgresDriver(validatedConfig as PostgresConfig);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
  
  // 환경 변수로부터 설정 생성
  static createConfigFromEnv(type: DatabaseType, alias: string): BaseConfig {
    const prefix = `DB_${alias.toUpperCase()}_`;
    
    const config: Record<string, any> = {
      type,
      connectionAlias: alias,
      host: process.env[`${prefix}HOST`] || 'localhost',
      port: process.env[`${prefix}PORT`] ? parseInt(process.env[`${prefix}PORT`]!, 10) : undefined,
      username: process.env[`${prefix}USERNAME`] || 'root',
      password: process.env[`${prefix}PASSWORD`] || '',
      database: process.env[`${prefix}DATABASE`] || 'test'
    };
    
    // SSL 설정 처리
    this.processSSLConfig(config, prefix);
    
    // 각 유형별 추가 설정
    switch (type) {
      case DatabaseType.MYSQL:
        if (process.env[`${prefix}CONNECTION_LIMIT`]) {
          config.connectionLimit = parseInt(process.env[`${prefix}CONNECTION_LIMIT`]!, 10);
        }
        break;
        
      case DatabaseType.POSTGRES:
        if (process.env[`${prefix}MAX_CONNECTIONS`]) {
          config.maxConnections = parseInt(process.env[`${prefix}MAX_CONNECTIONS`]!, 10);
        }
        if (process.env[`${prefix}IDLE_TIMEOUT_MS`]) {
          config.idleTimeoutMillis = parseInt(process.env[`${prefix}IDLE_TIMEOUT_MS`]!, 10);
        }
        break;
        
      default:
        break;
    }
    
    return this.validateConfig(config);
  }
  
  // SSL 설정 처리
  private static processSSLConfig(config: Record<string, any>, prefix: string): void {
    // SSL 활성화 여부
    const sslEnabled = process.env[`${prefix}SSL_ENABLED`] === 'true';
    if (!sslEnabled) return;
    
    // 기본 SSL 설정
    const ssl: Record<string, any> = {};
    
    // RejectUnauthorized 설정
    if (process.env[`${prefix}SSL_REJECT_UNAUTHORIZED`] !== undefined) {
      ssl.rejectUnauthorized = process.env[`${prefix}SSL_REJECT_UNAUTHORIZED`] === 'true';
    }
    
    // CA 인증서 처리
    const caCertPath = process.env[`${prefix}SSL_CA_PATH`];
    if (caCertPath && fs.existsSync(caCertPath)) {
      try {
        ssl.ca = fs.readFileSync(caCertPath);
      } catch (error) {
        console.error(`Error reading CA certificate from ${caCertPath}:`, error);
      }
    }
    
    // 클라이언트 인증서 처리
    const certPath = process.env[`${prefix}SSL_CERT_PATH`];
    if (certPath && fs.existsSync(certPath)) {
      try {
        ssl.cert = fs.readFileSync(certPath);
      } catch (error) {
        console.error(`Error reading client certificate from ${certPath}:`, error);
      }
    }
    
    // 클라이언트 키 처리
    const keyPath = process.env[`${prefix}SSL_KEY_PATH`];
    if (keyPath && fs.existsSync(keyPath)) {
      try {
        ssl.key = fs.readFileSync(keyPath);
      } catch (error) {
        console.error(`Error reading client key from ${keyPath}:`, error);
      }
    }
    
    // 설정에 SSL 추가
    if (Object.keys(ssl).length > 0) {
      config.ssl = ssl;
    }
  }
  
  // 데이터베이스 유형에 따라 올바른 설정 인터페이스로 변환
  static validateConfig(config: any): BaseConfig {
    const { type } = config;
  
    switch (type) {
      case DatabaseType.MYSQL:
        this.validateMySQLConfig(config);
        return config as MySQLConfig;
        
      case DatabaseType.POSTGRES:
        this.validatePostgresConfig(config);
        return config as PostgresConfig;
        
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
  
  // MySQL 설정 유효성 검사
  private static validateMySQLConfig(config: any): void {
    const required = ['host', 'username', 'password', 'database'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`MySQL configuration requires '${field}'`);
      }
    }
  }
  
  // PostgreSQL 설정 유효성 검사
  private static validatePostgresConfig(config: any): void {
    const required = ['host', 'username', 'password', 'database'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`PostgreSQL configuration requires '${field}'`);
      }
    }
  }
} 