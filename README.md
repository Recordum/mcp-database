# MCP Database Server

A Model Context Protocol (MCP) server for database connections and queries, supporting multiple database types.

## Features

- Connect to MySQL and PostgreSQL databases
- Execute SQL queries with parameter binding
- Manage multiple database connections simultaneously
- Secure handling of connection credentials

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

This MCP server can be used with any MCP client that supports tools. You can run the server directly:

```bash
node build/index.js
```

Or install it globally:

```bash
npm install -g .
database
```

## Available Tools

The MCP server provides the following tools:

### 1. connect_database

Connect to a database.

Parameters:
- `connectionId` (string): Unique identifier for this connection
- `type` (string): Type of database (`mysql` or `postgres`)
- `host` (string): Database host
- `port` (number, optional): Database port (defaults to 3306 for MySQL, 5432 for PostgreSQL)
- `username` (string): Database username
- `password` (string): Database password
- `database` (string): Database name

### 2. disconnect_database

Disconnect from a database.

Parameters:
- `connectionId` (string): Identifier of the connection to disconnect

### 3. execute_query

Execute SQL query on a database connection.

Parameters:
- `connectionId` (string): Identifier of the connection to use
- `query` (string): SQL query to execute
- `params` (array, optional): Parameters for the query

### 4. list_connections

List all active database connections.

## Example Usage

Here's an example of how to interact with the MCP Database Server from a client:

1. Connect to a MySQL database:
```json
{
  "name": "connect_database",
  "arguments": {
    "connectionId": "my-mysql-db",
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "username": "root",
    "password": "password",
    "database": "test_db"
  }
}
```

2. Execute a query:
```json
{
  "name": "execute_query",
  "arguments": {
    "connectionId": "my-mysql-db",
    "query": "SELECT * FROM users WHERE id = ?",
    "params": [1]
  }
}
```

3. List active connections:
```json
{
  "name": "list_connections",
  "arguments": {}
}
```

4. Disconnect:
```json
{
  "name": "disconnect_database",
  "arguments": {
    "connectionId": "my-mysql-db"
  }
}
```

## Extending

To add support for additional database types, create a new driver implementation in the `src/database/drivers/` directory and update the `DatabaseType` enum.

## License

MIT
