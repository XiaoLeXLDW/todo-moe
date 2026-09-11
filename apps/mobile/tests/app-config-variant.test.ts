import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ExpoConfig } from 'expo/config';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import brand from '../moe/brand/config.json';

const MOBILE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(MOBILE_ROOT, '../..');
const FIXTURE_ROOT = join(REPO_ROOT, 'build/moe/config-fixtures');
let cleanFixture: string;
let cleanSha: string;

// Invoke Expo in an actual Node subprocess: a Vitest/TS import would miss the
// production failure where app.config.ts imported a TS-only helper from Node.
const READ_CONFIG = `
try {
  const { getConfig } = require('@expo/config');
  const result = getConfig(process.argv[1], { skipPlugins: process.argv[2] === 'true' });
  process.stdout.write(JSON.stringify(result.exp));
} catch (error) {
  process.stderr.write(error.stack || String(error));
  process.exitCode = 1;
}
`;

function runConfig(overrides: Record<string, string> = {}, projectRoot = MOBILE_ROOT) {
  const env = { ...process.env };
  for (const key of ['APP_VARIANT', 'MOE_VERSION_CODE', 'MOE_SOURCE_SHA', 'MOE_WEB_PREVIEW']) delete env[key];
  Object.assign(env, { EXPO_NO_TELEMETRY: '1', ...overrides });
  // The clean Git fixture tests configuration and source-provenance rules. The
  // real mobile project additionally resolves every Expo plugin above.
  return spawnSync(process.execPath, ['-e', READ_CONFIG, projectRoot, String(projectRoot !== MOBILE_ROOT)], {
    cwd: MOBILE_ROOT,
    env,
    encoding: 'utf8',
  });
}

function loadConfig(overrides: Record<string, string> = {}, projectRoot = MOBILE_ROOT): ExpoConfig {
  const result = runConfig(overrides, projectRoot);
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as ExpoConfig;
}

