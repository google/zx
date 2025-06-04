# Process Output

Represents a cmd execution result.

```ts
const p = $`command` // ProcessPromise
const o = await p     // ProcessOutput
```

```ts
interface ProcessOutput extends Error {
  // Exit code of the process: 0 for success, non-zero for failure
  exitCode: number
  
  // Signal that caused the process to exit: SIGTERM, SIGKILL, etc.
  signal: NodeJS.Signals | null
  
  // Holds the stdout of the process
  stdout: string
  
  // Process errors are written to stderr
  stderr: string

  buffer(): Buffer

  json<T = any>(): T

  blob(type = 'text/plain'): Blob
  
  text(encoding: Encoding = 'utf8'): string

  // Output lines splitted by newline
  lines(delimiter?: string | RegExp): string[]
  
  // combined stdout and stderr
  toString(): string

  // Same as toString() but trimmed
  valueOf(): string
}
```
