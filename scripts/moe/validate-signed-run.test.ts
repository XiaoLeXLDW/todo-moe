import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { validateSignedRun } from './validate-signed-run.mjs';

const repository = 'XiaoLeXLDW/todo-moe';
const head = 'a'.repeat(40);
const options = { repository, ref: 'refs/heads/main', eventName: 'workflow_dispatch', approvedSha: 'b'.repeat(40), versionCode: 4, signedRunId: '123', repoDirectory: '.' };
function fixture() {
    const run = { id: 123, repository: { full_name: repository }, head_repository: { full_name: repository }, head_branch: 'main', event: 'workflow_dispatch', path: '.github/workflows/moe-release-android.yml', head_sha: head, status: 'completed', conclusion: 'failure' };
    const jobs = [{ id: 44, run_id: 123, name: 'sign', head_sha: head, status: 'completed', conclusion: 'success' }];
    const artifacts = [{ id: 55, name: 'todo-moe-signed-stable', expired: false, size_in_bytes: 1234, digest: `sha256:${'c'.repeat(64)}`, workflow_run: { id: 123, head_sha: head, head_branch: 'main' } }];
    const calls: string[] = [];
    let paginated = false;
    const gh = async (args: string[]) => {
        expect(args.slice(0, 3)).toEqual(['api', '--method', 'GET']);
        const path = args[3]; calls.push(path);
        if (path.endsWith('/runs/123')) return JSON.stringify(run);
        if (path.includes('/jobs?filter=all&')) {
            if (paginated && path.endsWith('page=1')) return JSON.stringify({ total_count: 101, jobs: Array.from({ length: 100 }, (_, index) => ({ id: 1000 + index, name: 'release', conclusion: 'failure' })) });
            return JSON.stringify({ total_count: paginated ? 101 : jobs.length, jobs });
        }
        if (path.includes('/artifacts?')) return JSON.stringify({ total_count: artifacts.length, artifacts });
        throw new Error(`Unexpected endpoint ${path}`);
    };
    return { run, jobs, artifacts, calls, dependencies: { gh }, setPaginated: () => { paginated = true; } };
}

test('accepts completed failed release run with successful sign, even when workflow SHA differs from approved input', async () => {
    const f = fixture();
    const result = await validateSignedRun(options, f.dependencies);
    expect(result).toMatchObject({ signedRunId: '123', artifactId: 55, signJobIds: [44], approvedSha: options.approvedSha, workflowSha: head, versionCode: 4 });
    expect(f.calls.every((path) => path.startsWith(`repos/${repository}/actions/runs/123`))).toBe(true);
});

test('filter=all pagination finds original successful signing job after a release-only retry', async () => {
    const f = fixture(); f.setPaginated();
    expect((await validateSignedRun(options, f.dependencies)).signJobIds).toEqual([44]);
    expect(f.calls.some((path) => path.endsWith('/jobs?filter=all&per_page=100&page=2'))).toBe(true);
});

test.each(['repository', 'ref', 'eventName', 'approvedSha', 'versionCode', 'signedRunId'])('rejects invalid current %s before GitHub reads', async (key) => {
    const f = fixture(); const invalid = { ...options, [key]: key === 'versionCode' ? 0 : 'invalid' };
    await expect(validateSignedRun(invalid, f.dependencies)).rejects.toThrow();
    expect(f.calls).toHaveLength(0);
});

test.each(['repository', 'head_repository', 'head_branch', 'event', 'path', 'status', 'id'])('rejects untrusted old run %s before artifact listing', async (field) => {
    const f = fixture();
    (f.run as any)[field] = field.includes('repository') ? { full_name: 'attacker/fork' } : field === 'id' ? 124 : 'wrong';
    await expect(validateSignedRun(options, f.dependencies)).rejects.toThrow('untrusted');
    expect(f.calls).toHaveLength(1);
});

