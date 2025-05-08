import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const composeFile = path.join(projectRoot, 'scripts', 'test-fixtures', 'database.yml');

/** 포트 열릴 때까지 기다리는 함수 */
function waitForPort(host, port, retries = 10, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const check = () => {
      const socket = net.createConnection({ host, port }, () => {
        socket.end();
        console.log(`✅ ${host}:${port} is ready`);
        resolve();
      });

      socket.on('error', () => {
        attempt++;
        if (attempt >= retries) {
          reject(new Error(`❌ Failed to connect to ${host}:${port} after ${retries} retries.`));
        } else {
          setTimeout(check, delay);
        }
      });
    };

    check();
  });
}

(async () => {
  try {

    console.log('[STEP 1] setting up test fixtures...');
    // execSync(`docker-compose -f ${composeFile} up -d`, { stdio: 'inherit' });

    console.log('[STEP 2] waiting for PostgreSQL to be ready...');
    await waitForPort('localhost', 5450); // postgres-no-ssl
    await waitForPort('localhost', 5455); // postgres-ssl
    // await waitForPort('localhost', 3309); // mysql

    console.log('[STEP 3] running tests...');
    execSync('node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles ', {
      stdio: 'inherit',
      cwd: projectRoot,
    });
  } catch (error) {
    console.error('❌ Error during test execution:', error);
  } finally {
    console.log('[STEP 4] tearing down test fixtures...');
    try {
      // execSync(`docker-compose -f ${composeFile} down`, { stdio: 'inherit' });
    } catch (err) {
      console.error('⚠️ Failed to stop Docker Compose:', err);
    }
  }
})();
