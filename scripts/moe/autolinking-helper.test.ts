import { afterEach, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { refreshAutolinkingCache, assertAutolinkingPackage, selectCurrentApkFiles } from './autolinking-helper.mjs';

const fixtureRoot = resolve(import.meta.dir, '../../build/moe/autolinking-fixtures');
const created: string[] = [];
const stable = 'io.github.xiaolexldw.todomoe';
const dev = `${stable}.dev`;
const identity = (channel = 'stable', versionCode = 1) => ({ sourceSha: 'a'.repeat(40), channel, versionCode });
function fixture() {
    mkdirSync(fixtureRoot, { recursive: true });
    const root = mkdtempSync(join(fixtureRoot, 'repo-')); created.push(root);
    const native = join(root, 'apps/mobile/android'); mkdirSync(native, { recursive: true });
    writeFileSync(join(native, '.todo-moe-generated.json'), JSON.stringify(identity()));
    return { root, native, cache: join(native, 'build/generated/autolinking/autolinking.json') };
}
function cache(file: string, packageName: string) { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, JSON.stringify({ project: { android: { packageName } } })); }
afterEach(() => { for (const root of created.splice(0)) { if (!root.startsWith(fixtureRoot + sep)) throw new Error('Invalid fixture cleanup'); rmSync(root, { recursive: true, force: true }); } });

test('Dev to Stable to Dev refreshes only the cached JSON and preserves evidence/native outputs', () => {
    const f = fixture(); cache(f.cache, dev);
    const untouched = [join(f.native, 'build/generated/autolinking/package.json.sha'), join(f.native, 'app/build/keep.o'), join(f.native, 'app/build/outputs/apk/release/app-release.apk')];
    for (const file of untouched) { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, 'keep'); }
    expect(() => assertAutolinkingPackage(f.root, stable)).toThrow('package mismatch');
    const before = readFileSync(f.cache, 'utf8');
    const first = refreshAutolinkingCache(f.root, identity());
    expect(first.cachedPackage).toBe(dev); expect(existsSync(f.cache)).toBe(false); expect(readFileSync(first.backup!, 'utf8')).toBe(before);
    // Simulate the documented settings CLI regeneration, then verify its value.
    cache(f.cache, stable); expect(assertAutolinkingPackage(f.root, stable)).toBe(stable);
    writeFileSync(join(f.native, '.todo-moe-generated.json'), JSON.stringify(identity('development', 8)));
    expect(refreshAutolinkingCache(f.root, identity('development', 8)).cachedPackage).toBe(stable);
    cache(f.cache, dev); expect(assertAutolinkingPackage(f.root, dev)).toBe(dev);
    for (const file of untouched) expect(readFileSync(file, 'utf8')).toBe('keep');
});
test('every build refreshes even unchanged package metadata, and absent cache is harmless', () => {
    const f = fixture(); expect(refreshAutolinkingCache(f.root, identity()).refreshed).toBe(false);
    cache(f.cache, stable); expect(refreshAutolinkingCache(f.root, identity()).refreshed).toBe(true);
    expect(refreshAutolinkingCache(f.root, identity()).refreshed).toBe(false);
    expect(() => assertAutolinkingPackage(f.root, stable)).toThrow('did not regenerate');
});
test('missing/mismatched markers reject deletion', () => {
    const f = fixture(); cache(f.cache, dev);
    expect(() => refreshAutolinkingCache(f.root, identity('development'))).toThrow('marker differs');
    expect(existsSync(f.cache)).toBe(true);
    rmSync(join(f.native, '.todo-moe-generated.json'));
    expect(() => refreshAutolinkingCache(f.root, identity())).toThrow('marker'); expect(existsSync(f.cache)).toBe(true);
});
test('rejects a junction escaping the generated Android directory', () => {
    const f = fixture(); const outside = join(f.root, 'outside'); mkdirSync(outside);
    writeFileSync(join(outside, 'autolinking.json'), 'do not touch'); mkdirSync(join(f.native, 'build/generated'), { recursive: true });
    symlinkSync(outside, join(f.native, 'build/generated/autolinking'), 'junction');
    expect(() => refreshAutolinkingCache(f.root, identity())).toThrow('escaped');
    expect(readFileSync(join(outside, 'autolinking.json'), 'utf8')).toBe('do not touch');
});

const expected = { packageName: stable, versionCode: 1, version: '0.1.0' };
const metadata = () => ({ version: 3, artifactType: { type: 'APK' }, variantName: 'release', applicationId: stable, elements: [{ versionCode: 1, versionName: '0.1.0', outputFile: 'app-release-unsigned.apk' }] });
test('selects the current unsigned APK, without enumerating or deleting an old Dev APK', () => {
    expect(selectCurrentApkFiles(metadata(), expected)).toEqual(['app-release-unsigned.apk']);
});
test('rejects stale AGP identity, duplicate outputs and escaping filenames', () => {
    expect(() => selectCurrentApkFiles({ ...metadata(), applicationId: dev }, expected)).toThrow('metadata');
    for (const outputFile of ['../old.apk', '..\\old.apk', '/tmp/old.apk', 'C:old.apk']) {
        expect(() => selectCurrentApkFiles({ ...metadata(), elements: [{ ...metadata().elements[0], outputFile }] }, expected)).toThrow('path');
    }
    expect(() => selectCurrentApkFiles({ ...metadata(), elements: [{ ...metadata().elements[0], versionCode: 7 }] }, expected)).toThrow('identity');
    expect(() => selectCurrentApkFiles({ ...metadata(), elements: [...metadata().elements, ...metadata().elements] }, expected)).toThrow('Duplicate');
});
