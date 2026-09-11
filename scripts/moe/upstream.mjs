#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const upstreamRepository = 'dongdongbh/Mindwtr';
export function selectStableRelease(releases) {
    return releases.filter((r) => !r.draft && !r.prerelease && /^v?\d+\.\d+\.\d+$/.test(r.tag_name))
        .sort((a,b) => { const av=a.tag_name.replace(/^v/,'').split('.').map(Number); const bv=b.tag_name.replace(/^v/,'').split('.').map(Number); for(let i=0;i<3;i++) if(av[i]!==bv[i]) return bv[i]-av[i]; return 0; })[0] ?? null;
}
export function assertSha(sha) { if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('Expected a full lowercase commit SHA.'); return sha; }
function execute(command, args, cwd, allowFailure = false) {
    const result = spawnSync(command, args, { cwd, encoding:'utf8' });
    if (!allowFailure && (result.error || result.status !== 0)) throw new Error(`${command} ${args.join(' ')} failed: ${result.stderr || result.error}`);
    return result;
}
export function mergePreservingHistory(worktree, targets) {
    for(const target of targets) {
        const merge=execute('git',['-c','user.name=Todo Moe upstream sync','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','merge','--no-ff','--no-edit',target],worktree,true);
        if(merge.status!==0) {
            const conflicts=execute('git',['diff','--name-only','--diff-filter=U'],worktree).stdout.trim().split('\n').filter(Boolean);
            const failure=merge.stderr.trim()||merge.stdout.trim();
            execute('git',['merge','--abort'],worktree,true);
            return {status:conflicts.length?'conflict':'merge-failed',conflicts,failure};
        }
    }
    return {status:'merged',conflicts:[]};
}
export async function github(path) {
    const response = await fetch(`https://api.github.com/${path}`, { headers: { Accept:'application/vnd.github+json', ...(process.env.GH_TOKEN ? { Authorization:`Bearer ${process.env.GH_TOKEN}` } : {}), 'X-GitHub-Api-Version':'2022-11-28' } });
    if (!response.ok) throw new Error(`GitHub ${path}: HTTP ${response.status}`);
    return response.json();
}
async function main() {
    const args=process.argv.slice(2); const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
    const mode=args[0] || 'discover';
    if (!['discover','prepare'].includes(mode)) throw new Error('Use discover or prepare. Neither mode pushes or creates a PR.');
    const releases=[];
    for(let page=1;page<=10;page++) { const batch=await github(`repos/${upstreamRepository}/releases?per_page=100&page=${page}`); releases.push(...batch); if(batch.length<100) break; if(page===10) throw new Error('Release listing exceeded limit; inspect pagination.'); }
    const release=selectStableRelease(releases);
    if (!release) throw new Error('No semantic stable upstream release exists; refusing to treat main as stable.');
    const commit=await github(`repos/${upstreamRepository}/commits/${encodeURIComponent(release.tag_name)}`);
    const sha=assertSha(commit.sha);
    const before=execute('git',['rev-parse','HEAD'],root).stdout.trim();
    const alreadyContained=execute('git',['merge-base','--is-ancestor',sha,'HEAD'],root,true).status===0;
    const report={ checkedAt:new Date().toISOString(), upstreamRepository, tag:release.tag_name, upstreamSha:sha, baseSha:before, status:alreadyContained?'no-update':'discovered', mergeSha:'', branch:'moe/upstream-sync', worktree:'', conflicts:[] };
    if(mode==='prepare') {
        if(execute('git',['status','--porcelain'],root).stdout.trim()) throw new Error('Prepare requires a clean checkout.');
        execute('git',['fetch','--no-tags',`https://github.com/${upstreamRepository}.git`,`refs/tags/${release.tag_name}`],root);
        const fetched=execute('git',['rev-parse','FETCH_HEAD^{commit}'],root).stdout.trim();
        if(fetched!==sha) throw new Error('Upstream tag moved between discovery and fetch.');
        const ancestor=execute('git',['merge-base','--is-ancestor',sha,'HEAD'],root,true);
        if(ancestor.status===0) report.status='no-update';
        else {
            const existing=execute('git',['ls-remote','--exit-code','--heads','origin',report.branch],root,true);
            if(existing.status!==0 && existing.status!==2) throw new Error(`Could not inspect sync branch: ${existing.stderr}`);
            let start='HEAD';
            if(existing.status===0) { execute('git',['fetch','origin',report.branch],root); start='FETCH_HEAD'; }
            const startingSha=execute('git',['rev-parse',start],root).stdout.trim();
            const worktree=join(root,'build/upstream',`${release.tag_name}-${Date.now()}`);
            mkdirSync(dirname(worktree),{recursive:true});
            execute('git',['worktree','add','--detach',worktree,start],root);
            report.worktree=worktree;
            // Merge the current default branch and then upstream, preserving both
            // ancestry lines. A conflict leaves its file list before aborting.
            Object.assign(report,mergePreservingHistory(worktree,[before,sha]));
            if(report.status==='merged') {
                const brand=join(worktree,'apps/mobile/moe/brand/config.json');
                const original=readFileSync(brand,'utf8');
                const updated=JSON.stringify({...JSON.parse(original),upstreamVersion:release.tag_name.replace(/^v/,''),upstreamSha:sha,upstreamRef:release.tag_name},null,2)+'\n';
                if(updated!==original) {
                    writeFileSync(brand,updated); execute('git',['add','apps/mobile/moe/brand/config.json'],worktree);
                    execute('git',['-c','user.name=Todo Moe upstream sync','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m',`chore(moe): record upstream ${release.tag_name}`],worktree);
                }
                report.status='prepared'; report.mergeSha=assertSha(execute('git',['rev-parse','HEAD'],worktree).stdout.trim());
                if(report.mergeSha===startingSha) report.status='no-update';
                report.changedFiles=execute('git',['diff','--name-only',before,report.mergeSha],worktree).stdout.trim().split('\n').filter(Boolean);
                report.reviewFlags=report.changedFiles.filter((file)=>/core|storage|sync|migration|permission|complete|alarm|workflow|brand|release/i.test(file));
            }
        }
    }
    mkdirSync(join(root,'build/moe'),{recursive:true});
    writeFileSync(join(root,'build/moe/upstream-report.json'),JSON.stringify(report,null,2)+'\n');
    if(process.env.GITHUB_OUTPUT) for(const [key,value] of Object.entries({status:report.status,sha:report.mergeSha,tag:report.tag,worktree:report.worktree})) appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${value}\n`);
    console.log(JSON.stringify(report,null,2));
    if(report.status==='conflict'||report.status==='merge-failed') process.exitCode=2;
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch((error)=>{console.error(error.message);process.exitCode=1;});
