const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeExpoEntryArgs } = require('../../apps/mobile/moe/brand/expo-cli.cjs');

test('Windows relative Gradle entry resolves inside mobile instead of the repository root', () => {
    const args = ['node', 'expo', 'export:embed', '--entry-file', 'index.js', '--bundle-output', 'android/app/build/index.android.bundle'];
    const actual = normalizeExpoEntryArgs(args, 'F:\\project with spaces\\apps\\mobile', 'win32');
    assert.equal(actual[4], 'F:/project with spaces/apps/mobile/index.js');
    assert.equal(actual[6], args[6]);
    assert.equal(args[4], 'index.js');
});
test('absolute entries are preserved and non-Windows CLI arguments are unchanged', () => {
    assert.equal(normalizeExpoEntryArgs(['--entry-file', 'F:\\app\\index.js'], 'F:\\other', 'win32')[1], 'F:/app/index.js');
    assert.deepEqual(normalizeExpoEntryArgs(['--entry-file', '/app/index.js'], '/other', 'linux'), ['--entry-file', '/app/index.js']);
    assert.deepEqual(normalizeExpoEntryArgs(['config', '--json'], 'F:\\app', 'win32'), ['config', '--json']);
});
