import { afterEach, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { notesDigest, readArtifactReleaseNotes, readSourceReleaseNotes, renderReleaseNotes, validateReleaseNotes, writeReleaseNotesInput } from './release-notes.mjs';

const base = resolve(import.meta.dir, '../../build/moe/release-notes-fixtures');
const created: string[] = [];
const path = 'docs/todo-moe/docs/versions/0.1.0-record.md';
const sourceNotes = () => ({ schemaVersion: 1, version: '0.1.0', changes: ['Added the daily task interface.'], knownIssues: ['Device acceptance pending.'], supportedDevices: ['Android arm64; one device tested.'], validation: ['Recorded checks are scoped to the candidate.'], versionRecord: path });
const record = '# 0.1.0 candidate\n\nHardware acceptance is pending.\n';
const withRecord = () => ({ ...sourceNotes(), versionRecordContent: record, versionRecordSha256: notesDigest(record) });
const git = (root: string, args: string[], input?: string) => execFileSync('git', args, { cwd: root, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
function fixture() {
    mkdirSync(base, { recursive: true });
    const root = mkdtempSync(join(base, 'notes-')); created.push(root);
    mkdirSync(join(root, 'docs/todo-moe/release-notes'), { recursive: true });
    mkdirSync(join(root, 'docs/todo-moe/docs/versions'), { recursive: true });
    writeFileSync(join(root, 'docs/todo-moe/release-notes/0.1.0.json'), JSON.stringify(sourceNotes()));
    writeFileSync(join(root, path), record);
    git(root, ['init', '--quiet']);
    return root;
}
function commit(root: string, files: string[]) {
    git(root, ['add', '--', ...files]);
    git(root, ['-c', 'user.name=Notes fixture', '-c', 'user.email=fixture@localhost', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'fixture']);
    return git(root, ['rev-parse', 'HEAD']);
}
afterEach(() => {
    for (const root of created.splice(0)) {
        const target = realpathSync(root);
        if (!target.startsWith(realpathSync(base) + sep)) throw new Error('Unsafe notes fixture cleanup');
        rmSync(target, { recursive: true, force: true });
    }
});

test('reads both notes and acceptance record from the approved Git tree, not changed working files', () => {
    const root = fixture();
    const sha = commit(root, ['docs']);
    writeFileSync(join(root, path), 'Unapproved local record');
    writeFileSync(join(root, 'docs/todo-moe/release-notes/0.1.0.json'), JSON.stringify({ ...sourceNotes(), changes: ['Unapproved change'] }));
    const notes = readSourceReleaseNotes(root, '0.1.0', sha);
    expect(notes.changes).toEqual(sourceNotes().changes);
    expect(notes.versionRecordContent).toBe(record);
    expect(notes.versionRecordSha256).toBe(notesDigest(record));
});

test('rejects an untracked or symlink version record instead of following it', () => {
    const root = fixture();
    const missing = commit(root, ['docs/todo-moe/release-notes/0.1.0.json']);
    expect(() => readSourceReleaseNotes(root, '0.1.0', missing)).toThrow('regular file');
    const hash = git(root, ['hash-object', '-w', '--stdin'], '../../../../private.txt\n');
    git(root, ['update-index', '--add', '--cacheinfo', `120000,${hash},${path}`]);
    git(root, ['-c', 'user.name=Notes fixture', '-c', 'user.email=fixture@localhost', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'symlink fixture']);
    expect(() => readSourceReleaseNotes(root, '0.1.0', git(root, ['rev-parse', 'HEAD']))).toThrow('regular file');
});

test('requires actual changes, support and validation and an explicit known-issues list', () => {
    for (const field of ['changes', 'supportedDevices', 'validation']) expect(() => validateReleaseNotes({ ...sourceNotes(), [field]: [] }, '0.1.0')).toThrow(field);
    expect(() => validateReleaseNotes({ ...sourceNotes(), knownIssues: undefined }, '0.1.0')).toThrow('knownIssues');
    expect(validateReleaseNotes({ ...sourceNotes(), knownIssues: [] }, '0.1.0').knownIssues).toEqual([]);
    expect(() => validateReleaseNotes(sourceNotes(), '0.2.0')).toThrow('version');
    for (const versionRecord of ['../secret.md', 'docs/todo-moe/docs/versions/../secret.md', 'docs/todo-moe/docs/versions/a\nb.md']) expect(() => validateReleaseNotes({ ...sourceNotes(), versionRecord }, '0.1.0')).toThrow('path');
});

test('binds the artifact input and the included version-record content separately', () => {
    const root = fixture();
    const identity = writeReleaseNotesInput(root, withRecord());
    const manifest = { version: '0.1.0', releaseNotes: identity };
    expect(readArtifactReleaseNotes(root, manifest)).toEqual(withRecord());
    const tampered = JSON.stringify({ ...withRecord(), changes: ['tampered'] });
    writeFileSync(join(root, identity.file), tampered);
    expect(() => readArtifactReleaseNotes(root, manifest)).toThrow('notes hash');
    const wrongRecord = JSON.stringify({ ...withRecord(), versionRecordContent: 'tampered record' });
    writeFileSync(join(root, identity.file), wrongRecord);
    expect(() => readArtifactReleaseNotes(root, { ...manifest, releaseNotes: { ...identity, sha256: notesDigest(wrongRecord) } })).toThrow('record content hash');
    expect(() => readArtifactReleaseNotes(root, { version: '0.1.0' })).toThrow('missing');
});

test('rejects oversized untrusted inputs before parsing', () => {
    const root = fixture(); const bytes = Buffer.alloc(256 * 1024 + 1, 32);
    writeFileSync(join(root, 'release-notes-input.json'), bytes);
    expect(() => readArtifactReleaseNotes(root, { version: '0.1.0', releaseNotes: { file: 'release-notes-input.json', sha256: notesDigest(bytes) } })).toThrow('bounded');
});

test('renders changes, limitations, devices, validation and exact artifact/source identity', () => {
    const manifest = { version: '0.1.0', versionCode: 1, sourceSha: 'a'.repeat(40), upstreamSha: 'b'.repeat(40) };
    const artifact = { file: 'todo-moe-0.1.0-stable-vc1.apk', sha256: 'c'.repeat(64) };
    const body = renderReleaseNotes(withRecord(), manifest, artifact, 'd'.repeat(64));
    for (const value of [sourceNotes().changes[0], sourceNotes().knownIssues[0], sourceNotes().supportedDevices[0], sourceNotes().validation[0], record, artifact.sha256, manifest.sourceSha]) expect(body).toContain(value);
    expect(body).toContain(`/blob/${manifest.sourceSha}/${path}`);
    expect(body).toContain('AGPL-3.0-only');
    expect(() => renderReleaseNotes(withRecord(), { ...manifest, sourceSha: 'main' }, artifact, 'd'.repeat(64))).toThrow('immutable');
});

test('the version-controlled 0.1.0 notes report outstanding acceptance honestly', () => {
    const source = JSON.parse(readFileSync(resolve(import.meta.dir, '../../docs/todo-moe/release-notes/0.1.0.json'), 'utf8'));
    const notes = validateReleaseNotes(source, '0.1.0');
    expect(notes.knownIssues.join('\n')).toContain('尚未');
    expect(notes.supportedDevices.join('\n')).toContain('Dev');
});
