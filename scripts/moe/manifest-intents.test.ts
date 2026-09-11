import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const { AndroidConfig } = require('@expo/config-plugins');
const brand = require('../../apps/mobile/moe/brand/with-todo-moe.cjs');
const shortcuts = require('../../apps/mobile/plugins/android-app-shortcuts');
const context = require('../../apps/mobile/plugins/android-manifest-fixes');
const share = require('../../node_modules/expo-share-intent/plugin/build/android/withAndroidIntentFilters').withAndroidIntentFilters;
const generatedScheme = require('../../node_modules/expo-dev-client/plugin/build/withGeneratedAndroidScheme').setGeneratedAndroidScheme;
const params = require('../../apps/mobile/app.json').expo.plugins.find((entry: any) => Array.isArray(entry) && entry[0] === 'expo-share-intent')[1];
const fixtureRoot = resolve(import.meta.dir, '../../build/moe/manifest-intent-fixtures');
const fixtures: string[] = [];
afterEach(() => {
    for (const directory of fixtures.splice(0)) {
        if (!realpathSync(directory).startsWith(realpathSync(fixtureRoot) + sep)) throw new Error('Invalid owned fixture cleanup path.');
        rmSync(directory, { recursive: true, force: true });
    }
});

const node = (name: string) => ({ $: { 'android:name': name } });
const view = (data: any[] = [{ $: { 'android:scheme': 'todomoe-dev' } }]) => ({
    action: [node('android.intent.action.VIEW')],
    category: [node('android.intent.category.DEFAULT'), node('android.intent.category.BROWSABLE')], data,
});
const fresh = () => ({ manifest: {
    $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android', 'xmlns:tools': 'http://schemas.android.com/tools' },
    application: [{ $: { 'android:name': '.MainApplication' }, activity: [{
        $: { 'android:name': '.MainActivity', 'android:launchMode': 'singleTask' },
        'intent-filter': [{ action: [node('android.intent.action.MAIN')], category: [node('android.intent.category.LAUNCHER')] }],
    }] }],
} });
async function fixture(manifest: any = fresh()) {
    mkdirSync(fixtureRoot, { recursive: true });
    const directory = mkdtempSync(join(fixtureRoot, 'case-')); fixtures.push(directory);
    // Resolve the real brand plugin's dependency rewrite to this owned stub;
    // no production node_modules file or generated Android project is touched.
    const dependency = join(directory, 'node_modules/react-native-alarm-notification');
    mkdirSync(dependency, { recursive: true });
    writeFileSync(join(dependency, 'package.json'), '{"name":"react-native-alarm-notification","version":"0.0.0"}');
    const platform = join(directory, 'android');
    const file = join(platform, 'app/src/main/AndroidManifest.xml');
    await AndroidConfig.Manifest.writeAndroidManifestAsync(file, manifest);
    return { directory, platform, file };
}
async function finalize(f: Awaited<ReturnType<typeof fixture>>, development = true) {
    const scheme = development ? 'todomoe-dev' : 'todomoe';
    const packageName = `io.github.xiaolexldw.todomoe${development ? '.dev' : ''}`;
    const config = brand({ android: { package: packageName } }, { scheme });
    await config.mods.android.finalized({ ...config, modRequest: { projectRoot: f.directory, platformProjectRoot: f.platform, platform: 'android', modName: 'finalized' } });
    return AndroidConfig.Manifest.readAndroidManifestAsync(f.file);
}
async function cycle(f: Awaited<ReturnType<typeof fixture>>, development = true, expoSchemes = false) {
    let manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(f.file);
    const config = { name: 'Todo Moe', slug: development ? 'todo-moe-dev' : 'todo-moe', scheme: development ? 'todomoe-dev' : 'todomoe', android: { package: `io.github.xiaolexldw.todomoe${development ? '.dev' : ''}` } };
    if (expoSchemes) {
        manifest = AndroidConfig.Scheme.setScheme(config, manifest);
        manifest = generatedScheme(config, manifest);
    }
    for (const plugin of [shortcuts, context, (cfg: any) => share(cfg, params)]) {
        const configured = plugin(structuredClone(config));
        manifest = (await configured.mods.android.manifest({ ...configured, modResults: manifest, modRequest: { projectRoot: f.directory, platformProjectRoot: f.platform, platform: 'android', modName: 'manifest' } })).modResults;
    }
    await AndroidConfig.Manifest.writeAndroidManifestAsync(f.file, manifest);
    return finalize(f, development);
}
function filters(manifest: any) { return manifest.manifest.application[0].activity.find((entry: any) => entry.$['android:name'] === '.MainActivity')['intent-filter']; }
function contextFilters(manifest: any) { return manifest.manifest.application[0].receiver.find((entry: any) => entry.$['android:name'].endsWith('.ContextAutomationReceiver'))['intent-filter']; }

