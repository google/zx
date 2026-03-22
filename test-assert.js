import path from 'path';

function assertSafePath(inputPath) {
  if (path.isAbsolute(inputPath) || path.win32.isAbsolute(inputPath)) {
    throw new Error('Absolute paths are not allowed');
  }
  const normalizedPath = path.normalize(inputPath);
  const winNormalizedPath = path.win32.normalize(inputPath);

  if (
    normalizedPath.startsWith('..' + path.sep) ||
    normalizedPath === '..' ||
    winNormalizedPath.startsWith('..\\')
  ) {
    throw new Error('Path traversal is not allowed');
  }
}

const tests = [
  '../tmp',
  '../../etc/passwd',
  '/etc/passwd',
  'C:\\Windows',
  'poc-test.txt',
  'folder/test.txt',
  'folder/../test.txt',
  'folder/../../test.txt'
];

tests.forEach(testPath => {
  try {
    assertSafePath(testPath);
    console.log(`[PASS] ${testPath} is safe.`);
  } catch (error) {
    console.log(`[BLOCK] ${testPath}: ${error.message}`);
  }
});
