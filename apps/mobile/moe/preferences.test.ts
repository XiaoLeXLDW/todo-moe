import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));

beforeEach(() => { vi.resetModules(); storage.getItem.mockReset().mockResolvedValue(null); storage.setItem.mockReset().mockResolvedValue(undefined); });
describe('device preference persistence', () => {
  it('upgrades the previous strongest choices once without overriding explicit reduced/off choices', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ motion: 'lively', haptics: 'light' }));
    const first = await import('./preferences');
    await first.hydrateMoePreferences();
    expect(first.getMoePreferences()).toMatchObject({ presentationVersion: 2, motion: 'maximal', haptics: 'crisp' });
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    expect(JSON.parse(storage.setItem.mock.calls[0][1])).toMatchObject({ presentationVersion: 2, motion: 'maximal', haptics: 'crisp' });

    vi.resetModules(); storage.getItem.mockReset().mockResolvedValue(JSON.stringify({ motion: 'simple', haptics: 'off' })); storage.setItem.mockReset().mockResolvedValue(undefined);
    const second = await import('./preferences');
    await second.hydrateMoePreferences();
    expect(second.getMoePreferences()).toMatchObject({ motion: 'simple', haptics: 'off' });
  });
  it('hydrates before applying an edit, preserving other saved preferences', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ theme: 'ink', followSystem: false, haptics: 'off' }));
    const { setMoePreferences, getMoePreferences } = await import('./preferences');
    await setMoePreferences({ glass: 'off' });
    expect(getMoePreferences()).toMatchObject({ theme: 'ink', haptics: 'off', glass: 'off' });
    expect(storage.setItem.mock.calls[0][0]).toBe('@todo-moe/presentation/v1');
  });
  it('serializes quick edits so an older write cannot overwrite the final selection', async () => {
    let release!: () => void;
    storage.setItem.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const { setMoePreferences, getMoePreferences, hydrateMoePreferences } = await import('./preferences');
    await hydrateMoePreferences();
    const first = setMoePreferences({ appearance: 'dark' });
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    const second = setMoePreferences({ colorSource: 'custom', customColor: '#FFCC00' });
    await Promise.resolve();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(JSON.parse(storage.setItem.mock.calls.at(-1)![1]).customColor).toBe('#FFCC00');
    expect(getMoePreferences().customColor).toBe('#FFCC00');
  });
  it('rolls back a failed save and remains editable after corrupt JSON', async () => {
    storage.getItem.mockResolvedValue('{corrupt');
    storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    const { setMoePreferences, getMoePreferences } = await import('./preferences');
    await expect(setMoePreferences({ theme: 'ink' })).rejects.toThrow('disk full');
    expect(getMoePreferences().theme).toBe('soft');
    await setMoePreferences({ haptics: 'off' });
    expect(getMoePreferences().haptics).toBe('off');
  });
});
