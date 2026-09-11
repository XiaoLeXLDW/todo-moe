import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { NavigationContext } from '@react-navigation/native';
import { View } from 'react-native';

vi.mock('@react-navigation/native', async () => {
    const ReactModule = await import('react');
    return { NavigationContext: ReactModule.createContext(undefined) };
});

vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('@/hooks/use-theme-colors', () => ({
    useThemeColors: () => ({
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        tint: '#2563eb',
        cardBg: '#ffffff',
        border: '#d1d5db',
        text: '#111827',
        secondaryText: '#6b7280',
        bg: '#f9fafb',
    }),
}));

vi.mock('@/lib/app-log', () => ({
    logError: vi.fn(),
}));

vi.mock('react-native', async () => {
    const actual = await vi.importActual<typeof import('react-native')>('react-native');
    class MockAnimatedValue {
        _value: number;

        constructor(value: number) {
            this._value = value;
        }

        stopAnimation() {
            return undefined;
        }

        setValue(value: number) {
            this._value = value;
        }
    }
    const createAnimation = () => ({
        start: (callback?: () => void) => callback?.(),
        stop: () => undefined,
    });
    return {
        ...actual,
        Animated: {
            ...actual.Animated,
            Value: MockAnimatedValue,
            timing: vi.fn(() => createAnimation()),
            parallel: vi.fn(() => createAnimation()),
        },
        Easing: {
            out: (value: unknown) => value,
            quad: 'quad',
            cubic: 'cubic',
        },
    };
});

import { ToastProvider, ToastViewport, useToast, useToastBottomOffset, type ToastOptions } from './toast-context';

const QUEUE_GAP_MS = 120;
const TOAST_SWIPE_TARGET_TEST_ID = 'toast-swipe-dismiss-target';
type ToastControls = {
    showToast: (options: ToastOptions) => void;
    dismissToast: () => void;
};

const getRenderedText = (tree: ReactTestRenderer): string => JSON.stringify(tree.toJSON());

function ToastHarness({ onReady }: { onReady: (controls: ToastControls) => void }) {
    const controls = useToast();

    React.useEffect(() => {
        onReady(controls);
    }, [controls, onReady]);

    return null;
}

// Native-stack can leave a blurred screen and its modal content mounted. Focus
// events must release toast ownership even if that screen never rerenders.
function createScreenNavigation(initialFocused = true) {
    let focused = initialFocused;
    const listeners = { focus: new Set<() => void>(), blur: new Set<() => void>() };
    return {
        navigation: {
            isFocused: () => focused,
            addListener: (event: 'focus' | 'blur', listener: () => void) => {
                listeners[event].add(listener);
                return () => listeners[event].delete(listener);
            },
        } as unknown as NonNullable<React.ContextType<typeof NavigationContext>>,
        setFocused(next: boolean) {
            focused = next;
            listeners[next ? 'focus' : 'blur'].forEach((listener) => listener());
        },
    };
}

function renderedToastHost(tree: ReactTestRenderer): string {
    let node = tree.root.findByProps({ testID: TOAST_SWIPE_TARGET_TEST_ID }).parent;
    while (node) {
        if (node.props.testID === 'project-modal-host' || node.props.testID === 'global-modal-host') return node.props.testID;
        node = node.parent;
    }
    return 'root';
}

