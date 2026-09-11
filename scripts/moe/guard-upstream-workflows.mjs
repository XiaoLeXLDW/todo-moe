#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const directory=new URL('../../.github/workflows/',import.meta.url);
const guard="github.repository == 'dongdongbh/Mindwtr'";
let failures=0;
for(const file of readdirSync(directory).filter((file)=>/^(release|publish|docker-image|update-|bump-|wiki-sync|debug-notary|msstore-flight-id|android-debug-build).*\.yml$/.test(file))) {
    const url=new URL(file,directory); const original=readFileSync(url,'utf8'); const newline=original.includes('\r\n')?'\r\n':'\n';
    const lines=original.split(/\r?\n/); let inJobs=false;
    for(let i=0;i<lines.length;i++) {
        if(lines[i]==='jobs:'){inJobs=true;continue;}
        if(inJobs && /^\S/.test(lines[i]) && !lines[i].startsWith('#'))inJobs=false;
        if(!inJobs||!/^  [\w-]+:\s*$/.test(lines[i]))continue;
        let end=i+1;while(end<lines.length&&!/^  [\w-]+:\s*$/.test(lines[end])&&!/^\S/.test(lines[end]))end++;
        const existing=lines.findIndex((line,index)=>index>i&&index<end&&/^    if:/.test(line));
        if(existing>=0) {
            if(lines[existing].includes(guard))continue;
            let expression=lines[existing].replace(/^    if:\s*/,'').trim();
            if(expression.startsWith('${{')&&expression.endsWith('}}'))expression=expression.slice(3,-2).trim();
            if(['>','>-','|','|-'].includes(expression))throw new Error(`Review multiline job condition manually: ${file}:${existing+1}`);
            lines[existing]=`    if: \${{ ${guard} && (${expression}) }}`;
        } else { lines.splice(i+1,0,`    if: \${{ ${guard} }}`); }
    }
    const updated=lines.join(newline);
    if(updated!==original) {
        if(process.argv.includes('--apply')) {writeFileSync(url,updated);console.log(`Guarded ${file}`);}
        else {console.error(`Missing fork guard: ${join('.github/workflows',file)}`);failures++;}
    }
}
if(failures)process.exitCode=1;
