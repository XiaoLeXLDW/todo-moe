import { describe, expect, it, vi } from 'vitest';
import { appDeepLink, getAppIdentity, resolveAppIdentity, TODO_MOE_ISSUES_URL, TODO_MOE_RELEASES_API } from './app-identity';
import { parseEntityOpenUrl, parseShortcutCaptureUrl } from './capture-deeplink';
import { parseContextAutomationUrl } from './context-automation';
import { buildTaskDoc } from './app-search-projection';
import { redirectSystemPath } from '../app/+native-intent';
const config = vi.hoisted(() => ({ scheme: 'todomoe-dev', android: { package: 'io.github.xiaolexldw.todomoe.dev' } }));
vi.mock('expo-constants', () => ({ default: { expoConfig: config } }));

describe('Todo Moe installed identity', () => {
    it('uses configured Dev callbacks and rejects official and Stable links', () => {
        expect(getAppIdentity()).toEqual({ scheme: 'todomoe-dev', packageName: config.android.package, channel: 'development' });
        expect(appDeepLink('redirect')).toBe('todomoe-dev://redirect');
        expect(parseShortcutCaptureUrl('todomoe-dev://capture?title=Draft')?.title).toBe('Draft');
        expect(parseEntityOpenUrl('todomoe-dev://open?task=task%201')).toEqual({ kind: 'task', id: 'task 1' });
        expect(parseEntityOpenUrl('mindwtr://open?task=a')).toBeNull();
        expect(parseEntityOpenUrl('todomoe://open?task=a')).toBeNull();
        expect(parseContextAutomationUrl('todomoe-dev://context/activate/home')).toEqual({ action: 'activate', context: '@home' });
        expect(redirectSystemPath({ path: 'todomoe-dev:///capture-quick?mode=text', initial: true })).toBe('/capture-modal?origin=system');
    });
    it('indexes tappable task URLs for this installation', () => {
        const task = { id: 'a/b', title: 'Read', status: 'next', tags: [], contexts: [], createdAt: '', updatedAt: '' } as const;
        expect(buildTaskDoc({ ...task, tags: [], contexts: [] })?.deepLink).toBe('todomoe-dev://open?task=a%2Fb');
    });
    it('resolves stable identity and never falls back to the official scheme', () => {
        expect(resolveAppIdentity({ scheme: 'mindwtr' }).scheme).toBe('todomoe');
        expect(resolveAppIdentity({ extra: { todoMoe: { channel: 'development' } } }).scheme).toBe('todomoe-dev');
        expect(resolveAppIdentity({ scheme: ['todomoe'] }).channel).toBe('stable');
        expect(TODO_MOE_RELEASES_API).toContain('/XiaoLeXLDW/todo-moe/');
        expect(TODO_MOE_ISSUES_URL).toBe('https://github.com/XiaoLeXLDW/todo-moe/issues/new');
    });
});
