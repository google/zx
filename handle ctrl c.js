#!/usr/bin/env zx

process.on("SIGINT", () => {
    console.log("Caught interrupt signal");
  });
  
  await $`trap '' INT; sleep 5`; // Note the trap to intercept SIGINT in the child process
  await $`sleep 4`; // If Ctrl+C here, the process is interrupted