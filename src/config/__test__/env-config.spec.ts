import path from "path";
import { DatabaseType } from "../../database/driver.js";
import { EnvConfig } from "../env-config.js";
import fs from 'fs';
import { fileURLToPath } from "url";

// Mock process.env
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv }; // Reset process.env
});

afterAll(() => {
  process.env = originalEnv; // Restore original environment
});

describe('EnvConfig', () => {
  it('should throw an error if DB_ALIASES is not set', () => {
    delete process.env.DB_ALIASES;
    expect(() => new EnvConfig()).toThrow('DB_ALIASES is not set');
  });

  it('should return correct configs for MySQL', () => {
    process.env.DB_ALIASES = 'test';
    process.env.DB_TEST_TYPE = DatabaseType.MYSQL;
    process.env.DB_TEST_HOST = 'localhost';
    process.env.DB_TEST_PORT = '3306';
    process.env.DB_TEST_USERNAME = 'user';
    process.env.DB_TEST_PASSWORD = 'pass';
    process.env.DB_TEST_DATABASE = 'testdb';

    const configManager = new EnvConfig();
    const configs = configManager.getConfigs();

    expect(configs).toHaveLength(1);
    expect(configs[0]).toEqual({
      type: DatabaseType.MYSQL,
      connectionAlias: 'test',
      host: 'localhost',
      port: 3306,
      username: 'user',
      password: 'pass',
      database: 'testdb',
    });
  });

  it('should return correct configs for Postgres', () => {
    process.env.DB_ALIASES = 'test';
    process.env.DB_TEST_TYPE = DatabaseType.POSTGRES;
    process.env.DB_TEST_HOST = 'localhost';
    process.env.DB_TEST_PORT = '5432';
    process.env.DB_TEST_USERNAME = 'user';
    process.env.DB_TEST_PASSWORD = 'pass';
    process.env.DB_TEST_DATABASE = 'testdb';

    const configManager = new EnvConfig();
    const configs = configManager.getConfigs();

    expect(configs).toHaveLength(1);
    expect(configs[0]).toEqual({
      type: DatabaseType.POSTGRES,
      connectionAlias: 'test',
      host: 'localhost',
      port: 5432,
      username: 'user',
      password: 'pass',
      database: 'testdb',
    });
  });

  it('should throw an error for unsupported database type', () => {
    process.env.DB_ALIASES = 'test';
    process.env.DB_TEST_TYPE = 'unsupported';
    expect(() => new EnvConfig().getConfigs()).toThrow(
      "Unsupported database type for alias test: unsupported"
    );
  });

  it("should configure SSL if enabled", () => {
    process.env.DB_ALIASES = "test";
    process.env.DB_TEST_TYPE = DatabaseType.POSTGRES;
    process.env.DB_TEST_HOST = "localhost";
    process.env.DB_TEST_USERNAME = "user";
    process.env.DB_TEST_PASSWORD = "pass";
    process.env.DB_TEST_DATABASE = "testdb";
    process.env.DB_TEST_SSL_ENABLED = 'true';
    process.env.DB_TEST_SSL_REJECT_UNAUTHORIZED = 'false';

    const configManager = new EnvConfig();
    const configs = configManager.getConfigs();

    expect(configs[0].ssl).toEqual({ rejectUnauthorized: false });
  });

  it("should throw an error if SSL CA file does not exist", () => {
    process.env.DB_ALIASES = "test";
    process.env.DB_TEST_TYPE = DatabaseType.POSTGRES;
    process.env.DB_TEST_HOST = "localhost";
    process.env.DB_TEST_USERNAME = "user";
    process.env.DB_TEST_PASSWORD = "pass";
    process.env.DB_TEST_DATABASE = "testdb";
    process.env.DB_TEST_SSL_ENABLED = 'true';
    process.env.DB_TEST_SSL_REJECT_UNAUTHORIZED = 'true';
    process.env.DB_TEST_SSL_CA = '/path/to/nonexistent/ca.crt';

    expect(() => new EnvConfig().getConfigs()).toThrow(
      "Invalid CA file for alias test"
    );
  });

  it("should pass if SSL CA file exists", () => {
    process.env.DB_ALIASES = "test";
    process.env.DB_TEST_TYPE = DatabaseType.POSTGRES;
    process.env.DB_TEST_HOST = "localhost";
    process.env.DB_TEST_USERNAME = "user";
    process.env.DB_TEST_PASSWORD = "pass";
    process.env.DB_TEST_DATABASE = "testdb";
    process.env.DB_TEST_SSL_ENABLED = 'true';
    process.env.DB_TEST_SSL_REJECT_UNAUTHORIZED = 'true';
    
     // Use __dirname to construct the path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const testCAPath = path.join(__dirname, 'test-ca.pem');
    process.env.DB_TEST_SSL_CA = testCAPath;

    // Create a real test CA file

    fs.writeFileSync(testCAPath, 'test-ca-content');

    const configManager = new EnvConfig();
    const configs = configManager.getConfigs();

    expect(configs[0].ssl).toEqual({
      rejectUnauthorized: true,
      ca: testCAPath,
    });

    // Clean up test CA file
    fs.unlinkSync(testCAPath);
  });
}); 