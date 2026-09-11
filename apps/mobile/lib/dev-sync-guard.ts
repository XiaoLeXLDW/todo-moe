import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState } from 'react-native';
import { computeStableValueFingerprint } from '@mindwtr/core';
import { isDevelopmentBuild } from './app-identity';
import { getSecureConfigValue } from './secure-config';
import { CLOUD_PROVIDER_KEY, CLOUD_TOKEN_KEY, CLOUD_URL_KEY, SYNC_BACKEND_KEY, SYNC_PATH_KEY, WEBDAV_PASSWORD_KEY, WEBDAV_URL_KEY, WEBDAV_USERNAME_KEY } from './sync-constants';

export const DEV_SYNC_NOTICE = 'Dev 仅隔离本机应用数据，不会自动隔离云端。请使用独立测试账号、目录或服务；不要连接日用同步空间。';
export const DEV_SYNC_CONFIRMATION_REQUIRED = 'Todo Moe Dev 同步已暂停。请在前台手动同步，并确认当前目标是独立测试空间。';

export type DevSyncTarget = {
    backend: string;
    location?: string | null;
    account?: string | null;
    credential?: string | null;
    provider?: string | null;
};

export function describeDevSyncTarget(target: DevSyncTarget): string {
    if (!target.location) return target.provider || target.backend;
    try {
        const url = new URL(target.location);
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return `${target.backend}: ${url.toString()}`;
    } catch {
        return `${target.backend}: ${target.location.split(/[?#]/)[0]}`;
    }
}

/** Process-local approval only: no endpoint, credential or approval enters sync data.
 * Restarting or changing a target/account requires a fresh foreground confirmation. */
export function createDevelopmentSyncGuard() {
    const approved = new Set<string>();
    const pending = new Map<string, Promise<boolean>>();
    return async (target: DevSyncTarget, options: {
        development: boolean;
        manual: boolean;
        foreground: boolean;
        confirm: (description: string) => Promise<boolean>;
    }): Promise<boolean> => {
        if (!options.development || target.backend === 'off') return true;
        const fingerprint = computeStableValueFingerprint({
            backend: target.backend,
            location: target.location?.trim() || '',
            account: target.account?.trim() || '',
            credential: target.credential || '',
            provider: target.provider || '',
        });
        if (approved.has(fingerprint)) return true;
        if (!options.manual || !options.foreground) return false;
        const inFlight = pending.get(fingerprint);
        if (inFlight) return inFlight;
        const confirmation = Promise.resolve()
            .then(() => options.confirm(describeDevSyncTarget(target)))
            .then((accepted) => {
                if (accepted) approved.add(fingerprint);
                return accepted;
            })
            .finally(() => pending.delete(fingerprint));
        pending.set(fingerprint, confirmation);
        return confirmation;
    };
}

const guard = createDevelopmentSyncGuard();
export async function assertDevelopmentSyncTarget(target: DevSyncTarget, manual: boolean): Promise<void> {
    const accepted = await guard(target, {
        development: isDevelopmentBuild(),
        manual,
        foreground: AppState.currentState === 'active',
        confirm: (description) => new Promise<boolean>((resolve) => {
            Alert.alert('确认 Dev 测试同步目标', `${DEV_SYNC_NOTICE}\n\n${description}\n\n此确认仅在本次应用运行期间有效。`, [
                { text: '取消同步', style: 'cancel', onPress: () => resolve(false) },
                { text: '已确认独立测试目标', onPress: () => resolve(true) },
            ], { cancelable: true, onDismiss: () => resolve(false) });
        }),
    });
    if (!accepted) throw new Error(DEV_SYNC_CONFIRMATION_REQUIRED);
}

export async function readStoredDevSyncTarget(readConfig: (key: string) => Promise<string | null> = (key) =>
    key === WEBDAV_PASSWORD_KEY || key === CLOUD_TOKEN_KEY ? getSecureConfigValue(key) : AsyncStorage.getItem(key)
): Promise<DevSyncTarget> {
    const backend = (await readConfig(SYNC_BACKEND_KEY))?.trim() || 'off';
    if (backend === 'webdav') return {
        backend,
        location: await readConfig(WEBDAV_URL_KEY),
        account: await readConfig(WEBDAV_USERNAME_KEY),
        credential: await readConfig(WEBDAV_PASSWORD_KEY),
    };
    if (backend === 'cloud') {
        const provider = await readConfig(CLOUD_PROVIDER_KEY);
        if (provider === 'dropbox') {
            const { getStoredDropboxTokens } = await import('./dropbox-auth');
            return { backend, provider, credential: (await getStoredDropboxTokens())?.refreshToken };
        }
        return {
            backend,
            provider: provider || 'selfhosted',
            location: await readConfig(CLOUD_URL_KEY),
            credential: await readConfig(CLOUD_TOKEN_KEY),
        };
    }
    return { backend, location: backend === 'file' ? await readConfig(SYNC_PATH_KEY) : undefined };
}

export async function assertStoredDevelopmentSyncTarget(manual: boolean): Promise<void> {
    if (isDevelopmentBuild()) await assertDevelopmentSyncTarget(await readStoredDevSyncTarget(), manual);
}