test.each(['failure', 'skipped', 'in_progress', 'different-run', 'different-source'])('rejects an unproven sign job %s before artifact listing', async (kind) => {
    const f = fixture();
    if (kind === 'in_progress') f.jobs[0].status = kind;
    else if (kind === 'different-run') f.jobs[0].run_id = 124;
    else if (kind === 'different-source') f.jobs[0].head_sha = 'd'.repeat(40);
    else f.jobs[0].conclusion = kind;
    await expect(validateSignedRun(options, f.dependencies)).rejects.toThrow('no successful sign');
    expect(f.calls.some((path) => path.includes('/artifacts?'))).toBe(false);
});

test.each(['expired', 'wrong-run', 'wrong-source', 'duplicate', 'missing'])('rejects %s signed artifact provenance', async (kind) => {
    const f = fixture();
    if (kind === 'expired') f.artifacts[0].expired = true;
    if (kind === 'wrong-run') f.artifacts[0].workflow_run.id = 124;
    if (kind === 'wrong-source') f.artifacts[0].workflow_run.head_sha = 'd'.repeat(40);
    if (kind === 'duplicate') f.artifacts.push({ ...f.artifacts[0], id: 56 });
    if (kind === 'missing') f.artifacts.length = 0;
    await expect(validateSignedRun(options, f.dependencies)).rejects.toThrow();
});

test('workflow default is review-only and the protected job consumes the exact current-run review artifact', () => {
    const workflow = parse(readFileSync(new URL('../../.github/workflows/moe-publish-existing.yml', import.meta.url), 'utf8'));
    expect(workflow.on.workflow_dispatch.inputs.publish.default).toBe(false);
    expect(workflow.concurrency).toEqual({ group: 'moe-stable-release', 'cancel-in-progress': false });
    const { prepare, publish } = workflow.jobs;
    expect(prepare.permissions).toEqual({ contents: 'read', actions: 'read' });
    expect(prepare.environment).toBeUndefined();
    expect(publish.environment).toBe('todo-moe-publish');
    expect(publish.permissions).toEqual({ contents: 'write', actions: 'read' });
    expect(publish.if).toContain('inputs.publish');
    const downloadIndex = prepare.steps.findIndex((step: any) => step.uses?.startsWith('actions/download-artifact@'));
    const validationIndex = prepare.steps.findIndex((step: any) => step.id === 'origin');
    expect(validationIndex).toBeLessThan(downloadIndex);
    expect(prepare.steps[downloadIndex].with['artifact-ids']).toBe('${{ steps.origin.outputs.artifact_id }}');
    expect(prepare.steps[downloadIndex].with['run-id']).toBe('${{ steps.origin.outputs.signed_run_id }}');
    const preview = prepare.steps.find((step: any) => step.run?.includes('--preview'));
    expect(preview.run).toContain('../workflow/scripts/moe/publish-release.mjs');
    expect(preview['working-directory']).toBe('approved-source');
    const reviewed = publish.steps.find((step: any) => step.uses?.startsWith('actions/download-artifact@'));
    expect(reviewed.with['artifact-ids']).toBe('${{ needs.prepare.outputs.review_artifact_id }}');
    expect(reviewed.with['run-id']).toBeUndefined();
    const execution = publish.steps.at(-1);
    expect(execution.run).toContain('--review-plan ../reviewed/review-plan.json');
    expect(execution['working-directory']).toBe('approved-source');
    for (const job of [prepare, publish]) {
        const checkouts = job.steps.filter((step: any) => step.uses?.startsWith('actions/checkout@'));
        expect(checkouts[0].with).toMatchObject({ ref: '${{ github.sha }}', path: 'workflow', 'persist-credentials': false });
        expect(checkouts[1].with).toMatchObject({ ref: '${{ inputs.approved_sha }}', path: 'approved-source', 'fetch-depth': 0 });
        expect(JSON.stringify(job)).not.toMatch(/MOE_KEYSTORE|todo-moe-signing|sign-android|bun install/);
    }
});