function git(cwd: string, ...args: string[]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

const widgetLabels = (config: ExpoConfig): string[] => (config.plugins ?? [])
  .filter((entry): entry is [string, { label: string }] => Array.isArray(entry) && entry[0] === './plugins/android-widget')
  .map(([, props]) => props.label);

describe('Todo Moe Expo build identity', () => {
  beforeAll(() => {
    mkdirSync(FIXTURE_ROOT, { recursive: true });
    cleanFixture = mkdtempSync(join(FIXTURE_ROOT, 'clean-'));
    for (const path of ['package.json', 'app.json', 'app.config.ts', 'moe/brand/config.cjs', 'moe/brand/config.json']) {
      const target = join(cleanFixture, path);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(MOBILE_ROOT, path), target);
    }
    git(cleanFixture, 'init', '-b', 'main');
    git(cleanFixture, 'config', 'core.autocrlf', 'false');
    git(cleanFixture, 'add', '.');
    git(cleanFixture, '-c', 'user.name=Todo Moe test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'clean config fixture');
    cleanSha = git(cleanFixture, 'rev-parse', 'HEAD');
  });

  afterAll(() => {
    if (cleanFixture && cleanFixture.startsWith(FIXTURE_ROOT + sep)) rmSync(cleanFixture, { recursive: true, force: true });
  });

  it('resolves the default Dev identity and all Android plugins in real Node/Expo', () => {
    const config = loadConfig();
    expect(config.name).toBe('Todo Moe Dev');
    expect(config.android?.package).toBe('io.github.xiaolexldw.todomoe.dev');
    expect(config.scheme).toBe('todomoe-dev');
    expect(config.version).toBe(brand.version);
    expect(config.android?.versionCode).toBe(1);
    expect(config.platforms).toEqual(['android']);
    expect(widgetLabels(config)).toEqual(['Todo Moe Dev']);
    expect(config.extra?.todoMoe).toMatchObject({
      channel: 'development', upstreamSha: brand.upstreamSha,
      sourceSha: git(REPO_ROOT, 'rev-parse', 'HEAD'),
      dirty: git(REPO_ROOT, 'status', '--porcelain', '--untracked-files=normal') !== '',
    });
  });

  it('uses the explicitly allocated Dev version code in both native config and About metadata', () => {
    const config = loadConfig({ APP_VARIANT: 'development', MOE_VERSION_CODE: '37' });
    expect(config.android?.versionCode).toBe(37);
    expect(config.extra?.todoMoe).toMatchObject({ versionCode: 37, packageName: config.android?.package, scheme: 'todomoe-dev' });
  });

  it('does not inherit upstream services, Expo ownership, OTA or Watch even when upstream flags are set', () => {
    const config = loadConfig({
      MINDWTR_WATCH_ENABLED: 'true', ANALYTICS_HEARTBEAT_URL: 'https://upstream.invalid/',
      DROPBOX_APP_KEY: 'upstream-key', FEEDBACK_ENDPOINT_URL: 'https://feedback.invalid/',
      DONATION_PROMPT_ENABLED: 'true',
    });
    expect(config.owner).toBeUndefined();
    expect(config.extra?.eas).toBeUndefined();
    expect(config.ios?.bundleIdentifier).toBeUndefined();
    expect(config.updates?.enabled).toBe(false);
    expect(config.extra).toMatchObject({ analyticsHeartbeatUrl: '', dropboxAppKey: '', feedbackEndpointUrl: '', watchEnabled: false, donationPromptEnabled: false });
    expect(config.plugins?.some((entry) => (Array.isArray(entry) ? entry[0] : entry)?.startsWith('./plugins/ios-'))).toBe(false);
    expect(config.plugins).toContainEqual(['expo-share-intent', expect.objectContaining({ disableIOS: true })]);
  });

  it('requires explicit Stable opt-in, a clean commit and an allocated versionCode', () => {
    const missingCode = runConfig({ APP_VARIANT: 'stable' }, cleanFixture);
    expect(missingCode.status).toBe(1);
    expect(missingCode.stderr).toContain('Stable requires an explicit MOE_VERSION_CODE');

    const config = loadConfig({ APP_VARIANT: 'stable', MOE_VERSION_CODE: '42', MOE_SOURCE_SHA: cleanSha, MOE_WEB_PREVIEW: '1' }, cleanFixture);
    expect(config.name).toBe('Todo Moe');
    expect(config.android?.package).toBe('io.github.xiaolexldw.todomoe');
    expect(config.scheme).toBe('todomoe');
    expect(config.android?.versionCode).toBe(42);
    expect(config.platforms).toEqual(['android']);
    expect(config.extra?.todoMoe).toMatchObject({ sourceSha: cleanSha, dirty: false, channel: 'stable', versionCode: 42 });
    expect(config.extra?.watchEnabled).toBe(false);
  });

  it('rejects a dirty Stable checkout without changing the user working tree', () => {
    const dirtyFile = join(cleanFixture, 'uncommitted.txt');
    writeFileSync(dirtyFile, 'fixture-only modification');
    try {
      const result = runConfig({ APP_VARIANT: 'stable', MOE_VERSION_CODE: '42' }, cleanFixture);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('clean Git commit');
    } finally {
      rmSync(dirtyFile);
    }
  });

  it.each(['benchmark', 'production', 'preview'])('rejects unsupported variant %s', (variant) => {
    const result = runConfig({ APP_VARIANT: variant });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('APP_VARIANT must be development or stable');
  });

  it.each(['0', '-1', '1.5', 'NaN', '2100000001'])('rejects invalid Android versionCode %s', (code) => {
    const result = runConfig({ MOE_VERSION_CODE: code });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MOE_VERSION_CODE must be an integer');
  });

  it('rejects forged source metadata instead of reporting an unbuilt SHA', () => {
    const result = runConfig({ MOE_SOURCE_SHA: '0'.repeat(40) });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MOE_SOURCE_SHA differs from checked-out HEAD');
  });

  it('retains the Android delivery boundary when unrelated preview flags are set', () => {
    const config = loadConfig({ MOE_WEB_PREVIEW: '1' });
    expect(config.platforms).toEqual(['android']);
    expect(config.android?.package).toBe('io.github.xiaolexldw.todomoe.dev');
  });
});
