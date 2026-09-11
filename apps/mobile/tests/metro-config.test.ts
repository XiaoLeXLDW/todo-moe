import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const metroConfig = require('../metro.config.js');

function isMetroBlocked(filePath: string): boolean {
  const blockList = metroConfig.resolver.blockList;
  const blockPatterns = Array.isArray(blockList) ? blockList : [blockList];
  const normalizedPath = filePath.split(path.sep).join('/');
  return blockPatterns.some((pattern: RegExp) => pattern.test(normalizedPath));
}

describe('metro config', () => {
  it('blocks route tests and private caches with actual Windows as well as POSIX separators', () => {
    const patterns = metroConfig.resolver.blockList as RegExp[];
    for (const filename of [
      'F:\\project\\apps\\mobile\\app\\global-search.test.tsx',
      'F:\\project\\apps\\mobile\\app\\(drawer)\\done.test.tsx',
      '/project/apps/mobile/app/global-search.test.tsx',
      'F:\\project\\.tools\\sdk\\cache.js',
      'F:\\project\\.secrets\\private.json',
    ]) expect(patterns.some((pattern) => pattern.test(filename))).toBe(true);
    expect(patterns.some((pattern) => pattern.test('F:\\project\\apps\\mobile\\app\\global-search.tsx'))).toBe(false);
  });

  it('isolates optional profiling transforms from ordinary release transforms', () => {
    const flags = ['EXPO_PUBLIC_CAPTURE_PROFILING', 'EXPO_PUBLIC_STARTUP_PROFILING'];
    const previous = flags.map((flag) => process.env[flag]);
    const filename = require.resolve('../metro.config.js');
    const load = (capture?: string, startup?: string) => {
      [capture, startup].forEach((value, index) => {
        if (value === undefined) delete process.env[flags[index]];
        else process.env[flags[index]] = value;
      });
      delete require.cache[filename];
      return require(filename).cacheVersion;
    };
    try {
      const normal = load();
      const capture = load('1');
      const startup = load(undefined, '1');
      const both = load('1', '1');
      expect(new Set([normal, capture, startup, both]).size).toBe(4);
      expect(load()).toBe(normal);
      expect(load('0', 'false')).toBe(normal);
      expect(load('true')).toBe(normal); // Capture requires the exact native opt-in.
      expect(load(undefined, ' TRUE ')).toBe(startup);
    } finally {
      previous.forEach((value, index) => {
        if (value === undefined) delete process.env[flags[index]];
        else process.env[flags[index]] = value;
      });
      delete require.cache[filename];
    }
  });

  it('blocks nested git worktrees from the Metro watcher', () => {
    const worktreeDependencyPath = path.resolve(
      process.cwd(),
      '../../.worktrees/issue-753-add-task-shortcut/node_modules/@types/babel__generator/node_modules/@babel/types/node_modules/@babel/helper-string-parser',
    );

    expect(isMetroBlocked(worktreeDependencyPath)).toBe(true);
  });
});
