// test-runner.js
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Node.js to handle ESM modules in Jest
process.env.NODE_OPTIONS = '--experimental-vm-modules';

// Run Jest with the proper configuration
try {
  console.log('Running tests with ESM support...');
  execSync('npx jest --config=jest.config.js', {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.error('Test execution failed');
  process.exit(1);
}
