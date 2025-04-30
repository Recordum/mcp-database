import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  BaseConfig,
  DatabaseDriver,
  DatabaseType,
} from "../database/driver.js";
import { DatabaseFactory } from "../database/factory.js";
import { ExecuteQueryArgs } from "./types/index.js";
import dotenv from "dotenv";
import { EnvConfig } from "../config/env-config.js";

dotenv.config();

export class MCPDatabaseServer {
  private mcpServer: Server;
  private drivers: Map<string, DatabaseDriver> = new Map();
  constructor(private readonly configManger: EnvConfig) {
    this.mcpServer = new Server(
      {
        name: "database-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // 드라이버 설정
    this.setupDrivers();
    // 핸들러 설정
    this.setupHandlers();
  }

  private setupDrivers() {
    // 환경 변수에서 데이터베이스 정보 로드
    this.setupDriversFromEnv();
  }

  private setupDriversFromEnv() {
    // 환경 변수에서 DB_ALIASES 찾기
    const configs = this.configManger.getConfigs();
    for (const config of configs) {
      const driver = DatabaseFactory.createDriver(config);
      this.drivers.set(config.connectionAlias, driver);
    }
  }

  private setupHandlers() {
    this.setupResourceHandlers();
    this.setupToolHandler();
  }

  private setupResourceHandlers() {
    const SCHEMA_PATH = "schema";
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [];

      for (const [alias, driver] of this.drivers.entries()) {
        await driver.connect();

        const dbType = driver.getType(); // 예: 'postgres', 'mysql'
        const resourceBaseUrl = `${dbType}-driver://`;
        resources.push({
          uri: new URL(`${alias}/alias-info`, resourceBaseUrl).href,
          mimeType: "application/json",
          name: `Connection info for alias "${alias}"`,
          description: `Metadata about the database connection for alias "${alias}".`,
        });

        // this.mcpServer.sendLoggingMessage({
        //   level: "debug",
        //   message: `alias: ${alias}, dbType: ${dbType}`,
        // });

        console.error("alias: ", alias);
        console.error("dbType: ", dbType);

        // DB 종류별 테이블 조회 쿼리 분기
        let tableQuery: string;
        if (dbType === "postgres") {
          tableQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          `;
        } else if (dbType === "mysql") {
          tableQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
          `;
        } else {
          throw new Error(
            `Unsupported database type for listing tables: ${dbType}`
          );
        }

        const result = await driver.query(tableQuery);

        for (const row of result.rows) {
          let tableName: string;
          if (driver.getType() === "postgres") {
            tableName = row.table_name;
          } else if (driver.getType() === "mysql") {
            // MySQL은 테이블 컬럼 이름이 'Tables_in_<database>' 형태
            // const dbName = process.env[`DB_${alias.toUpperCase()}_DATABASE`]; // 또는 alias 기반으로
            // const tableColumnKey = `Tables_in_${dbName}`;
            tableName = row.TABLE_NAME;
            // console.error("tableName: ", tableName);
          } else {
            throw new Error(`Unsupported database type: ${driver.getType()}`);
          }
          resources.push({
            uri: new URL(`${alias}/schema/${tableName}`, resourceBaseUrl).href,
            mimeType: "application/json",
            name: `"${tableName}" database schema for alias "${alias}"`,
          });
        }
      }

      return { resources };
    });

    this.mcpServer.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const resourceUrl = new URL(request.params.uri);

        const protocol = resourceUrl.protocol.replace("-driver:", "");
        const pathComponents = resourceUrl.pathname.split("/").filter(Boolean);
        const alias = pathComponents[0];
        const firstSegment = pathComponents[1];
        const secondSegment = pathComponents[2]; // 있을 수도, 없을 수도 있음

        if (!alias) {
          throw new Error("Invalid resource URI");
        }

        const driver = this.drivers.get(alias);
        if (!driver) {
          throw new Error(`Connection with alias '${alias}' not found`);
        }

        if (firstSegment === "alias-info") {
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(
                  {
                    alias,
                    dbType: driver.getType(),
                    description: `Database connection for alias '${alias}' using ${driver.getType()}.`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        if (firstSegment === "schema") {
          const tableName = secondSegment;
          if (!tableName) {
            throw new Error("Invalid resource URI");
          }

          await driver.connect();
          // DB 종류별 컬럼 조회 쿼리 분기
          let columnQuery: string;
          if (driver.getType() === "postgres") {
            columnQuery = `
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_schema = 'public' AND table_name = $1
            `;
          } else if (driver.getType() === "mysql") {
            columnQuery = `
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_schema = DATABASE() AND table_name = ?
            `;
          } else {
            throw new Error(
              `Unsupported database type for reading schema: ${driver.getType()}`
            );
          }

          const result = await driver.query(columnQuery, [tableName]);

          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(result.rows, null, 2),
              },
            ],
          };
        }

        throw new Error(`Unsupported resource type: ${firstSegment}`);
      }
    );
  }

  private setupToolHandler() {
    // List available tools
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "execute_query",
            description: "Execute SQL query on a database connection",
            inputSchema: {
              type: "object",
              properties: {
                connectionAlias: {
                  type: "string",
                  description: "Alias of the connection to use",
                },
                query: {
                  type: "string",
                  description: "SQL query to execute",
                },
              },
              required: ["connectionAlias", "query"],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "execute_query": {
          // 타입 검증하고 전달
          const args = request.params.arguments as Record<string, unknown>;

          const executeArgs: ExecuteQueryArgs = {
            connectionAlias: String(args.connectionAlias),
            query: String(args.query),
          };

          return await this.handleExecuteQuery(executeArgs);
        }
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async handleExecuteQuery(args: ExecuteQueryArgs): Promise<any> {
    try {
      const { connectionAlias, query } = args;

      // 드라이버가 존재하는지 확인
      const driver = this.drivers.get(connectionAlias);
      if (!driver) {
        throw new Error(`Connection with alias '${connectionAlias}' not found`);
      }

      // 쿼리 안전성 검사
      if (!this.isQuerySafe(query)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed.`,
            },
          ],
        };
      }

      // 쿼리 실행 (드라이버에서 자동으로 연결/해제)
      const result = await driver.query(query);

      return {
        content: [
          {
            type: "text",
            text: `Query executed successfully`,
          },
          {
            type: "text",
            text: JSON.stringify({
              rows: result.rows,
              rowCount: result.rowCount || result.rows.length,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

  // ✨ 추가되는 쿼리 검사 메서드
  private isQuerySafe(query: string): boolean {
    const upperQuery = query.trim().toUpperCase();

    const forbiddenKeywords = [
      "INSERT",
      "UPDATE",
      "DELETE",
      "DROP",
      "ALTER",
      "TRUNCATE",
      "CREATE",
      "GRANT",
      "REVOKE",
    ];

    // 금지 키워드로 시작하면 위험한 쿼리로 간주
    for (const keyword of forbiddenKeywords) {
      if (upperQuery.startsWith(keyword)) {
        return false;
      }
    }

    return true;
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    console.error("Database MCP server started");
  }
}
