# Process Output

Represents a cmd execution result.

```ts
interface ProcessOutput {
  // Exit code of the process: 0 for success, non-zero for failure
  exitCode: number
  
  // Signal that caused the process to exit: SIGTERM, SIGKILL, etc.
  signal: NodeJS.Signals | null
  
  // Holds the stdout of the process
  stdout: string
  
  // Process errors are written to stderr
  stderr: string
  
  // combined stdout and stderr
  toString(): string

  // Same as toString() but trimmed
  valueOf(): string
}
```
