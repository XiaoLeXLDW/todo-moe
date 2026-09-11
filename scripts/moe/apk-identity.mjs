import { createRequire } from 'node:module';

// Use core's declared ZIP dependency in both hoisted and isolated workspaces.
const { unzipSync } = createRequire(new URL('../../packages/core/package.json', import.meta.url))('fflate');

/** Verify the actual packaged Expo asset, including after a Gradle cache hit. */
export function verifyEmbeddedAppConfig(apk, expected) {
    let matches = 0;
    const entries = unzipSync(apk, { filter: (entry) => {
        if (entry.name !== 'assets/app.config') return false;
        matches++;
        return entry.originalSize <= 1024 * 1024;
    } });
    const bytes = entries['assets/app.config'];
    if (matches !== 1 || !bytes) throw new Error('APK must contain one bounded assets/app.config');
    const config = JSON.parse(Buffer.from(bytes).toString('utf8'));
    const identity = config.extra?.todoMoe;
    for (const key of ['sourceSha', 'dirty', 'versionCode', 'channel', 'artworkStatus']) {
        if (identity?.[key] !== expected[key]) throw new Error(`APK embedded identity mismatch: ${key}`);
    }
    if (config.name !== expected.name || config.version !== expected.version ||
        config.android?.package !== expected.packageName || config.android?.versionCode !== expected.versionCode ||
        config.scheme !== expected.scheme) throw new Error('APK embedded application identity differs from the requested build');
    return identity;
}
