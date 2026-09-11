#!/usr/bin/env node
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertSha, github } from './upstream.mjs';

export function releaseTag(version, code) {
    if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Stable version must be x.y.z.');
    if(!Number.isSafeInteger(code)||code<1||code>2100000000) throw new Error('Invalid versionCode.');
    return `moe-v${version}-vc${code}`;
}
export function validateReleaseRequest({sha,version,versionCode,repository,ref,releases,tags=[]}) {
    assertSha(sha);
    if(repository!=='XiaoLeXLDW/todo-moe'||ref!=='refs/heads/main') throw new Error('Stable release must be dispatched from the fork main branch.');
    const tag=releaseTag(version,versionCode);
    const names=[...releases.map((r)=>r.tag_name),...tags.map((tag)=>tag.name)];
    const codes=names.filter((name)=>/^moe-v\d+\.\d+\.\d+-vc\d+$/.test(name)).map((name)=>Number(name.match(/-vc(\d+)$/)[1]));
    const maximum=Math.max(0,...codes);
    if(versionCode<=maximum) throw new Error(`versionCode must exceed existing tag/draft/published maximum ${maximum}; never overwrite a release artifact.`);
    return {sha,version,versionCode,tag,androidPackage:'io.github.xiaolexldw.todomoe',channel:'stable'};
}
async function main() {
    const sha=assertSha(process.env.MOE_APPROVED_SHA||'');
    const current=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
    if(current.status!==0||current.stdout.trim()!==sha) throw new Error('Checked-out source differs from approved SHA.');
    const ancestor=spawnSync('git',['merge-base','--is-ancestor',sha,'origin/main']);
    if(ancestor.status!==0) throw new Error('Approved SHA must be reachable from origin/main.');
    const version=JSON.parse(readFileSync('apps/mobile/moe/brand/config.json','utf8')).version;
    const releases=[];
    for(let page=1;page<=10;page++) { const batch=await github(`repos/XiaoLeXLDW/todo-moe/releases?per_page=100&page=${page}`);releases.push(...batch);if(batch.length<100)break;if(page===10)throw new Error('Release pagination limit exceeded.'); }
    const tags=[];
    for(let page=1;page<=10;page++) { const batch=await github(`repos/XiaoLeXLDW/todo-moe/tags?per_page=100&page=${page}`);tags.push(...batch);if(batch.length<100)break;if(page===10)throw new Error('Tag pagination limit exceeded.'); }
    const plan=validateReleaseRequest({sha,version,versionCode:Number(process.env.MOE_VERSION_CODE),repository:process.env.GITHUB_REPOSITORY,ref:process.env.GITHUB_REF,releases,tags});
    mkdirSync('build/moe',{recursive:true});
    writeFileSync('build/moe/release-plan.json',JSON.stringify(plan,null,2)+'\n');
    if(process.env.GITHUB_OUTPUT) for(const [key,value]of Object.entries(plan)) appendFileSync(process.env.GITHUB_OUTPUT,`${key}=${value}\n`);
    console.log(JSON.stringify(plan,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch((error)=>{console.error(error.message);process.exitCode=1;});
