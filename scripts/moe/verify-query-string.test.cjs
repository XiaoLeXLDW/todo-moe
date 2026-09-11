const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dirname, join } = require('node:path');
const { readFileSync } = require('node:fs');
const { patchAllQueryStringConsumers, hasCompatibleImport } = require('../../apps/mobile/scripts/patch_query_string_cjs.js');

test('all actual mobile/router/navigation consumers decode encoded Chinese and remain idempotent', () => {
    const directories = patchAllQueryStringConsumers();
    assert.ok(directories.length >= 3);
    const before = directories.map((directory) => {
        const entry = require.resolve('query-string', { paths: [directory] });
        const source = readFileSync(entry, 'utf8');
        assert.ok(hasCompatibleImport(source), entry);
        const decoder = require.resolve('decode-uri-component', { paths: [dirname(entry)] });
        assert.equal(JSON.parse(readFileSync(join(dirname(decoder), 'package.json'), 'utf8')).version, '0.5.0');
        assert.deepEqual({ ...require(entry).parse('title=%E6%94%B6%E4%BB%B6%E7%AE%B1&space=a%20b&plus=a%2Bb') }, { title: '收件箱', space: 'a b', plus: 'a+b' });
        return source;
    });
    patchAllQueryStringConsumers();
    directories.forEach((directory, index) => assert.equal(readFileSync(require.resolve('query-string', { paths: [directory] }), 'utf8'), before[index]));
});