test('real shortcut/context/share plugins plus final brand transform remain idempotent over repeated Dev prebuild cycles', async () => {
    const f = await fixture();
    const once = await cycle(f);
    const twice = await cycle(f);
    expect(twice).toEqual(once);
    expect(filters(twice)).toHaveLength(5); // launcher, VIEW, CREATE_NOTE, SEND, SEND_MULTIPLE
    expect(contextFilters(twice)).toHaveLength(2); // with URI versus without URI
    expect(await cycle(f)).toEqual(twice);
});

test('Dev -> Stable -> Dev with real plugins preserves identities without duplicate growth', async () => {
    const f = await fixture();
    const dev = await cycle(f);
    const stable = await cycle(f, false);
    expect(filters(stable)).toHaveLength(filters(dev).length);
    expect(contextFilters(stable)).toHaveLength(2);
    expect(JSON.stringify(stable)).not.toContain('todomoe-dev');
    expect(await cycle(f, false)).toEqual(stable);
    expect(await cycle(f, true)).toEqual(dev);
});

test('real Expo scheme insertion and channel rewrite deduplicate data while preserving distinct exp schemes', async () => {
    const f = await fixture();
    await cycle(f, true, true);
    const stable = await cycle(f, false, true);
    const assertNoRepeatedData = (manifest: any) => {
        for (const filter of filters(manifest)) {
            const values = (filter.data ?? []).map((entry: any) => JSON.stringify(entry));
            expect(new Set(values).size).toBe(values.length);
        }
    };
    assertNoRepeatedData(stable);
    expect(await cycle(f, false, true)).toEqual(stable);
    const dev = await cycle(f, true, true); assertNoRepeatedData(dev);
    expect(await cycle(f, true, true)).toEqual(dev);
    const schemes = filters(dev).flatMap((filter: any) => (filter.data ?? []).map((entry: any) => entry.$['android:scheme']));
    expect(schemes).toContain('exp+todo-moe');
    expect(schemes).toContain('exp+todo-moe-dev');
});

test('removes only exact nodes/filters and preserves all attributes, unknown tags and different ordered data', async () => {
    const manifest: any = fresh();
    const duplicate: any = view();
    duplicate.action.push(structuredClone(duplicate.action[0]));
    duplicate.category.push(structuredClone(duplicate.category[0]));
    duplicate.data.push(structuredClone(duplicate.data[0]));
    const distinct = [
        { ...view(), $: { 'android:priority': '1' } },
        { ...view(), $: { 'android:autoVerify': 'true' } },
        view([{ $: { 'android:scheme': 'todomoe-dev', 'android:host': 'one' } }]),
        view([{ $: { 'android:scheme': 'todomoe-dev', 'android:host': 'two' } }]),
        view([{ $: { 'android:scheme': 'todomoe-dev', 'android:pathPrefix': '/one' } }]),
        view([{ $: { 'android:scheme': 'todomoe-dev', 'android:path': '/one' } }]),
        view([{ $: { 'android:mimeType': 'text/plain' } }]),
        { ...view(), action: [node('android.intent.action.SEND')] },
        { ...view(), category: [node('android.intent.category.DEFAULT')] },
        { ...view(), 'uri-relative-filter-group': [{ $: { 'android:allow': 'false' }, data: [{ $: { 'android:path': '/blocked' } }] }] },
        view([{ $: { 'android:host': 'one' } }, { $: { 'android:host': 'two' } }]),
        view([{ $: { 'android:host': 'two' } }, { $: { 'android:host': 'one' } }]),
    ];
    manifest.manifest.application[0].activity[0]['intent-filter'] = [duplicate, structuredClone(duplicate), ...distinct];
    for (const component of ['activity-alias', 'receiver', 'service']) {
        manifest.manifest.application[0][component] = [{ $: { 'android:name': `example.${component}` }, 'intent-filter': [view(), view()] }];
    }
    const f = await fixture(manifest);
    const result = await finalize(f);
    expect(filters(result)).toEqual([view(), ...distinct]);
    for (const component of ['activity-alias', 'receiver', 'service']) expect(result.manifest.application[0][component][0]['intent-filter']).toEqual([view()]);
    const once = readFileSync(f.file, 'utf8');
    expect(await finalize(f)).toEqual(result);
    expect(readFileSync(f.file, 'utf8')).toBe(once);
});
