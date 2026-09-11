// Release prose is data from the approved source tree, never executable input.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const releaseNotesFile = 'release-notes-input.json';
const maximumBytes = 256 * 1024;
export const notesDigest = (contents) => createHash('sha256').update(contents).digest('hex');
function requiredText(value, field, maximum = 2000) {
    if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u0008\u000b-\u001f]/u.test(value)) throw new Error(`Invalid release notes ${field}.`);
    return value.trim();
}
function lines(value, field, allowEmpty = false) {
    if (!Array.isArray(value) || (!allowEmpty && !value.length) || value.length > 20) throw new Error(`Release notes must list ${field}.`);
    return value.map((line, index) => requiredText(line, `${field}[${index}]`));
}
function recordPath(value) {
    const path = requiredText(value, 'versionRecord', 240);
    if (!path.startsWith('docs/todo-moe/docs/versions/') || !path.endsWith('.md') || /[\\:#?<>"|\u0000-\u001f\u007f]/u.test(path) || path.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Invalid release version-record path.');
    return path;
}
export function validateReleaseNotes(input, version, includeRecord = false) {
    if (!/^\d+\.\d+\.\d+$/u.test(version) || !input || input.schemaVersion !== 1 || input.version !== version) throw new Error('Release notes must match the stable version and schema.');
    const notes = { schemaVersion: 1, version, changes: lines(input.changes, 'changes'),
        knownIssues: lines(input.knownIssues, 'knownIssues', true),
        supportedDevices: lines(input.supportedDevices, 'supportedDevices'),
        validation: lines(input.validation, 'validation'), versionRecord: recordPath(input.versionRecord) };
    if (includeRecord) {
        const content = input.versionRecordContent;
        requiredText(content, 'versionRecordContent', 128 * 1024);
        if (!/^[a-f0-9]{64}$/u.test(input.versionRecordSha256) || notesDigest(content) !== input.versionRecordSha256) throw new Error('Release version-record content hash mismatch.');
        notes.versionRecordContent = content;
        notes.versionRecordSha256 = input.versionRecordSha256;
    }
    return notes;
}
function readBounded(path) {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size > maximumBytes) throw new Error('Release notes input must be a bounded regular file.');
    return readFileSync(path);
}
function committedFile(root, sourceSha, path) {
    // Read Git objects rather than a symlink, ignored file or generated copy.
    const options = { cwd: root, maxBuffer: maximumBytes + 1024, stdio: ['ignore', 'pipe', 'pipe'] };
    let entry, bytes;
    try {
        entry = execFileSync('git', ['ls-tree', '-z', sourceSha, '--', path], options).toString('utf8');
        if (!/^100(?:644|755) blob [a-f0-9]{40}\t/u.test(entry) || entry.slice(entry.indexOf('\t') + 1) !== `${path}\0`) throw new Error('Not a regular committed file');
        bytes = execFileSync('git', ['cat-file', 'blob', `${sourceSha}:${path}`], options);
    } catch { throw new Error(`Release notes require a regular file in the approved commit: ${path}`); }
    if (bytes.length > maximumBytes) throw new Error('Committed release notes input is too large.');
    return bytes.toString('utf8');
}
export function readSourceReleaseNotes(root, version, sourceSha) {
    if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error('Invalid stable release version.');
    if (!/^[a-f0-9]{40}$/u.test(sourceSha)) throw new Error('Release notes require an immutable source SHA.');
    const source = `docs/todo-moe/release-notes/${version}.json`;
    const notes = validateReleaseNotes(JSON.parse(committedFile(root, sourceSha, source)), version);
    const versionRecordContent = committedFile(root, sourceSha, notes.versionRecord);
    return validateReleaseNotes({ ...notes, versionRecordContent, versionRecordSha256: notesDigest(versionRecordContent) }, version, true);
}
export function writeReleaseNotesInput(directory, notes) {
    const validated = validateReleaseNotes(notes, notes.version, true);
    const contents = JSON.stringify(validated, null, 2) + '\n';
    if (Buffer.byteLength(contents) > maximumBytes) throw new Error('Release notes input is too large.');
    writeFileSync(join(directory, releaseNotesFile), contents);
    return { file: releaseNotesFile, sha256: notesDigest(contents) };
}
export function readArtifactReleaseNotes(directory, manifest) {
    const descriptor = manifest.releaseNotes;
    if (descriptor?.file !== releaseNotesFile || !/^[a-f0-9]{64}$/u.test(descriptor.sha256)) throw new Error('Unsigned artifact is missing its release notes identity.');
    const bytes = readBounded(join(directory, releaseNotesFile));
    if (notesDigest(bytes) !== descriptor.sha256) throw new Error('Unsigned release notes hash mismatch.');
    return validateReleaseNotes(JSON.parse(bytes.toString('utf8')), manifest.version, true);
}
export function renderReleaseNotes(input, manifest, artifact, certificateSha256) {
    const notes = validateReleaseNotes(input, manifest.version, true);
    if (!Number.isSafeInteger(manifest.versionCode) || manifest.versionCode < 1 || manifest.versionCode > 2100000000) throw new Error('Release notes require a valid versionCode.');
    for (const hash of [manifest.sourceSha, manifest.upstreamSha]) if (!/^[a-f0-9]{40}$/u.test(hash)) throw new Error('Release notes require immutable source commits.');
    for (const hash of [artifact.sha256, certificateSha256]) if (!/^[a-f0-9]{64}$/u.test(hash)) throw new Error('Release notes require artifact and certificate fingerprints.');
    const source = `https://github.com/XiaoLeXLDW/todo-moe/blob/${manifest.sourceSha}`;
    const link = `${source}/${notes.versionRecord.split('/').map(encodeURIComponent).join('/')}`;
    const list = (items) => items.map((item) => `- ${item}`).join('\n');
    return `# Todo Moe ${manifest.version} (Stable)\n\n` +
        `## 实际变更\n\n${list(notes.changes)}\n\n` +
        `## 已知问题与限制\n\n${notes.knownIssues.length ? list(notes.knownIssues) : '本记录未列出已知问题。'}\n\n` +
        `## 设备支持与验收范围\n\n${list(notes.supportedDevices)}\n\n` +
        `## 验证记录\n\n${list(notes.validation)}\n\n[对应版本记录](${link})\n\n` +
        `## 产物身份\n\n- 渠道：Stable\n- versionCode：${manifest.versionCode}\n- APK：${artifact.file}\n- APK SHA-256：${artifact.sha256}\n- 签名证书 SHA-256：${certificateSha256}\n- 源码：https://github.com/XiaoLeXLDW/todo-moe/commit/${manifest.sourceSha}\n- 上游：https://github.com/dongdongbh/Mindwtr/commit/${manifest.upstreamSha}\n\n` +
        `AGPL-3.0-only；上游和第三方许可随对应源码保留。[构建说明](${source}/docs/todo-moe/ANDROID-DELIVERY.md)。\n\n` +
        `<details>\n<summary>该源码中的完整版本记录</summary>\n\n${notes.versionRecordContent}\n\n</details>\n`;
}
