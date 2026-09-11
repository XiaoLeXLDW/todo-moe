import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mergePreservingHistory } from './upstream.mjs';

const temporaryRoot=resolve(import.meta.dir,'../../build/moe/merge-fixtures');
const created:string[]=[];
afterEach(()=>{for(const directory of created.splice(0)){if(!directory.startsWith(temporaryRoot+require('node:path').sep))throw new Error('Unsafe test cleanup target');rmSync(directory,{recursive:true,force:true});}});
function git(directory:string,...args:string[]) {const result=spawnSync('git',args,{cwd:directory,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);return result.stdout.trim();}
function fixture() {
    mkdirSync(temporaryRoot,{recursive:true});const directory=mkdtempSync(join(temporaryRoot,'repo-'));created.push(directory);
    git(directory,'init','-b','main');git(directory,'config','core.autocrlf','false');git(directory,'config','user.name','Moe test');git(directory,'config','user.email','test@example.invalid');
    writeFileSync(join(directory,'common.txt'),'base\n');git(directory,'add','.');git(directory,'commit','-m','base');
    git(directory,'branch','upstream');return directory;
}
test('real git merges preserve both parents and repeated stable merges are idempotent',()=>{
    const directory=fixture();writeFileSync(join(directory,'fork.txt'),'fork');git(directory,'add','.');git(directory,'commit','-m','fork');const before=git(directory,'rev-parse','HEAD');
    git(directory,'checkout','upstream');writeFileSync(join(directory,'upstream.txt'),'upstream');git(directory,'add','.');git(directory,'commit','-m','upstream');const upstream=git(directory,'rev-parse','HEAD');git(directory,'checkout','main');
    expect(mergePreservingHistory(directory,[upstream]).status).toBe('merged');const merged=git(directory,'rev-parse','HEAD');
    expect(git(directory,'show','-s','--format=%P',merged).split(' ')).toEqual([before,upstream]);expect(readFileSync(join(directory,'fork.txt'),'utf8')).toBe('fork');
    expect(mergePreservingHistory(directory,[upstream]).status).toBe('merged');expect(git(directory,'rev-parse','HEAD')).toBe(merged);
});
test('conflicting upstream produces paths and abort preserves the fork content and commit',()=>{
    const directory=fixture();writeFileSync(join(directory,'common.txt'),'fork\n');git(directory,'add','.');git(directory,'commit','-m','fork');const before=git(directory,'rev-parse','HEAD');
    git(directory,'checkout','upstream');writeFileSync(join(directory,'common.txt'),'upstream\n');git(directory,'add','.');git(directory,'commit','-m','upstream');const upstream=git(directory,'rev-parse','HEAD');git(directory,'checkout','main');
    expect(mergePreservingHistory(directory,[upstream])).toMatchObject({status:'conflict',conflicts:['common.txt']});
    expect(git(directory,'rev-parse','HEAD')).toBe(before);expect(git(directory,'status','--porcelain')).toBe('');expect(readFileSync(join(directory,'common.txt'),'utf8')).toBe('fork\n');
});