describe('ToastProvider', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('shows the settings invalid-backup warning at the root after the project blurs without unmounting its viewport', () => {
        const projectScreen = createScreenNavigation();
        let project!: ToastControls;
        let settings!: ToastControls;
        let tree!: ReactTestRenderer;
        act(() => {
            tree = create(
                <ToastProvider>
                    <NavigationContext.Provider value={projectScreen.navigation}>
                        <View testID="project-modal-host">
                            <ToastHarness onReady={(value) => { project = value; }} />
                            <ToastViewport />
                        </View>
                    </NavigationContext.Provider>
                    <ToastHarness onReady={(value) => { settings = value; }} />
                </ToastProvider>
            );
        });
        act(() => { project.showToast({ message: 'Project saved', durationMs: 10_000 }); });
        expect(renderedToastHost(tree)).toBe('project-modal-host');
        act(() => { project.dismissToast(); });
        act(() => { projectScreen.setFocused(false); });
        // Do not update/unmount the project tree: a frozen retained route must
        // release its ownership through the blur subscription itself.
        expect(tree.root.findAllByType(ToastViewport)).toHaveLength(1);
        act(() => { settings.showToast({ title: '无效备份', message: 'Mindwtr 无法安全读取此导出文件。', tone: 'warning', durationMs: 10_000 }); });
        expect(renderedToastHost(tree)).toBe('root');
        expect(getRenderedText(tree).match(/无效备份/g)).toHaveLength(1);
        act(() => { tree.unmount(); });
    });

    it('does not let a viewport mounted on an already-background screen hide the visible root toast', () => {
        const backgroundScreen = createScreenNavigation(false);
        let controls!: ToastControls;
        let tree!: ReactTestRenderer;
        act(() => {
            tree = create(
                <ToastProvider>
                    <ToastHarness onReady={(value) => { controls = value; }} />
                    <NavigationContext.Provider value={backgroundScreen.navigation}>
                        <View testID="project-modal-host"><ToastViewport /></View>
                    </NavigationContext.Provider>
                </ToastProvider>
            );
        });
        act(() => { controls.showToast({ message: 'Settings error', durationMs: 10_000 }); });
        expect(renderedToastHost(tree)).toBe('root');
        act(() => { backgroundScreen.setFocused(true); });
        expect(renderedToastHost(tree)).toBe('project-modal-host');
        act(() => { backgroundScreen.setFocused(false); });
        expect(renderedToastHost(tree)).toBe('root');
        act(() => { tree.unmount(); });
    });

    it('preserves modal mount priority when an older route refocuses, including a global viewport without navigation', () => {
        const projectScreen = createScreenNavigation();
        let controls!: ToastControls;
        let tree!: ReactTestRenderer;
        const render = (globalModal: boolean, navigation = projectScreen.navigation) => (
            <ToastProvider>
                <ToastHarness onReady={(value) => { controls = value; }} />
                <NavigationContext.Provider value={navigation}>
                    <View testID="project-modal-host"><ToastViewport /></View>
                </NavigationContext.Provider>
                {globalModal && <View testID="global-modal-host"><ToastViewport /></View>}
            </ToastProvider>
        );
        act(() => { tree = create(render(true)); });
        act(() => { controls.showToast({ message: 'Global modal toast', durationMs: 10_000 }); });
        expect(renderedToastHost(tree)).toBe('global-modal-host');
        act(() => { projectScreen.setFocused(false); });
        act(() => { projectScreen.setFocused(true); });
        expect(renderedToastHost(tree)).toBe('global-modal-host');
        const replacementNavigation = createScreenNavigation();
        act(() => { tree.update(render(true, replacementNavigation.navigation)); });
        expect(renderedToastHost(tree)).toBe('global-modal-host');
        act(() => { tree.update(render(false, replacementNavigation.navigation)); });
        expect(renderedToastHost(tree)).toBe('project-modal-host');
        act(() => { projectScreen.setFocused(false); });
        expect(renderedToastHost(tree)).toBe('project-modal-host');
        act(() => { replacementNavigation.setFocused(false); });
        expect(renderedToastHost(tree)).toBe('root');
        act(() => { tree.unmount(); });
    });

    it('queues new toasts instead of replacing the current toast', () => {
        let controls: ToastControls | null = null;
        let tree: ReactTestRenderer | null = null;

        act(() => {
            tree = create(
                <ToastProvider>
                    <ToastHarness onReady={(value) => {
                        controls = value;
                    }}
                    />
                </ToastProvider>
            );
        });

        expect(controls).not.toBeNull();
        expect(tree).not.toBeNull();
        if (!controls || !tree) return;
        const toastControls = controls as ToastControls;
        const renderedTree = tree as ReactTestRenderer;

        act(() => {
            toastControls.showToast({ message: 'First toast', durationMs: 100 });
            toastControls.showToast({ message: 'Second toast', durationMs: 100 });
        });

        expect(getRenderedText(renderedTree)).toContain('First toast');
        expect(getRenderedText(renderedTree)).not.toContain('Second toast');

        act(() => {
            vi.advanceTimersByTime(100 + QUEUE_GAP_MS);
        });

        expect(getRenderedText(renderedTree)).not.toContain('First toast');
        expect(getRenderedText(renderedTree)).toContain('Second toast');

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(getRenderedText(renderedTree)).not.toContain('Second toast');
    });

    test.each([
        ['right', 96],
        ['left', -96],
    ])('dismisses the visible toast after a horizontal swipe %s', (_direction, dx) => {
        let controls: ToastControls | null = null;
        let tree: ReactTestRenderer | null = null;

        act(() => {
            tree = create(
                <ToastProvider>
                    <ToastHarness onReady={(value) => {
                        controls = value;
                    }}
                    />
                </ToastProvider>
            );
        });

        expect(controls).not.toBeNull();
        expect(tree).not.toBeNull();
        if (!controls || !tree) return;
        const toastControls = controls as ToastControls;
        const renderedTree = tree as ReactTestRenderer;

        act(() => {
            toastControls.showToast({ message: `Swipe ${_direction}`, durationMs: 10_000 });
        });

        const swipeTarget = renderedTree.root.findByProps({ testID: TOAST_SWIPE_TARGET_TEST_ID });

        expect(getRenderedText(renderedTree)).toContain(`Swipe ${_direction}`);

        act(() => {
            swipeTarget.props.onResponderRelease?.({}, { dx, dy: 4, vx: 0.2 });
        });

        expect(getRenderedText(renderedTree)).not.toContain(`Swipe ${_direction}`);
    });

    it('renders the toast in the topmost mounted viewport instead of the root overlay', () => {
        let controls: ToastControls | null = null;
        let tree: ReactTestRenderer | null = null;

        const render = (withViewport: boolean) => (
            <ToastProvider>
                <ToastHarness onReady={(value) => {
                    controls = value;
                }}
                />
                {withViewport && <ToastViewport />}
            </ToastProvider>
        );

        act(() => {
            tree = create(render(true));
        });

        expect(controls).not.toBeNull();
        expect(tree).not.toBeNull();
        if (!controls || !tree) return;
        const toastControls = controls as ToastControls;
        const renderedTree = tree as ReactTestRenderer;

        act(() => {
            toastControls.showToast({ message: 'Modal toast', durationMs: 10_000 });
        });

        // Exactly one toast instance: the viewport renders it, the root overlay stays empty.
        expect(getRenderedText(renderedTree).match(/Modal toast/g)).toHaveLength(1);

        // Unmounting the viewport (modal closes) hands the toast back to the root overlay.
        act(() => {
            renderedTree.update(render(false));
        });

        expect(getRenderedText(renderedTree)).toContain('Modal toast');
    });

    it('lifts the root overlay above a registered bottom bar, but not modal viewports (#1044)', () => {
        let controls: ToastControls | null = null;
        let tree: ReactTestRenderer | null = null;

        function TabBarStub() {
            useToastBottomOffset(88);
            return null;
        }

        const render = (withViewport: boolean) => (
            <ToastProvider>
                <ToastHarness onReady={(value) => {
                    controls = value;
                }}
                />
                <TabBarStub />
                {withViewport && <ToastViewport />}
            </ToastProvider>
        );

        act(() => {
            tree = create(render(false));
        });
        expect(controls).not.toBeNull();
        expect(tree).not.toBeNull();
        if (!controls || !tree) return;
        const toastControls = controls as ToastControls;
        const renderedTree = tree as ReactTestRenderer;

        act(() => {
            toastControls.showToast({ message: 'Offset toast', durationMs: 10_000 });
        });

        // Root overlay: offset (88) + gap, not the plain safe-area padding.
        const viewport = renderedTree.root
            .findByProps({ testID: TOAST_SWIPE_TARGET_TEST_ID })
            .parent!;
        const paddingOf = (node: typeof viewport) => Object.assign(
            {},
            ...[node.props.style].flat(Infinity).filter(Boolean),
        ).paddingBottom;
        expect(paddingOf(viewport)).toBe(100);

        // A modal viewport has no tab bar under it: plain padding again.
        act(() => {
            renderedTree.update(render(true));
        });
        const modalViewport = renderedTree.root
            .findByProps({ testID: TOAST_SWIPE_TARGET_TEST_ID })
            .parent!;
        expect(paddingOf(modalViewport)).toBe(32);
    });
});
