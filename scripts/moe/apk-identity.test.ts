import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { verifyEmbeddedAppConfig } from './apk-identity.mjs';
const { strToU8, zipSync } = createRequire(new URL('../../packages/core/package.json', import.meta.url))('fflate');

const expected = { sourceSha: 'a'.repeat(40), dirty: false, versionCode: 42, channel: 'development',
    artworkStatus: 'family-mascot-checklist-v1', name: 'Todo Moe Dev', version: '0.1.0',
    packageName: 'io.github.xiaolexldw.todomoe.dev', scheme: 'todomoe-dev' };
const config = () => ({ name: expected.name, version: expected.version, scheme: expected.scheme,
    android: { package: expected.packageName, versionCode: expected.versionCode }, extra: { todoMoe: { ...expected } } });
const archive = (value: unknown) => zipSync({ 'assets/app.config': strToU8(JSON.stringify(value)),
    'assets/unrelated.bin': new Uint8Array(256) });

test('reads the real compressed Expo asset from an APK archive', () => {
    expect(verifyEmbeddedAppConfig(archive(config()), expected)).toEqual(expected);
});
test('rejects a cached previous source, channel, artwork or version', () => {
    for (const [key, value] of Object.entries({ sourceSha: 'b'.repeat(40), dirty: true, versionCode: 41,
        channel: 'stable', artworkStatus: 'old-placeholder' })) {
        const previous = config();
        Object.assign(previous.extra.todoMoe, { [key]: value });
        expect(() => verifyEmbeddedAppConfig(archive(previous), expected)).toThrow(`mismatch: ${key}`);
    }
});
test('rejects a different package even when provenance claims the requested build', () => {
    const value = config(); value.android.package = 'another.application';
    expect(() => verifyEmbeddedAppConfig(archive(value), expected)).toThrow('application identity');
});
test('rejects missing, malformed and oversized metadata without accepting another asset', () => {
    expect(() => verifyEmbeddedAppConfig(zipSync({ 'assets/other.config': strToU8('{}') }), expected)).toThrow('one bounded');
    expect(() => verifyEmbeddedAppConfig(zipSync({ 'assets/app.config': strToU8('{') }), expected)).toThrow();
    expect(() => verifyEmbeddedAppConfig(zipSync({ 'assets/app.config': new Uint8Array(1024 * 1024 + 1) }), expected)).toThrow('one bounded');
});
