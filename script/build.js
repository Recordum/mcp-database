import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM에서 __dirname 대신 직접 구하기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run TypeScript compiler
console.log("Building the project...");
execSync("tsc", { stdio: "inherit" });

// Add shebang to build/index.js
const buildPath = path.join(__dirname, "../build/index.js");
let content = fs.readFileSync(buildPath, "utf8");
if (!content.startsWith("#!")) {
  fs.writeFileSync(buildPath, `#!/usr/bin/env node\n${content}`, {
    encoding: "utf8",
  });
  console.log("Shebang added to build/index.js");
}

// Make the file executable
console.log("Setting executable permissions for build/index.js...");
fs.chmodSync(buildPath, 0o755);

console.log("Build complete.");
