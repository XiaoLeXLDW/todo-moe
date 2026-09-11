#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV_VERSION_EPOCH = Date.UTC(2026, 0, 1);
export function devVersionAt(timestamp) {
    const code = Math.floor((timestamp - DEV_VERSION_EPOCH) / 1000);
    if (!Number.isSafeInteger(code) || code < 1 || code > 2100000000) throw new Error('UTC clock is outside the Android Dev versionCode epoch range.');
    return code;
}
/** Must run only AFTER obtaining the repository-wide development build lock. */
export async function allocateDevVersion({ now = Date.now, sleep = (ms) => new Promise((done) => setTimeout(done, ms)) } = {}) {
    const started = now();
    const initial = devVersionAt(started);
    // Even a cached build that finishes within one second cannot reuse this
    // second in the next serialized job. Clock regressions fail closed.
    await sleep(1050 - (started % 1000));
    const current = devVersionAt(now());
    if (current <= initial) throw new Error('UTC clock did not advance; refusing a duplicate Dev versionCode.');
    return current;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const code = await allocateDevVersion();
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version_code=${code}\n`);
    console.log(`Dev versionCode: ${code}`);
}
