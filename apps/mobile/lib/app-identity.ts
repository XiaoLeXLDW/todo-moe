import Constants from 'expo-constants';

export const TODO_MOE_REPOSITORY = 'https://github.com/XiaoLeXLDW/todo-moe';
export const TODO_MOE_RELEASES_API = 'https://api.github.com/repos/XiaoLeXLDW/todo-moe/releases/latest';
export const TODO_MOE_RELEASES_URL = `${TODO_MOE_REPOSITORY}/releases/latest`;
export const TODO_MOE_ISSUES_URL = `${TODO_MOE_REPOSITORY}/issues/new`;

type IdentityConfig = {
    scheme?: string | string[];
    android?: { package?: string };
    extra?: { todoMoe?: { packageName?: string; scheme?: string; channel?: string } };
};

/** Match the installed build, including cold-start links before the React tree mounts. */
export function resolveAppIdentity(config?: IdentityConfig | null) {
    const brand = config?.extra?.todoMoe;
    const packageName = brand?.packageName || config?.android?.package || 'io.github.xiaolexldw.todomoe';
    const channel = brand?.channel === 'development' || packageName.endsWith('.dev')
        ? 'development' : 'stable';
    const configuredScheme = brand?.scheme || (Array.isArray(config?.scheme) ? config.scheme[0] : config?.scheme);
    // Do not take ownership of the official client's scheme when running a stale config.
    const scheme = configuredScheme && /^todomoe(?:-dev)?$/.test(configuredScheme)
        ? configuredScheme : channel === 'development' ? 'todomoe-dev' : 'todomoe';
    return { packageName, scheme, channel } as const;
}

export const getAppIdentity = () => resolveAppIdentity(Constants.expoConfig);
export const isDevelopmentBuild = () => getAppIdentity().channel === 'development';
export const appDeepLink = (route: string) => `${getAppIdentity().scheme}://${route}`;
export const isAppUrlProtocol = (protocol: string) => protocol.toLowerCase() === `${getAppIdentity().scheme}:`;
