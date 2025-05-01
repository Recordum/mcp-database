// scripts/test.js
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const composeFile = path.join(projectRoot, '/scripts/test-fixtures.yml');

try {
  console.log('🟢 setting up test fixtures...');
  execSync(`docker-compose -f ${composeFile} up -d`, { stdio: 'inherit' });

  console.log('🧪 running tests...');
  execSync('node --experimental-vm-modules node_modules/jest/bin/jest.js', {
    stdio: 'inherit',
    cwd: projectRoot
  });
} catch (error) {
  console.error('❌ Error during test execution:', error);
} finally {
  console.log('🛑 tearing down test fixtures...');
  try {
    execSync(`docker-compose -f ${composeFile} down`, { stdio: 'inherit' });
  } catch (err) {
    console.error('⚠️ Failed to stop Docker Compose:', err);
  }
}
