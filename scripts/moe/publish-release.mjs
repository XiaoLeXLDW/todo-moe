#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseTag, validateReleaseRequest } from './release-policy.mjs';

const REPOSITORY = 'XiaoLeXLDW/todo-moe';
const PACKAGE = 'io.github.xiaolexldw.todomoe';
const INTENT_MARKER = '<!-- todo-moe-publish-intent:v1:';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const validHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const normalizeBody = (value) => String(value ?? '').replaceAll('\r\n', '\n').replace(/\n+$/, '');

/** No shell: tokens are argument-array entries; API bodies go through stdin. */
export async function runGh(args, options = {}) {
    try {
        return execFileSync('gh', args, {
            cwd: options.cwd,
            input: options.input,
            encoding: options.binary ? undefined : 'utf8',
            maxBuffer: options.maxBuffer ?? 256 * 1024 * 1024,
            timeout: 180_000,
            env: { ...process.env, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1', GH_DEBUG: '' },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch (original) {
        const message = original.stderr?.toString() || original.message;
        const error = new Error(`GitHub operation failed: ${message}`);
        error.httpStatus = Number(message.match(/\(HTTP (\d{3})\)/)?.[1]) || undefined;
        throw error;
    }
}

export async function inspectApprovedSource(repoDirectory, sha, versionRecord) {
    const git = (...args) => execFileSync('git', args, { cwd: repoDirectory, encoding: 'utf8' });
    const head = git('rev-parse', 'HEAD').trim();
    git('merge-base', '--is-ancestor', sha, 'origin/main');
    git('diff', '--quiet');
    git('diff', '--cached', '--quiet');
    const brand = JSON.parse(git('show', `${sha}:apps/mobile/moe/brand/config.json`));
    const recordTree = git('ls-tree', '-z', sha, '--', versionRecord);
    if (!/^100(?:644|755) blob [a-f0-9]{40}\t[^\0]+\0$/.test(recordTree)) throw new Error('Version record must be an ordinary blob at the approved SHA.');
    const record = execFileSync('git', ['show', `${sha}:${versionRecord}`], { cwd: repoDirectory });
    const license = execFileSync('git', ['show', `${sha}:LICENSE`], { cwd: repoDirectory });
    return { head, reachable: true, version: brand.version, packageName: brand.androidPackage, recordSha256: hash(record), licenseSha256: hash(license), licenseBytes: license.length };
}

function loadSignedFiles(options) {
    const { approvedSha, versionCode, repository, ref, tag } = options;
    if (repository !== REPOSITORY || ref !== 'refs/heads/main' || !/^[a-f0-9]{40}$/.test(approvedSha ?? '')) throw new Error('Publication requires the fork main workflow and a full approved SHA.');
    if (typeof options.publish !== 'boolean') throw new Error('Publish must be an explicit boolean.');
    if (options.preview !== undefined && typeof options.preview !== 'boolean') throw new Error('Preview must be boolean.');
    if (options.signedRunId !== undefined && !/^[1-9]\d*$/.test(String(options.signedRunId))) throw new Error('Invalid signed run ID.');
    const directory = realpathSync(options.directory);
    function read(name) {
        const path = join(directory, name);
        if (basename(name) !== name || /[\\/:\0]/.test(name) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error('Expected a regular signed artifact file.');
        return { name, path, bytes: readFileSync(path) };
    }
    const manifestFile = read('release-manifest.json');
    const manifest = JSON.parse(manifestFile.bytes.toString('utf8'));
    if (manifest.sourceSha !== approvedSha || manifest.dirty !== false || manifest.channel !== 'stable' || manifest.androidPackage !== PACKAGE || manifest.versionCode !== versionCode || !validHash(manifest.certificateSha256) || !validHash(manifest.unsignedSha256)) throw new Error('Signed manifest does not match the approved stable identity.');
    const expectedTag = releaseTag(manifest.version, versionCode);
    if ((tag !== undefined && tag !== expectedTag) || !Array.isArray(manifest.artifacts) || manifest.artifacts.length !== 1) throw new Error('Tag or signed APK set differs from the requested release.');
    const apk = manifest.artifacts[0];
    if (apk.file !== `todo-moe-${manifest.version}-stable-vc${versionCode}.apk` || !validHash(apk.sha256) || !Number.isSafeInteger(apk.bytes) || apk.bytes <= 0) throw new Error('Invalid signed APK descriptor.');
    const apkFile = read(apk.file);
    if (apkFile.bytes.length !== apk.bytes || hash(apkFile.bytes) !== apk.sha256) throw new Error('Local signed APK size/hash mismatch.');
    const localApks = readdirSync(directory).filter((name) => name.toLowerCase().endsWith('.apk'));
    if (localApks.length !== 1 || localApks[0] !== apk.file) throw new Error('Unexpected local APK.');
    const notes = manifest.releaseNotes;
    if (!notes || notes.file !== 'RELEASE-NOTES.md' || !validHash(notes.sha256) || !validHash(notes.versionRecordSha256) || typeof notes.versionRecord !== 'string' || notes.versionRecord.length > 240 || !notes.versionRecord.startsWith('docs/todo-moe/docs/versions/') || !notes.versionRecord.endsWith('.md') || /[\\:#?<>"|\u0000-\u001f\u007f]/u.test(notes.versionRecord) || notes.versionRecord.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Signed manifest requires verified releaseNotes and a repository-relative version record.');
    const notesFile = read(notes.file);
    if (hash(notesFile.bytes) !== notes.sha256) throw new Error('Local release notes hash mismatch.');
    const sumsFile = read('SHA256SUMS');
    if (sumsFile.bytes.toString('utf8').trim() !== `${apk.sha256}  ${apk.file}`) throw new Error('SHA256SUMS does not describe exactly the signed APK.');
    const assets = [manifestFile, notesFile, sumsFile, apkFile].map((file) => ({ ...file, size: file.bytes.length, sha256: hash(file.bytes) }));
    const notesBody = normalizeBody(notesFile.bytes.toString('utf8'));
    if (notesBody.includes(INTENT_MARKER)) throw new Error('Release notes contain a reserved publication marker.');
    const intent = hash(JSON.stringify({ tag: expectedTag, sourceSha: approvedSha, assets: assets.map(({ name, size, sha256 }) => ({ name, size, sha256 })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0) }));
    return { directory, manifest, assets, tag: expectedTag, title: `Todo Moe ${expectedTag}`, body: `${notesBody}\n\n${INTENT_MARKER}${intent} -->\n`, intent };
}

/** Restore only an exact same-artifact draft. Existing published releases are
 * read-only: either all immutable data matches and this is a no-op, or fail. */
export async function publishRelease(options, dependencies = {}) {
    const local = loadSignedFiles(options);
    const runner = dependencies.gh ?? runGh;
    const gh = (args, configuration) => {
        if (options.preview && !(args[0] === 'api' && args[1] === '--method' && args[2] === 'GET')) throw new Error('Preview forbids GitHub writes.');
        return runner(args, configuration);
    };
    const source = await (dependencies.inspectSource ?? inspectApprovedSource)(options.repoDirectory, options.approvedSha, local.manifest.releaseNotes.versionRecord);
    if (source.head !== options.approvedSha || source.reachable !== true || source.version !== local.manifest.version || source.packageName !== PACKAGE || source.recordSha256 !== local.manifest.releaseNotes.versionRecordSha256) throw new Error('Approved commit/version record is not the verified main source.');
    if (options.reviewPlan !== undefined) {
        const plan = options.reviewPlan;
        if (!plan || plan.preview !== true || plan.intent !== local.intent || plan.sourceSha !== options.approvedSha || plan.versionCode !== options.versionCode || plan.repository !== options.repository || plan.publish !== options.publish || plan.signedRunId !== (options.signedRunId === undefined ? null : String(options.signedRunId))) throw new Error('Reviewed plan differs from the requested signed run, inputs or immutable artifact.');
    }
    const base = `repos/${REPOSITORY}`;
    let changed = false;
    async function api(method, endpoint, body) {
        const args = ['api', '--method', method, `${base}/${endpoint}`, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'];
        if (body !== undefined) args.push('--input', '-');
        return JSON.parse(String(await gh(args, { cwd: options.repoDirectory, input: body === undefined ? undefined : JSON.stringify(body) })));
    }
    async function optional(endpoint) {
        try { return await api('GET', endpoint); } catch (error) { if (error.httpStatus === 404) return null; throw error; }
    }
    async function all(endpoint) {
        const values = [];
        for (let page = 1; page <= 10; page++) {
            const batch = await api('GET', `${endpoint}?per_page=100&page=${page}`);
            if (!Array.isArray(batch)) throw new Error('Unexpected paginated GitHub response.');
            values.push(...batch);
            if (batch.length < 100) return values;
        }
        throw new Error('GitHub pagination limit exceeded.');
    }
    async function tagSha() {
        const tag = await optional(`git/ref/tags/${encodeURIComponent(local.tag)}`);
        if (!tag) return null;
        let object = tag.object;
        for (let depth = 0; object?.type === 'tag' && depth < 8; depth++) object = (await api('GET', `git/tags/${object.sha}`)).object;
        if (object?.type !== 'commit' || !/^[a-f0-9]{40}$/.test(object.sha)) throw new Error('Invalid or excessive annotated tag chain.');
        return object.sha;
    }
    async function getRelease() {
        const tagged = await optional(`releases/tags/${encodeURIComponent(local.tag)}`);
        if (tagged) return tagged;
        // GitHub's tag endpoint can omit drafts; the authenticated release list
        // includes them. Keep the exact-tag and immutable-content checks below.
        const drafts = (await all('releases')).filter((item) => item.tag_name === local.tag && item.draft === true);
        if (drafts.length > 1) throw new Error('Multiple drafts use the requested release tag.');
        return drafts[0] ?? null;
    }
    function assertRelease(release) {
        if (!release || !Number.isSafeInteger(release.id) || release.id <= 0 || release.tag_name !== local.tag || release.prerelease !== false || typeof release.draft !== 'boolean' || release.name !== local.title || normalizeBody(release.body) !== normalizeBody(local.body)) throw new Error('Release draft/content belongs to a different immutable artifact set.');
    }
    async function verifyAssets(release, requireAll) {
        assertRelease(release);
        const assets = await all(`releases/${release.id}/assets`);
        const expected = new Map(local.assets.map((asset) => [asset.name, asset]));
        // A post-release legal supplement may accompany the original signed set.
        // Accept only the exact LICENSE bytes from the approved source commit;
        // this does not alter the four-file intent or allow arbitrary extra assets.
        if (validHash(source.licenseSha256) && Number.isSafeInteger(source.licenseBytes) && source.licenseBytes > 0) {
            expected.set('LICENSE-AGPL-3.0.txt', { name: 'LICENSE-AGPL-3.0.txt', size: source.licenseBytes, sha256: source.licenseSha256 });
        }
        const seen = new Set();
        for (const asset of assets) {
            const file = expected.get(asset.name);
            if (!file || seen.has(asset.name)) throw new Error(`Unexpected or duplicate remote asset: ${asset.name}`);
            seen.add(asset.name);
            if (!Number.isSafeInteger(asset.id) || asset.id <= 0 || asset.state !== 'uploaded' || asset.size !== file.size) throw new Error(`Remote asset size/state mismatch: ${asset.name}`);
            const digest = typeof asset.digest === 'string' ? asset.digest.match(/^sha256:([a-f0-9]{64})$/i)?.[1]?.toLowerCase() : null;
            if (digest) {
                if (digest !== file.sha256) throw new Error(`Remote asset hash mismatch: ${asset.name}`);
            } else {
                const bytes = Buffer.from(await gh(['api', '--method', 'GET', `${base}/releases/assets/${asset.id}`, '-H', 'Accept: application/octet-stream'], { cwd: options.repoDirectory, binary: true, maxBuffer: file.size + 65536 }));
                if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw new Error(`Remote asset download hash mismatch: ${asset.name}`);
            }
        }
        const missing = local.assets.filter((asset) => !seen.has(asset.name));
        if (requireAll && missing.length) throw new Error(`Remote release is incomplete: ${missing.map((asset) => asset.name).join(', ')}`);
        return missing;
    }
    async function verifiedRelease(requireAll = false) {
        if (await tagSha() !== options.approvedSha) throw new Error('Release tag conflicts with the approved SHA.');
        const release = await getRelease();
        const missing = await verifyAssets(release, requireAll || release?.draft === false);
        return { release, missing };
    }
    async function assertNoNewerPublished() {
        const newer = (await all('releases')).some((item) => !item.draft && !item.prerelease && item.tag_name !== local.tag && /^moe-v\d+\.\d+\.\d+-vc\d+$/.test(item.tag_name) && Number(item.tag_name.match(/-vc(\d+)$/)[1]) >= options.versionCode);
        if (newer) throw new Error('A newer/equal versionCode is already published; keep this recovered candidate as draft.');
    }
    function previewPlan(mode, missing) {
        return {
            preview: true, changed: false, mode, repository: options.repository,
            tag: local.tag, sourceSha: options.approvedSha, version: local.manifest.version,
            versionCode: options.versionCode, androidPackage: PACKAGE, channel: 'stable',
            certificateSha256: local.manifest.certificateSha256, signedRunId: options.signedRunId === undefined ? null : String(options.signedRunId),
            publish: options.publish, willPublish: options.publish && mode !== 'already-published', intent: local.intent,
            assets: local.assets.map(({ name, size, sha256 }) => ({ name, size, sha256 })),
            missing: missing.map(({ name }) => name),
        };
    }

    const existingSha = await tagSha();
    const release = await getRelease();
    if (existingSha && existingSha !== options.approvedSha) throw new Error('Existing tag conflicts with the approved SHA.');
    if (existingSha && !release) throw new Error('Orphan tag has no verifiable draft; refusing to reuse its reserved versionCode.');
    if (!existingSha && release) throw new Error('Existing release has no matching Git tag.');
    if (!existingSha) {
        const releases = await all('releases');
        const tags = await all('tags');
        validateReleaseRequest({ sha: options.approvedSha, version: local.manifest.version, versionCode: options.versionCode, repository: options.repository, ref: options.ref, releases, tags });
        if (options.preview) return previewPlan('create-draft', local.assets);
        await api('POST', 'git/refs', { ref: `refs/tags/${local.tag}`, sha: options.approvedSha });
        changed = true;
        const staging = mkdtempSync(join(local.directory, '.publish-notes-'));
        try {
            // Preserve the signed notes asset verbatim; only the release body
            // gets an immutable artifact-set commitment for partial-upload retry.
            const notesFile = join(staging, 'RELEASE-NOTES.md');
            writeFileSync(notesFile, local.body);
            await gh(['release', 'create', local.tag, '--repo', REPOSITORY, '--verify-tag', '--target', options.approvedSha, '--title', local.title, '--notes-file', notesFile, '--draft'], { cwd: options.repoDirectory });
        } finally {
            if (!staging.startsWith(local.directory + sep)) throw new Error('Invalid temporary release-notes directory.');
            rmSync(staging, { recursive: true, force: true });
        }
    }

    let current = await verifiedRelease();
    if (options.preview) {
        if (current.release.draft && options.publish) await assertNoNewerPublished();
        return previewPlan(current.release.draft ? 'resume-draft' : 'already-published', current.missing);
    }
    if (!current.release.draft) return { status: 'already-published', changed, tag: local.tag, intent: local.intent };
    for (const asset of local.assets) {
        current = await verifiedRelease();
        if (!current.release.draft) return { status: 'already-published', changed, tag: local.tag, intent: local.intent };
        if (!current.missing.some((missing) => missing.name === asset.name)) continue;
        // No --clobber: concurrent/conflicting names fail rather than replace.
        await gh(['release', 'upload', local.tag, asset.name, '--repo', REPOSITORY], { cwd: local.directory });
        changed = true;
    }
    current = await verifiedRelease(true);
    if (!current.release.draft) return { status: 'already-published', changed, tag: local.tag, intent: local.intent };
    if (!options.publish) return { status: 'draft-ready', changed, tag: local.tag, intent: local.intent };
    // A recovered older draft must not become latest after a newer stable release.
    await assertNoNewerPublished();
    current = await verifiedRelease(true);
    if (!current.release.draft) return { status: 'already-published', changed, tag: local.tag, intent: local.intent };
    try {
        await gh(['release', 'edit', local.tag, '--repo', REPOSITORY, '--draft=false', '--latest'], { cwd: options.repoDirectory });
    } catch (error) {
        // Reconcile a response lost after the server committed publication.
        // Otherwise retain the draft and let the same job safely retry later.
        let reconciled;
        try { reconciled = await verifiedRelease(true); }
        catch { throw new Error('Publication outcome is uncertain; rerun this same job with the original signed artifact to verify remote state.'); }
        if (reconciled.release.draft) throw error;
    }
    // A successful CLI response alone does not prove publication or asset integrity.
    current = await verifiedRelease(true);
    if (current.release.draft) throw new Error('Publication readback is still draft; rerun this same job with the original signed artifact.');
    return { status: 'published', changed: true, tag: local.tag, intent: local.intent };
}

export function parsePublishArgs(args) {
    const preview = args.includes('--preview');
    const reviewIndex = args.indexOf('--review-plan');
    const reviewFile = reviewIndex < 0 ? undefined : args[reviewIndex + 1];
    if (reviewIndex >= 0 && (!reviewFile || reviewFile.startsWith('--'))) throw new Error('--review-plan requires a JSON file.');
    const positions = args.filter((arg, index) => arg !== '--preview' && (reviewIndex < 0 || (index !== reviewIndex && index !== reviewIndex + 1)));
    if (positions.length > 1 || positions.some((arg) => arg.startsWith('--'))) throw new Error('Usage: publish-release.mjs [signed-directory] [--preview] [--review-plan file]');
    return { preview, reviewFile, directory: positions[0] || 'signed' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const { preview, reviewFile, directory } = parsePublishArgs(process.argv.slice(2));
    const publish = process.env.PUBLISH ?? 'false';
    if (!['true', 'false'].includes(publish)) throw new Error('PUBLISH must be true or false.');
    publishRelease({
        directory: resolve(directory), repoDirectory: process.cwd(), preview,
        repository: process.env.GITHUB_REPOSITORY, ref: process.env.GITHUB_REF,
        approvedSha: process.env.MOE_APPROVED_SHA, versionCode: Number(process.env.MOE_VERSION_CODE),
        tag: process.env.TAG, publish: publish === 'true',
        signedRunId: process.env.MOE_SIGNED_RUN_ID,
        reviewPlan: reviewFile === undefined ? undefined : JSON.parse(readFileSync(resolve(reviewFile), 'utf8')),
    }).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
