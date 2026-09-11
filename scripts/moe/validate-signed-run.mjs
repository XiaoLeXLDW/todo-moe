#!/usr/bin/env node
import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runGh } from './publish-release.mjs';

const REPOSITORY = 'XiaoLeXLDW/todo-moe';
const WORKFLOW = '.github/workflows/moe-release-android.yml';
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

/** Read-only provenance gate, before any old-run artifact is downloaded.
 * The signed manifest is separately checked by publisher against approvedSha/code.
 * Run head_sha is the workflow commit, which need not equal its approved input. */
export async function validateSignedRun(options, dependencies = {}) {
    const { repository, ref, eventName, approvedSha, versionCode, signedRunId } = options;
    if (repository !== REPOSITORY || ref !== 'refs/heads/main' || eventName !== 'workflow_dispatch') throw new Error('Existing publication must be manually dispatched from fork main.');
    if (!/^[a-f0-9]{40}$/.test(approvedSha ?? '') || !positiveInteger(versionCode) || versionCode > 2100000000 || !/^[1-9]\d*$/.test(String(signedRunId)) || !positiveInteger(Number(signedRunId))) throw new Error('Invalid approved SHA, versionCode or signed run ID.');
    const gh = dependencies.gh ?? runGh;
    const base = `repos/${REPOSITORY}/actions/runs/${signedRunId}`;
    async function get(endpoint) {
        return JSON.parse(String(await gh(['api', '--method', 'GET', endpoint, '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28'], { cwd: options.repoDirectory })));
    }
    const run = await get(base);
    if (run.id !== Number(signedRunId) || run.repository?.full_name !== REPOSITORY || run.head_repository?.full_name !== REPOSITORY || run.head_branch !== 'main' || run.event !== 'workflow_dispatch' || run.path !== WORKFLOW || run.status !== 'completed' || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) throw new Error('Signed run has an untrusted repository, branch, trigger, workflow or incomplete status.');
    async function list(kind, query = '') {
        const items = [];
        for (let page = 1; page <= 10; page++) {
            const response = await get(`${base}/${kind}?${query}per_page=100&page=${page}`);
            const batch = response[kind];
            if (!Array.isArray(batch) || !Number.isSafeInteger(response.total_count) || response.total_count < 0) throw new Error(`Malformed ${kind} response.`);
            items.push(...batch);
            if (items.length >= response.total_count) return items;
            if (batch.length === 0) throw new Error(`Incomplete ${kind} pagination.`);
        }
        throw new Error(`${kind} pagination limit exceeded.`);
    }
    // filter=all retains the successful sign job when only release was rerun.
    const jobs = await list('jobs', 'filter=all&');
    const successfulSigns = jobs.filter((job) => job.name === 'sign' && job.run_id === Number(signedRunId) && job.head_sha === run.head_sha && job.status === 'completed' && job.conclusion === 'success' && positiveInteger(job.id));
    if (!successfulSigns.length) throw new Error('The original signed run has no successful sign job.');
    const artifacts = (await list('artifacts')).filter((artifact) => artifact.name === 'todo-moe-signed-stable');
    if (artifacts.length !== 1) throw new Error('Expected one unambiguous original signed artifact.');
    const artifact = artifacts[0];
    if (!positiveInteger(artifact.id) || artifact.expired !== false || !positiveInteger(artifact.size_in_bytes) || artifact.workflow_run?.id !== Number(signedRunId) || artifact.workflow_run?.head_sha !== run.head_sha || artifact.workflow_run?.head_branch !== 'main') throw new Error('Signed artifact is expired or belongs to a different run.');
    return {
        repository: REPOSITORY, signedRunId: String(signedRunId), workflow: WORKFLOW,
        workflowSha: run.head_sha, approvedSha, versionCode,
        signJobIds: successfulSigns.map((job) => job.id), artifactId: artifact.id,
        artifactName: artifact.name, artifactDigest: artifact.digest ?? null,
        runUrl: `https://github.com/${REPOSITORY}/actions/runs/${signedRunId}`,
    };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    validateSignedRun({
        repository: process.env.GITHUB_REPOSITORY, ref: process.env.GITHUB_REF,
        eventName: process.env.GITHUB_EVENT_NAME, approvedSha: process.env.MOE_APPROVED_SHA,
        versionCode: Number(process.env.MOE_VERSION_CODE), signedRunId: process.env.MOE_SIGNED_RUN_ID,
        repoDirectory: process.cwd(),
    }).then((result) => {
        if (process.argv[2]) writeFileSync(resolve(process.argv[2]), JSON.stringify(result, null, 2) + '\n');
        if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `artifact_id=${result.artifactId}\nsigned_run_id=${result.signedRunId}\n`);
        console.log(JSON.stringify(result, null, 2));
    }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
