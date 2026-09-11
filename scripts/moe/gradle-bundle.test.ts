import { expect, test } from 'bun:test';
import { ensureFreshReleaseBundle } from './gradle-bundle.mjs';

const app = `apply plugin: "com.android.application"
apply plugin: "com.facebook.react"
android { buildTypes { release { signingConfig signingConfigs.debug } } }
tasks.register('compileReleaseKotlin') { outputs.cacheIf { true } }
`;

test.each(['\n', '\r\n'])('preserves the original app content and native cache policy with newline %j', (newline) => {
    const source = app.replaceAll('\n', newline);
    const output = ensureFreshReleaseBundle(source);
    expect(output.startsWith(source)).toBe(true);
    expect(output.slice(0, source.length)).toBe(source);
    expect(ensureFreshReleaseBundle(output)).toBe(output);
    expect(output.match(/@todo-moe:always-rebundle-release:start/g)).toHaveLength(1);
    if (newline === '\r\n') expect(output.replaceAll('\r\n', '')).not.toContain('\n');
});

test('disables up-to-date and cache reuse only for the exact release bundle task', () => {
    const injected = ensureFreshReleaseBundle(app).slice(app.length);
    const selected = injected.match(/tasks\.matching \{ it\.name == '([^']+)' \}\.configureEach/);
    expect(selected?.[1]).toBe('createBundleReleaseJsAndAssets');
    const taskNames = ['createBundleReleaseJsAndAssets', 'createBundleDebugJsAndAssets', 'compileReleaseKotlin', 'externalNativeBuildRelease', 'assembleRelease'];
    expect(taskNames.filter((name) => name === selected?.[1])).toEqual(['createBundleReleaseJsAndAssets']);
    expect(injected).toContain('outputs.upToDateWhen { false }');
    expect(injected).toMatch(/outputs\.doNotCacheIf\('[^']+'\) \{ true \}/);
    expect(injected).not.toMatch(/--rerun-tasks|\btasks\.all\b|\ballprojects\b|\bsubprojects\b|\bclean\b/);
});

test('handles a missing final newline without modifying existing bytes', () => {
    const source = app.trimEnd();
    const output = ensureFreshReleaseBundle(source);
    expect(output.startsWith(source + '\n\n')).toBe(true);
    expect(ensureFreshReleaseBundle(output)).toBe(output);
});

test('fails closed on partial, duplicate or changed generated rules and non-app files', () => {
    const valid = ensureFreshReleaseBundle(app);
    expect(() => ensureFreshReleaseBundle('plugins { id "com.android.library" }')).toThrow('Android app');
    expect(() => ensureFreshReleaseBundle(valid.replace('outputs.upToDateWhen { false }', 'outputs.upToDateWhen { true }'))).toThrow('modified injection');
    expect(() => ensureFreshReleaseBundle(valid + valid.slice(app.length))).toThrow('duplicate');
    expect(() => ensureFreshReleaseBundle(valid.replace('// @todo-moe:always-rebundle-release:end', ''))).toThrow('Unexpected');
});
