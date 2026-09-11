import { describe, expect, test } from 'bun:test';
import { selectStableRelease, assertSha } from './upstream.mjs';
import { releaseTag, validateReleaseRequest } from './release-policy.mjs';

describe('release boundaries', () => {
    const base={sha:'a'.repeat(40),version:'0.1.0',versionCode:2,repository:'XiaoLeXLDW/todo-moe',ref:'refs/heads/main',releases:[]};
    test('stable discovery ignores drafts/RC and orders semantic versions',()=>{
        expect(selectStableRelease([{tag_name:'v1.9.0'},{tag_name:'v1.10.0'},{tag_name:'v9.0.0',prerelease:true},{tag_name:'v8.0.0',draft:true},{tag_name:'nightly'}])?.tag_name).toBe('v1.10.0');
        expect(selectStableRelease([{tag_name:'main'},{tag_name:'v1.0.0-rc.1'}])).toBeNull();
    });
    test('full immutable SHA required',()=>{expect(()=>assertSha('main')).toThrow();expect(()=>assertSha('a'.repeat(39))).toThrow();});
    test('channel and identity fixed',()=>{expect(validateReleaseRequest(base)).toMatchObject({channel:'stable',androidPackage:'io.github.xiaolexldw.todomoe'});expect(()=>validateReleaseRequest({...base,ref:'refs/pull/5/merge'})).toThrow();expect(()=>validateReleaseRequest({...base,repository:'attacker/fork'})).toThrow();});
    test('drafts reserve versionCodes and prevent repeats or downgrade',()=>{for(const code of [1,2])expect(()=>validateReleaseRequest({...base,versionCode:code,releases:[{tag_name:'moe-v0.1.0-vc2',draft:true}]})).toThrow();});
    test('a deleted release with a retained Git tag still reserves its versionCode',()=>{expect(()=>validateReleaseRequest({...base,tags:[{name:'moe-v0.1.0-vc2'}]})).toThrow();});
    test('non-stable versions and invalid codes rejected',()=>{for(const code of [0,-1,1.5,NaN,2100000001])expect(()=>releaseTag('0.1.0',code)).toThrow();expect(()=>releaseTag('0.1.0-dev',1)).toThrow();});
});
