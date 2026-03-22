import { $, chalk } from './src/index.ts';

async function testPayload(name, payload) {
    try {
        console.log(chalk.blue(`\n--- Testing: ${name} ---`));
        console.log(`Payload: ${payload}`);
        const result = await $`echo "Input received:" ${payload}`.quiet();
        console.log(`Command output: ${result.stdout.trim()}`);
    } catch (error) {
        console.error(chalk.red(`Error executing payload: ${error.message}`));
    }
}

async function main() {
    // 1. Basic subshell bypass attempt
    await testPayload('Basic Subshell', '$(whoami)');
    await testPayload('Backtick Subshell', '`whoami`');

    // 2. Breaking out of single quotes (if it used standard single quotes, but it uses $'')
    await testPayload('Break out of single quotes', "' ; id ; echo '");

    // 3. Testing backslash injection (since backslashes are replaced, what happens if we input one?)
    await testPayload('Backslash Injection', '\\$(id)');

    // 4. Testing ANSI-C specific quirks.
    // In bash $'...', backslashes escape the next character.
    // If we pass a string that evaluates to something else?
    // zx does: .replace(/\\/g, '\\\\')
    // Let's test providing an already escaped character.
    await testPayload('ANSI-C Quirk 1', '\\n');
    await testPayload('ANSI-C Quirk 2', '\\x41'); // 'A' in hex

    // 5. Parameter Expansion
    await testPayload('Parameter Expansion', '${PATH}');

    // 6. Test what happens if we pass an array or object
    await testPayload('Array input', ['a', 'b', '$(id)']);

    // 7. Testing null byte injection (though quote replaces it)
    await testPayload('Null byte', 'A\0B');

    // 8. Testing unclosed quotes
    await testPayload('Unclosed quote', "'");
    await testPayload('Unclosed double quote', '"');

    console.log(chalk.green('\nDone testing payloads.'));
}

main();
