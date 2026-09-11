import { describe, expect, it, vi } from 'vitest';
import { createDevelopmentSyncGuard, describeDevSyncTarget } from './dev-sync-guard';
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(), removeItem: vi.fn() } }));
vi.mock('expo-constants', () => ({ default: { expoConfig: {} } }));

const target = { backend: 'webdav', location: 'https://sync.example/test/', account: 'dev', credential: 'fake-secret' };
const options = () => ({ development: true, manual: true, foreground: true, confirm: vi.fn().mockResolvedValue(true) });

describe('Dev sync target consent', () => {
    it('blocks auto/background before any prompt and permits explicit manual confirmation', async () => {
        const guard = createDevelopmentSyncGuard();
        const input = options();
        expect(await guard(target, { ...input, manual: false })).toBe(false);
        expect(await guard(target, { ...input, foreground: false })).toBe(false);
        expect(input.confirm).not.toHaveBeenCalled();
        expect(await guard(target, input)).toBe(true);
        expect(await guard(target, { ...input, manual: false, foreground: false })).toBe(true);
        expect(input.confirm).toHaveBeenCalledTimes(1);
    });
    it('requires confirmation again for a new directory, user, token, or process', async () => {
        const guard = createDevelopmentSyncGuard();
        const input = options();
        await guard(target, input);
        for (const replacement of [{ location: 'https://sync.example/daily/' }, { account: 'daily' }, { credential: 'other-fake-secret' }]) {
            expect(await guard({ ...target, ...replacement }, { ...input, manual: false })).toBe(false);
        }
        expect(await createDevelopmentSyncGuard()(target, { ...input, manual: false })).toBe(false);
    });
    it('does not turn a cancellation into approval and deduplicates simultaneous prompts', async () => {
        const guard = createDevelopmentSyncGuard();
        let resolve!: (value: boolean) => void;
        const input = { ...options(), confirm: vi.fn(() => new Promise<boolean>((r) => { resolve = r; })) };
        const first = guard(target, input);
        const second = guard(target, input);
        await Promise.resolve();
        resolve(false);
        expect(await first).toBe(false);
        expect(await second).toBe(false);
        expect(input.confirm).toHaveBeenCalledTimes(1);
        expect(await guard(target, { ...input, manual: false })).toBe(false);
        expect(await guard(target, options())).toBe(true);
    });
    it('preserves Stable and disabled sync behavior', async () => {
        const guard = createDevelopmentSyncGuard();
        const input = options();
        expect(await guard(target, { ...input, development: false, manual: false })).toBe(true);
        expect(await guard({ backend: 'off' }, input)).toBe(true);
        expect(input.confirm).not.toHaveBeenCalled();
    });
    it('never puts URL passwords, query credentials or auth tokens in the prompt', () => {
        expect(describeDevSyncTarget({ ...target, location: 'https://user:secret@sync.example/test/?token=hidden#password' }))
            .toBe('webdav: https://sync.example/test/');
    });
});
