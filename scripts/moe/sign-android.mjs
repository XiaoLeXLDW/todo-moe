#!/usr/bin/env node
// Executes only in a separate protected job, using Node built-ins + Android SDK.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { assertSha } from './upstream.mjs';
const input=resolve(process.argv[2]||'unsigned');
const output=resolve(process.argv[3]||'signed');
const manifest=JSON.parse(readFileSync(join(input,'build-manifest.json'),'utf8'));
const sha=assertSha(process.env.MOE_APPROVED_SHA||'');
const code=Number(process.env.MOE_VERSION_CODE);
if(manifest.sourceSha!==sha||manifest.dirty!==false||manifest.channel!=='stable'||manifest.androidPackage!=='io.github.xiaolexldw.todomoe'||manifest.versionCode!==code) throw new Error('Unsigned manifest does not match the approved stable identity.');
if(!Array.isArray(manifest.artifacts)||manifest.artifacts.length!==1) throw new Error('Stable signing requires exactly one APK (arm64-v8a).');
const artifact=manifest.artifacts[0];
if(basename(artifact.file)!==artifact.file||!artifact.file.endsWith('.apk')) throw new Error('Invalid artifact path.');
const apk=join(input,artifact.file);
const digest=(file)=>createHash('sha256').update(readFileSync(file)).digest('hex');
if(digest(apk)!==artifact.sha256) throw new Error('Unsigned artifact hash mismatch.');
for(const name of ['MOE_KEYSTORE_BASE64','MOE_KEYSTORE_PASSWORD','MOE_KEY_ALIAS','MOE_KEY_PASSWORD','MOE_CERT_SHA256']) if(!process.env[name]) throw new Error(`${name} must be configured in the protected signing environment.`);
const expectedCert=process.env.MOE_CERT_SHA256.replaceAll(':','').toLowerCase();
if(!/^[a-f0-9]{64}$/.test(expectedCert)) throw new Error('Expected signing certificate must be a SHA-256 fingerprint.');
const tools=join(process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||'', 'build-tools/36.0.0');
function run(name,args) { const r=spawnSync(join(tools,name),args,{encoding:'utf8'}); if(r.error||r.status!==0)throw new Error(`${name} failed; inspect the protected job without printing credential values.`); return r.stdout; }
const badging=run('aapt',['dump','badging',apk]);
const pkg=badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m);
if(!pkg||pkg[1]!==manifest.androidPackage||Number(pkg[2])!==code||pkg[3]!==manifest.version) throw new Error('Actual APK package/version disagrees with the approved manifest.');
if(readdirSync(input).filter((file)=>file.endsWith('.apk')).length!==1) throw new Error('Unexpected additional APK artifact.');
mkdirSync(output,{recursive:true});
const privateDir=mkdtempSync(join(tmpdir(),'todo-moe-sign-'));
try {
    const keystore=join(privateDir,'signing.keystore');
    writeFileSync(keystore,Buffer.from(process.env.MOE_KEYSTORE_BASE64,'base64'),{mode:0o600});
    const aligned=join(privateDir,'aligned.apk');
    run('zipalign',['-f','-P','16','4',apk,aligned]);
    const file=`todo-moe-${manifest.version}-stable-vc${code}.apk`;
    const signed=join(output,file);
    run('apksigner',['sign','--ks',keystore,'--ks-key-alias',process.env.MOE_KEY_ALIAS,'--ks-pass','env:MOE_KEYSTORE_PASSWORD','--key-pass','env:MOE_KEY_PASSWORD','--out',signed,aligned]);
    const verification=run('apksigner',['verify','--verbose','--print-certs',signed]);
    const certificates=[...verification.matchAll(/Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)/gi)];
    if(certificates.length!==1||certificates[0][1].toLowerCase()!==expectedCert) throw new Error('Actual signing certificate does not match the protected fingerprint.');
    run('zipalign',['-c','-P','16','4',signed]);
    const releaseManifest={...manifest,artifacts:[{file,bytes:readFileSync(signed).length,sha256:digest(signed)}],certificateSha256:expectedCert,unsignedSha256:artifact.sha256};
    writeFileSync(join(output,'release-manifest.json'),JSON.stringify(releaseManifest,null,2)+'\n');
    writeFileSync(join(output,'SHA256SUMS'),`${releaseManifest.artifacts[0].sha256}  ${file}\n`);
    writeFileSync(join(output,'RELEASE-NOTES.md'),`Todo Moe ${manifest.version} (Stable)\n\nSource: https://github.com/XiaoLeXLDW/todo-moe/commit/${sha}\nUpstream: ${manifest.upstreamRepository}/commit/${manifest.upstreamSha}\nversionCode: ${code}\nAPK SHA-256: ${releaseManifest.artifacts[0].sha256}\nCertificate SHA-256: ${expectedCert}\n\nAndroid arm64-v8a. AGPL-3.0-only; upstream and third-party notices retained in the corresponding source. Build instructions: docs/todo-moe/ANDROID-DELIVERY.md.\nDevice installation, reminders, backup/restore and upgrades require separate acceptance evidence.\n`);
    console.log(JSON.stringify({file,sha256:digest(signed),certificateSha256:expectedCert},null,2));
} finally {
    // The fixed mkdtemp result is the only recursive deletion target.
    rmSync(privateDir,{recursive:true,force:true});
}
