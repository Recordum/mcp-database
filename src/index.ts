import { EnvConfig } from "./config/env-config.js";
import { MCPDatabaseServer } from "./server/server.js";

async function main() {
  try {
    console.error("Starting Database MCP Server...");

    const server = new MCPDatabaseServer(new EnvConfig());
    await server.start();

    // Keep process alive
    process.on("SIGINT", async () => {
      console.error("Shutting down...");
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
