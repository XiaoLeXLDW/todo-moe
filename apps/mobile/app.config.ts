import type { ConfigContext, ExpoConfig } from 'expo/config';
import { execFileSync } from 'node:child_process';
import { getTodoMoeIdentity, todoMoeBrand, type TodoMoeChannel } from './moe/brand/config.cjs';

function git(...args: string[]) {
    try { return execFileSync('git', args, { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    catch { return ''; }
}

export default ({ config }: ConfigContext): ExpoConfig => {
    // Upstream Android plugins also read this flag while resolving the config.
    process.env.FOSS_BUILD = '1';
    const channel = (process.env.APP_VARIANT?.trim() || 'development') as TodoMoeChannel;
    if (channel !== 'development' && channel !== 'stable') throw new Error('APP_VARIANT must be development or stable.');
    const identity = getTodoMoeIdentity(channel);
    const sourceSha = git('rev-parse', 'HEAD');
    const dirty = git('status', '--porcelain', '--untracked-files=normal') !== '';
    const versionCode = Number(process.env.MOE_VERSION_CODE || 1);
    if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) {
        throw new Error('MOE_VERSION_CODE must be an integer in 1..2100000000.');
    }
    if (channel === 'stable' && (!process.env.MOE_VERSION_CODE || dirty || !/^[0-9a-f]{40}$/.test(sourceSha))) {
        throw new Error('Stable requires an explicit MOE_VERSION_CODE and a clean Git commit.');
    }
    if (process.env.MOE_SOURCE_SHA && process.env.MOE_SOURCE_SHA !== sourceSha) throw new Error('MOE_SOURCE_SHA differs from checked-out HEAD.');
    const base = config as ExpoConfig;
    // iOS CloudKit and widget identities remain upstream source only: Android is
    // the supported fork deliverable and these plugins must not be applied.
    const plugins = (base.plugins ?? []).filter((entry) => {
        const name = Array.isArray(entry) ? entry[0] : entry;
        return typeof name !== 'string' || !name.startsWith('./plugins/ios-');
    }).map((entry) => {
        if (!Array.isArray(entry)) return entry;
        if (entry[0] === 'expo-share-intent') return [entry[0], {
            ...Object.fromEntries(Object.entries(entry[1] ?? {}).filter(([key]) => !key.startsWith('ios'))),
            disableIOS: true,
        }] as typeof entry;
        if (entry[0] === './plugins/android-widget') return [entry[0], { ...entry[1], label: identity.name }] as typeof entry;
        if (entry[0] === 'expo-splash-screen') return [entry[0], {
            ...entry[1], image: './moe/brand/icon.png', backgroundColor: '#0D141B',
            dark: { ...entry[1]?.dark, image: './moe/brand/icon.png', backgroundColor: '#0D141B' },
        }] as typeof entry;
        return entry;
    });
    const { eas: _eas, ...baseExtra } = base.extra ?? {};
    const { owner: _owner, updates: _updates, ios: _ios, ...safeBase } = base;
    return {
        ...safeBase,
        name: identity.name,
        slug: channel === 'development' ? 'todo-moe-dev' : 'todo-moe',
        version: todoMoeBrand.version,
        scheme: identity.scheme,
        platforms: ['android'],
        icon: './moe/brand/icon.png',
        updates: { enabled: false },
        android: {
            ...base.android,
            package: identity.packageName,
            versionCode,
            adaptiveIcon: {
                foregroundImage: './moe/brand/foreground.png',
                monochromeImage: './moe/brand/monochrome.png',
                backgroundColor: '#0D141B',
            },
        },
        extra: {
            ...baseExtra,
            isFossBuild: true,
            analyticsHeartbeatUrl: '',
            analyticsHeartbeatChannel: '',
            analyticsReleaseVersion: '',
            feedbackEndpointUrl: '',
            dropboxAppKey: '',
            donationPromptEnabled: false,
            promptTestControlsEnabled: false,
            watchEnabled: false,
            todoMoe: { ...todoMoeBrand, ...identity, sourceSha: sourceSha || 'unknown', dirty, versionCode },
        },
        plugins: [...plugins, ['./moe/brand/with-todo-moe.cjs', { scheme: identity.scheme, channel }]],
    };
};
