import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';
import { customTheme } from './themes';

const mock = vi.hoisted(() => ({ get: vi.fn(), nativeSubscribe: vi.fn(), appSubscribe: vi.fn(), nativeRemove: vi.fn(), appRemove: vi.fn() }));
vi.mock('expo-modules-core', () => ({ requireOptionalNativeModule: () => ({ getPalette: mock.get, addListener: mock.nativeSubscribe }) }));
vi.mock('react-native', () => ({ Platform: { OS: 'android', Version: 35 }, AppState: { addEventListener: mock.appSubscribe } }));
const palette = (seed: string) => ({ supported: true, light: customTheme(seed, false), dark: customTheme(seed, true) });
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); mock.get.mockReturnValue(palette('#6750A4'));
  mock.nativeSubscribe.mockReturnValue({ remove: mock.nativeRemove });
  mock.appSubscribe.mockReturnValue({ remove: mock.appRemove });
});
it('uses native colors on first render and deduplicates unchanged palettes', async () => {
  const colors = await import('./system-palette');
  const first = colors.getSystemPalette();
  expect(first.supported).toBe(true);
  colors.refreshSystemPalette();
  expect(colors.getSystemPalette()).toBe(first);
});
it('refreshes on foreground or native palette changes and disposes listeners', async () => {
  const colors = await import('./system-palette');
  function Probe() { return React.createElement('Text', null, colors.useSystemPalette().light?.tint); }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<Probe />); });
  expect(mock.nativeSubscribe).toHaveBeenCalledWith('onPaletteChanged', expect.any(Function));
  const changed = palette('#CC2200'); mock.get.mockReturnValue(changed);
  act(() => { mock.appSubscribe.mock.calls[0][1]('active'); });
  expect(colors.getSystemPalette()).toEqual(changed);
  const nativeChange = palette('#226600');
  act(() => { mock.nativeSubscribe.mock.calls[0][1](nativeChange); });
  expect(colors.getSystemPalette()).toEqual(nativeChange);
  act(() => { tree.unmount(); });
  expect(mock.nativeRemove).toHaveBeenCalledOnce(); expect(mock.appRemove).toHaveBeenCalledOnce();
});
it('rejects incomplete native colors and safely falls back after native failure', async () => {
  const colors = await import('./system-palette');
  expect(colors.parseSystemPalette({ supported: true, light: { tint: 'invalid' } })).toEqual({ supported: false });
  mock.get.mockImplementation(() => { throw new Error('native unavailable'); });
  expect(() => colors.refreshSystemPalette()).not.toThrow();
  expect(colors.getSystemPalette()).toEqual({ supported: false });
});
