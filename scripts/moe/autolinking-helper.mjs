import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

function within(root, target) {
    const path = relative(root, target);
    if (!path || path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) throw new Error('Autolinking path escaped its generated Android directory.');
    return target;
}
function paths(projectRoot) {
    const project = realpathSync(projectRoot);
    const native = within(project, realpathSync(join(project, 'apps/mobile/android')));
    const marker = join(native, '.todo-moe-generated.json');
    if (!existsSync(marker) || lstatSync(marker).isSymbolicLink()) throw new Error('Missing regular Todo Moe generated-project marker.');
    const cache = join(native, 'build/generated/autolinking/autolinking.json');
    return { native, marker, cache };
}
function readCache(cache, native) {
    within(native, realpathSync(dirname(cache)));
    if (lstatSync(cache).isSymbolicLink() || !lstatSync(cache).isFile()) throw new Error('Autolinking cache must be a regular generated file.');
    within(native, realpathSync(cache));
    return readFileSync(cache, 'utf8');
}

/** RNGP's settings cache keys omit APP_VARIANT/applicationId. Invalidate only
 * its fixed JSON input; missing JSON forces the configured CLI to regenerate
 * it, and GenerateEntryPointTask tracks that JSON as @InputFile. */
export function refreshAutolinkingCache(projectRoot, expected) {
    const { native, marker, cache } = paths(projectRoot);
    const generated = JSON.parse(readFileSync(marker, 'utf8'));
    for (const key of ['sourceSha', 'channel', 'versionCode']) {
        if (generated[key] !== expected[key]) throw new Error(`Generated-project marker differs from requested ${key}.`);
    }
    if (!/^[a-f0-9]{40}$/.test(expected.sourceSha) || !['development', 'stable'].includes(expected.channel) || !Number.isSafeInteger(expected.versionCode) || expected.versionCode < 1) throw new Error('Invalid requested autolinking build identity.');
    if (!existsSync(cache)) return { refreshed: false, cachedPackage: null, backup: null };
    const source = readCache(cache, native);
    let cachedPackage = null;
    try { cachedPackage = JSON.parse(source).project?.android?.packageName ?? null; } catch { /* Preserve and refresh malformed generated metadata too. */ }
    const history = join(native, 'build/moe-autolinking-history');
    within(native, realpathSync(join(native, 'build')));
    mkdirSync(history, { recursive: true });
    within(native, realpathSync(history));
    const backup = within(native, resolve(history, `${randomUUID()}.json`));
    copyFileSync(cache, backup);
    // The sole deletion target is this checked, fixed generated JSON path.
    unlinkSync(cache);
    return { refreshed: true, cachedPackage, backup };
}

export function assertAutolinkingPackage(projectRoot, expectedPackage) {
    const { native, cache } = paths(projectRoot);
    if (!existsSync(cache)) throw new Error('Gradle did not regenerate autolinking.json.');
    const actual = JSON.parse(readCache(cache, native)).project?.android?.packageName;
    if (actual !== expectedPackage) throw new Error(`Autolinking package mismatch: expected ${expectedPackage}, received ${actual}.`);
    return actual;
}

/** AGP's current release artifact listing is authoritative, not stale APKs
 * which may remain beside it after a signed/unsigned variant transition. */
export function selectCurrentApkFiles(metadata, expected) {
    if (metadata?.version !== 3 || metadata.artifactType?.type !== 'APK' || metadata.variantName !== 'release' || metadata.applicationId !== expected.packageName || !Array.isArray(metadata.elements) || !metadata.elements.length) throw new Error('AGP output metadata does not match the requested release.');
    const names = metadata.elements.map((element) => {
        if (element.versionCode !== expected.versionCode || element.versionName !== expected.version || typeof element.outputFile !== 'string' || !/^[A-Za-z0-9._-]+\.apk$/.test(element.outputFile)) throw new Error('Invalid current APK output identity or path.');
        return element.outputFile;
    });
    if (new Set(names).size !== names.length) throw new Error('Duplicate current APK outputs.');
    return names;
}
