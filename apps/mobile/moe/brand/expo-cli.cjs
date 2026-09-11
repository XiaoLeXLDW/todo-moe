#!/usr/bin/env node
const path = require('node:path');

// React Native's Gradle cliPath() deliberately emits relative paths on Windows.
// Expo 54's export:embed resolves that entry against the Metro workspace root,
// which differs from the mobile working directory in this monorepo.
function normalizeExpoEntryArgs(args, cwd, platform = process.platform) {
    const result = [...args];
    if (platform !== 'win32') return result;
    const entry = result.indexOf('--entry-file');
    if (entry !== -1 && result[entry + 1]) {
        result[entry + 1] = path.win32.resolve(cwd, result[entry + 1]).replaceAll('\\', '/');
    }
    return result;
}

if (require.main === module) {
    process.argv = normalizeExpoEntryArgs(process.argv, process.cwd());
    const expoPackage = require.resolve('expo/package.json', { paths: [process.cwd()] });
    const cli = require.resolve('@expo/cli', { paths: [expoPackage] });
    process.argv[1] = cli;
    require(cli);
}
module.exports = { normalizeExpoEntryArgs };
