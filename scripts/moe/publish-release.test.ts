import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { parsePublishArgs, publishRelease } from './publish-release.mjs';

const root = resolve(import.meta.dir, '../../build/moe/publish-fixtures');
const created: string[] = [];
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const sha = 'a'.repeat(40);
const packageName = 'io.github.xiaolexldw.todomoe';
const notesRecord = '# Stable acceptance record\n\nDevice acceptance stays explicit.\n';
function fixture(payload = 'signed APK fixture', code = 1) {
    mkdirSync(root, { recursive: true });
    const directory = mkdtempSync(join(root, 'release-')); created.push(directory);
    const signed = join(directory, 'signed'); mkdirSync(signed);
    const filename = `todo-moe-0.1.0-stable-vc${code}.apk`;
    const notes = `# Todo Moe 0.1.0\n\nSource ${sha}\nAPK SHA-256 ${digest(payload)}\n`;
    const manifest = {
        sourceSha: sha, dirty: false, channel: 'stable', androidPackage: packageName,
        version: '0.1.0', versionCode: code, certificateSha256: 'c'.repeat(64), unsignedSha256: 'd'.repeat(64),
        artifacts: [{ file: filename, bytes: Buffer.byteLength(payload), sha256: digest(payload) }],
        releaseNotes: { file: 'RELEASE-NOTES.md', sha256: digest(notes), versionRecord: 'docs/todo-moe/docs/versions/0.1.0-stable.md', versionRecordSha256: digest(notesRecord) },
    };
    writeFileSync(join(signed, filename), payload);
    writeFileSync(join(signed, 'RELEASE-NOTES.md'), notes);
    writeFileSync(join(signed, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(join(signed, 'SHA256SUMS'), `${digest(payload)}  ${filename}\n`);
    return {
        directory, signed, filename, manifest,
        options: { directory: signed, repoDirectory: directory, repository: 'XiaoLeXLDW/todo-moe', ref: 'refs/heads/main', approvedSha: sha, versionCode: code, tag: `moe-v0.1.0-vc${code}`, publish: false },
    };
}
afterEach(() => { for (const directory of created.splice(0)) { if (!directory.startsWith(root + sep)) throw new Error('Unexpected fixture cleanup target'); rmSync(directory, { recursive: true, force: true }); } });
const inspectSource = async () => ({ head: sha, reachable: true, version: '0.1.0', packageName, recordSha256: digest(notesRecord) });
const missing = () => Object.assign(new Error('Not found'), { httpStatus: 404 });

type Asset = { id: number; name: string; content: Buffer; state: string; wrongDigest?: boolean };
function remote(useDigest = false) {
    const state = {
        tagSha: null as string | null,
        release: null as { id: number; tag_name: string; name: string; body: string; draft: boolean; prerelease: boolean } | null,
        assets: [] as Asset[],
        olderReleases: [] as { tag_name: string; draft: boolean; prerelease: boolean }[],
        olderTags: [] as { name: string }[],
        writes: [] as { kind: string; name?: string }[],
        failUpload: null as string | null,
        failAfterUpload: false,
        failPublish: false,
        losePublishResponse: false,
        publishSuccessStillDraft: false,
        publishSuccessMissingAsset: false,
        corruptLastUpload: false,
        failReads: false,
        publishDuringFinalListing: false,
        downloads: 0,
    };
    const publicAsset = (asset: Asset) => ({ id: asset.id, name: asset.name, state: asset.state, size: asset.content.length,
        ...(useDigest || asset.wrongDigest ? { digest: `sha256:${asset.wrongDigest ? '0'.repeat(64) : digest(asset.content)}` } : {}) });
    const gh = async (args: string[], options: { cwd: string; input?: string; binary?: boolean }) => {
        expect(args.every((arg) => typeof arg === 'string')).toBe(true);
        expect(args).not.toContain('--clobber');
        if (args[0] === 'api') {
            const method = args[2];
            const endpoint = args[3].replace('repos/XiaoLeXLDW/todo-moe/', '');
            if (method === 'GET' && state.failReads) throw new Error('network unavailable');
            if (endpoint.startsWith('git/ref/tags/')) {
                if (!state.tagSha) throw missing();
                return JSON.stringify({ object: { type: 'commit', sha: state.tagSha } });
            }
            if (endpoint.startsWith('releases/tags/')) {
                if (!state.release) throw missing();
                return JSON.stringify(state.release);
            }
            if (endpoint.startsWith('releases/assets/')) {
                const asset = state.assets.find((item) => item.id === Number(endpoint.split('/').at(-1)));
                if (!asset) throw missing();
                state.downloads++;
                expect(options.binary).toBe(true);
                return Buffer.from(asset.content);
            }
            if (/^releases\/\d+\/assets\?/.test(endpoint)) return JSON.stringify(state.assets.map(publicAsset));
            if (endpoint.startsWith('releases?')) {
                if (state.publishDuringFinalListing && state.release && state.assets.length === 4) state.release.draft = false;
                return JSON.stringify([...state.olderReleases, ...(state.release ? [state.release] : [])]);
            }
            if (endpoint.startsWith('tags?')) return JSON.stringify([...state.olderTags, ...(state.tagSha && state.release ? [{ name: state.release.tag_name }] : [])]);
            if (method === 'POST' && endpoint === 'git/refs') {
                if (state.tagSha) throw Object.assign(new Error('Reference exists'), { httpStatus: 422 });
                const body = JSON.parse(options.input!);
                expect(body.ref.startsWith('refs/tags/moe-v')).toBe(true);
                state.tagSha = body.sha; state.writes.push({ kind: 'tag' });
                return JSON.stringify({ object: { type: 'commit', sha: body.sha } });
            }
        }
        if (args[0] === 'release' && args[1] === 'create') {
            if (state.release) throw new Error('Release exists');
            expect(args).toContain('--verify-tag'); expect(args).toContain('--draft');
            const notesPath = args[args.indexOf('--notes-file') + 1];
            expect(basename(notesPath)).toBe('RELEASE-NOTES.md');
            state.release = { id: 11, tag_name: args[2], name: args[args.indexOf('--title') + 1], body: readFileSync(notesPath, 'utf8'), draft: true, prerelease: false };
            state.writes.push({ kind: 'draft' }); return '';
        }
        if (args[0] === 'release' && args[1] === 'upload') {
            expect(state.release?.draft).toBe(true);
            const name = args[3];
            if (state.assets.some((asset) => asset.name === name)) throw new Error('Duplicate asset upload');
            if (state.failUpload === name && !state.failAfterUpload) throw new Error('simulated upload failure');
            const content = readFileSync(join(options.cwd, name));
            const asset: Asset = { id: state.assets.length + 101, name, content, state: 'uploaded' };
            if (state.corruptLastUpload && name.endsWith('.apk')) asset.content = Buffer.from(content.map((byte) => byte ^ 1));
            state.assets.push(asset); state.writes.push({ kind: 'upload', name });
            if (state.failUpload === name) throw new Error('upload committed but response lost');
            return '';
        }
        if (args[0] === 'release' && args[1] === 'edit') {
            expect(state.assets).toHaveLength(4);
            expect(args).toContain('--draft=false');
            if (state.failPublish) throw new Error('publication refused before commit');
            if (state.publishSuccessStillDraft) return '';
            state.release!.draft = false; state.writes.push({ kind: 'publish' });
            if (state.publishSuccessMissingAsset) state.assets.pop();
            if (state.losePublishResponse) throw new Error('publication committed but response lost');
            return '';
        }
        throw new Error(`Unexpected mock gh call: ${JSON.stringify(args)}`);
    };
    return { state, dependencies: { gh, inspectSource } };
}

test('uploads four verified assets as draft and publishes only after the final remote gate', async () => {
    const f = fixture(); const server = remote();
    const result = await publishRelease({ ...f.options, publish: true }, server.dependencies);
    expect(result.status).toBe('published'); expect(server.state.release!.draft).toBe(false);
    expect(server.state.writes.at(-1)?.kind).toBe('publish');
    expect(server.state.assets.map((asset) => asset.name).sort()).toEqual([f.filename, 'release-manifest.json', 'SHA256SUMS', 'RELEASE-NOTES.md'].sort());
    expect(server.state.downloads).toBeGreaterThan(0);
    expect(digest(readFileSync(join(f.signed, 'RELEASE-NOTES.md')))).toBe(f.manifest.releaseNotes.sha256);
});

test('an interrupted upload retains its exact draft and same-artifact retry only fills missing assets', async () => {
    const f = fixture(); const server = remote(); server.state.failUpload = 'SHA256SUMS';
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow('upload failure');
    expect(server.state.release!.draft).toBe(true); expect(server.state.assets).toHaveLength(2);
    server.state.failUpload = null;
    expect((await publishRelease({ ...f.options, publish: true }, server.dependencies)).status).toBe('published');
    expect(server.state.writes.filter((write) => write.kind === 'tag')).toHaveLength(1);
    expect(server.state.writes.filter((write) => write.kind === 'draft')).toHaveLength(1);
    expect(server.state.writes.filter((write) => write.kind === 'upload')).toHaveLength(4);
});

test('retry reconciles a fully uploaded asset whose upload response was lost without clobbering it', async () => {
    const f = fixture(); const server = remote(true); server.state.failUpload = f.filename; server.state.failAfterUpload = true;
    await expect(publishRelease(f.options, server.dependencies)).rejects.toThrow('response lost');
    expect(server.state.assets).toHaveLength(4); expect(server.state.release!.draft).toBe(true);
    server.state.failUpload = null;
    expect((await publishRelease(f.options, server.dependencies)).status).toBe('draft-ready');
    expect(server.state.writes.filter((write) => write.kind === 'upload')).toHaveLength(4);
    expect(server.state.downloads).toBe(0);
});

test('published duplicate is a verified read-only no-op; different same-version artifacts are rejected', async () => {
    const f = fixture(); const server = remote(true);
    await publishRelease({ ...f.options, publish: true }, server.dependencies);
    const writes = server.state.writes.length;
    expect((await publishRelease({ ...f.options, publish: true }, server.dependencies)).status).toBe('already-published');
    expect(server.state.writes.length).toBe(writes);
    const changed = fixture('another signed APK fixture');
    await expect(publishRelease(changed.options, server.dependencies)).rejects.toThrow('different immutable artifact');
    expect(server.state.writes.length).toBe(writes);
});

test.each(['bad-hash', 'extra-apk', 'duplicate', 'partial-upload'])('rejects conflicting remote asset state %s without mutation', async (kind) => {
    const f = fixture(); const server = remote(true); await publishRelease(f.options, server.dependencies);
    if (kind === 'bad-hash') server.state.assets[0].wrongDigest = true;
    if (kind === 'extra-apk') server.state.assets.push({ id: 888, name: 'unexpected.apk', content: Buffer.from('extra'), state: 'uploaded' });
    if (kind === 'duplicate') server.state.assets.push({ ...server.state.assets[0], id: 888 });
    if (kind === 'partial-upload') server.state.assets[0].state = 'starter';
    const writes = server.state.writes.length;
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow();
    expect(server.state.release!.draft).toBe(true); expect(server.state.writes.length).toBe(writes);
});

test('download verification rejects changed bytes when the server provides no digest', async () => {
    const f = fixture(); const server = remote(); await publishRelease(f.options, server.dependencies);
    server.state.assets[0].content[0] ^= 1;
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow('download hash mismatch');
    expect(server.state.release!.draft).toBe(true);
});

test('initial release refuses reused or lower versionCode, conflicting tags and unverifiable orphan tags', async () => {
    const f = fixture();
    for (const maximum of [1, 2]) {
        const server = remote(); server.state.olderTags.push({ name: `moe-v0.0.9-vc${maximum}` });
        await expect(publishRelease(f.options, server.dependencies)).rejects.toThrow('versionCode must exceed');
        expect(server.state.writes).toHaveLength(0);
    }
    const conflict = remote(); conflict.state.tagSha = 'b'.repeat(40);
    await expect(publishRelease(f.options, conflict.dependencies)).rejects.toThrow('tag conflicts');
    const orphan = remote(); orphan.state.tagSha = sha;
    await expect(publishRelease(f.options, orphan.dependencies)).rejects.toThrow('Orphan tag');
    expect(orphan.state.writes).toHaveLength(0);
});

test('a draft reservation also blocks first publication at the same versionCode', async () => {
    const f = fixture(); const server = remote();
    server.state.olderReleases.push({ tag_name: 'moe-v0.0.9-vc1', draft: true, prerelease: false });
    await expect(publishRelease(f.options, server.dependencies)).rejects.toThrow('versionCode must exceed');
    expect(server.state.writes).toHaveLength(0);
});

test('even an empty draft is bound to the original complete artifact set', async () => {
    const f = fixture(); const server = remote(); server.state.failUpload = 'release-manifest.json';
    await expect(publishRelease(f.options, server.dependencies)).rejects.toThrow('upload failure');
    expect(server.state.assets).toHaveLength(0);
    const different = fixture('changed build');
    await expect(publishRelease(different.options, server.dependencies)).rejects.toThrow('different immutable artifact');
    expect(server.state.release!.draft).toBe(true);
});

test('corruption found after the final upload prevents publication', async () => {
    const f = fixture(); const server = remote(); server.state.corruptLastUpload = true;
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow('hash mismatch');
    expect(server.state.assets).toHaveLength(4); expect(server.state.release!.draft).toBe(true);
    expect(server.state.writes.some((write) => write.kind === 'publish')).toBe(false);
});

test('publication error leaves draft; a lost response after successful publish is safely reconciled', async () => {
    const f = fixture(); const server = remote(true); server.state.failPublish = true;
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow('publication refused');
    expect(server.state.release!.draft).toBe(true);
    server.state.failPublish = false; server.state.losePublishResponse = true;
    expect((await publishRelease({ ...f.options, publish: true }, server.dependencies)).status).toBe('published');
    expect(server.state.release!.draft).toBe(false);
});

test.each(['still-draft', 'missing-asset'])('successful publish response is rejected when readback shows %s', async (kind) => {
    const f = fixture(); const server = remote(true);
    server.state.publishSuccessStillDraft = kind === 'still-draft';
    server.state.publishSuccessMissingAsset = kind === 'missing-asset';
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow(kind === 'still-draft' ? 'still draft' : 'incomplete');
    expect(server.state.release!.draft).toBe(kind === 'still-draft');
});

test.each([
    'docs/another-record.md',
    'docs/todo-moe/docs/versions/../outside.md',
    'docs/todo-moe/docs/versions/bad\tname.md',
    'docs/todo-moe/docs/versions/bad\u0001name.md',
    'docs/todo-moe/docs/versions/bad\u007fname.md',
    'docs/todo-moe/docs/versions/bad?name.md',
])('version record path %j is rejected before source or GitHub access', async (versionRecord) => {
    const f = fixture(); const server = remote(); let inspected = false;
    f.manifest.releaseNotes.versionRecord = versionRecord;
    writeFileSync(join(f.signed, 'release-manifest.json'), JSON.stringify(f.manifest));
    await expect(publishRelease(f.options, { ...server.dependencies, inspectSource: async () => { inspected = true; return inspectSource(); } })).rejects.toThrow('version record');
    expect(inspected).toBe(false); expect(server.state.writes).toHaveLength(0);
});

test('a newer published version prevents an older recovered draft from becoming latest', async () => {
    const f = fixture(); const server = remote(true); await publishRelease(f.options, server.dependencies);
    server.state.olderReleases.push({ tag_name: 'moe-v0.2.0-vc2', draft: false, prerelease: false });
    await expect(publishRelease({ ...f.options, publish: true }, server.dependencies)).rejects.toThrow('newer/equal versionCode');
    expect(server.state.release!.draft).toBe(true);
});

test('a final read observing publication never edits already-published contents', async () => {
    const f = fixture(); const server = remote(true);
    await publishRelease(f.options, server.dependencies);
    const writes = server.state.writes.length;
    server.state.publishDuringFinalListing = true;
    expect((await publishRelease({ ...f.options, publish: true }, server.dependencies)).status).toBe('already-published');
    expect(server.state.writes.length).toBe(writes);
});

test.each(['notes', 'manifest', 'apk', 'sums', 'source', 'record', 'ref', 'repository'])('local %s validation fails before any network write', async (kind) => {
    const f = fixture(); const server = remote(); let dependencies = server.dependencies; let options = f.options;
    if (kind === 'notes') writeFileSync(join(f.signed, 'RELEASE-NOTES.md'), 'tampered');
    if (kind === 'manifest') { delete (f.manifest as any).releaseNotes; writeFileSync(join(f.signed, 'release-manifest.json'), JSON.stringify(f.manifest)); }
    if (kind === 'apk') writeFileSync(join(f.signed, f.filename), 'bad');
    if (kind === 'sums') writeFileSync(join(f.signed, 'SHA256SUMS'), 'wrong');
    if (kind === 'source') dependencies = { ...dependencies, inspectSource: async () => ({ ...(await inspectSource()), reachable: false }) };
    if (kind === 'record') dependencies = { ...dependencies, inspectSource: async () => ({ ...(await inspectSource()), recordSha256: '0'.repeat(64) }) };
    if (kind === 'ref') options = { ...options, ref: 'refs/pull/1/merge' };
    if (kind === 'repository') options = { ...options, repository: 'other/fork' };
    await expect(publishRelease(options, dependencies)).rejects.toThrow(); expect(server.state.writes).toHaveLength(0);
});

test('a read failure is never interpreted as a missing tag or release', async () => {
    const f = fixture(); const server = remote(); server.state.failReads = true;
    await expect(publishRelease(f.options, server.dependencies)).rejects.toThrow('network unavailable');
    expect(server.state.writes).toHaveLength(0);
});

test('fresh preview reports four fingerprints and the creation plan with zero GitHub writes', async () => {
    const f = fixture(); const server = remote(true);
    const plan = await publishRelease({ ...f.options, tag: undefined, preview: true, signedRunId: '123' }, server.dependencies);
    expect(plan).toMatchObject({ preview: true, changed: false, mode: 'create-draft', tag: f.options.tag, publish: false, willPublish: false, signedRunId: '123' });
    expect(plan.assets).toHaveLength(4); expect(plan.missing).toHaveLength(4);
    for (const asset of plan.assets) expect(asset.sha256).toBe(digest(readFileSync(join(f.signed, asset.name))));
    expect(server.state.writes).toHaveLength(0); expect(server.state.tagSha).toBeNull();
});

test('CLI preserves the reviewed signed directory with preview and review-plan switches', () => {
    expect(parsePublishArgs(['../review/signed', '--preview'])).toEqual({ directory: '../review/signed', preview: true, reviewFile: undefined });
    expect(parsePublishArgs(['../reviewed/signed', '--review-plan', '../reviewed/review-plan.json'])).toEqual({ directory: '../reviewed/signed', preview: false, reviewFile: '../reviewed/review-plan.json' });
    expect(parsePublishArgs(['--preview'])).toEqual({ directory: 'signed', preview: true, reviewFile: undefined });
    expect(() => parsePublishArgs(['signed', '--review-plan'])).toThrow('requires a JSON file');
    expect(() => parsePublishArgs(['signed', '--preview=false'])).toThrow('Usage:');
});

test('fresh preview retains version reservation policy without mutations', async () => {
    const f = fixture(); const server = remote(); server.state.olderTags.push({ name: 'moe-v0.1.0-vc1' });
    await expect(publishRelease({ ...f.options, preview: true }, server.dependencies)).rejects.toThrow('versionCode must exceed');
    expect(server.state.writes).toHaveLength(0);
});

test('default draft from an earlier run can be reviewed and later published from identical signed artifacts', async () => {
    const f = fixture(); const server = remote(true);
    expect((await publishRelease(f.options, server.dependencies)).status).toBe('draft-ready');
    const writes = server.state.writes.length;
    const nextRun = { ...f.options, publish: true, signedRunId: '123' };
    const plan = await publishRelease({ ...nextRun, preview: true }, server.dependencies);
    expect(plan).toMatchObject({ mode: 'resume-draft', missing: [], willPublish: true, publish: true });
    expect(server.state.writes).toHaveLength(writes);
    expect((await publishRelease({ ...nextRun, reviewPlan: plan }, server.dependencies)).status).toBe('published');
    expect(server.state.writes.slice(writes)).toEqual([{ kind: 'publish' }]);
});

test('partial draft preview reports missing assets without uploading; published preview is read-only', async () => {
    const f = fixture(); const server = remote(true); server.state.failUpload = 'SHA256SUMS';
    await expect(publishRelease(f.options, server.dependencies)).rejects.toThrow();
    const writes = server.state.writes.length;
    const partial = await publishRelease({ ...f.options, preview: true, publish: true }, server.dependencies);
    expect(partial.missing).toEqual(['SHA256SUMS', f.filename]); expect(server.state.writes).toHaveLength(writes);
    server.state.failUpload = null;
    await publishRelease({ ...f.options, publish: true }, server.dependencies);
    const publishedWrites = server.state.writes.length;
    expect((await publishRelease({ ...f.options, preview: true, publish: true }, server.dependencies)).mode).toBe('already-published');
    expect(server.state.writes).toHaveLength(publishedWrites);
});

test.each(['body', 'asset', 'orphan', 'newer'])('preview rejects conflicting remote %s without writes', async (kind) => {
    const f = fixture(); const server = remote(true); await publishRelease(f.options, server.dependencies);
    if (kind === 'body') server.state.release!.body += 'tampered';
    if (kind === 'asset') server.state.assets[0].wrongDigest = true;
    if (kind === 'orphan') server.state.release = null;
    if (kind === 'newer') server.state.olderReleases.push({ tag_name: 'moe-v0.2.0-vc2', draft: false, prerelease: false });
    const writes = server.state.writes.length;
    await expect(publishRelease({ ...f.options, preview: true, publish: true }, server.dependencies)).rejects.toThrow();
    expect(server.state.writes).toHaveLength(writes);
});

test.each(['run', 'sha', 'code', 'publish', 'artifact', 'null-plan'])('reviewed plan cannot be reused with different %s inputs or artifacts', async (kind) => {
    const f = fixture(); const server = remote(true);
    const original = { ...f.options, publish: true, signedRunId: '123' };
    const plan = await publishRelease({ ...original, preview: true }, server.dependencies);
    let changed = { ...original, reviewPlan: plan };
    if (kind === 'run') changed.signedRunId = '124';
    if (kind === 'sha') changed.approvedSha = 'e'.repeat(40);
    if (kind === 'code') changed.versionCode = 2;
    if (kind === 'publish') changed.publish = false;
    if (kind === 'artifact') changed.directory = fixture('different signed APK').signed;
    if (kind === 'null-plan') changed.reviewPlan = null;
    await expect(publishRelease(changed, server.dependencies)).rejects.toThrow();
    expect(server.state.writes).toHaveLength(0);
});
