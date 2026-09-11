import { afterEach, describe, expect, test } from 'bun:test';
import config from '../../apps/mobile/app.config';
import app from '../../apps/mobile/app.json';
import { getTodoMoeIdentity, todoMoeBrand } from '../../apps/mobile/moe/brand/config.cjs';

const keys=['APP_VARIANT','MOE_VERSION_CODE','MOE_SOURCE_SHA','ANALYTICS_HEARTBEAT_URL','DROPBOX_APP_KEY'] as const;
const saved=Object.fromEntries(keys.map((key)=>[key,process.env[key]]));
afterEach(()=>{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}});
const build=()=>config({config:app.expo} as Parameters<typeof config>[0]);
describe('Todo Moe Expo identity',()=>{
    test('default is isolated Dev with no upstream service identities',()=>{
        delete process.env.APP_VARIANT; delete process.env.MOE_SOURCE_SHA; delete process.env.MOE_VERSION_CODE;
        process.env.ANALYTICS_HEARTBEAT_URL='https://upstream.invalid';process.env.DROPBOX_APP_KEY='upstream-key';
        const result=build();
        expect(result.name).toBe('Todo Moe Dev');expect(result.android?.package).toBe('io.github.xiaolexldw.todomoe.dev');expect(result.scheme).toBe('todomoe-dev');
        expect(result.owner).toBeUndefined();expect(result.extra?.eas).toBeUndefined();expect(result.extra?.analyticsHeartbeatUrl).toBe('');expect(result.extra?.dropboxAppKey).toBe('');
        expect(result.updates?.enabled).toBeFalse();expect(result.platforms).toEqual(['android']);expect(result.extra?.todoMoe.upstreamSha).toBe(todoMoeBrand.upstreamSha);
        expect(result.extra?.todoMoe.sourceSha).toMatch(/^[a-f0-9]{40}$/);
    });
    test('stable identity is separate and accidental variants cannot use it',()=>{
        expect(getTodoMoeIdentity('stable')).toMatchObject({name:'Todo Moe',scheme:'todomoe',packageName:'io.github.xiaolexldw.todomoe'});
        process.env.APP_VARIANT='production';expect(build).toThrow('APP_VARIANT');
        process.env.APP_VARIANT='stable';delete process.env.MOE_VERSION_CODE;expect(build).toThrow('Stable requires');
    });
    test('invalid codes and false source provenance fail closed',()=>{
        process.env.APP_VARIANT='development';delete process.env.MOE_SOURCE_SHA;
        for(const code of ['0','-1','1.1','NaN','2100000001']){process.env.MOE_VERSION_CODE=code;expect(build).toThrow('MOE_VERSION_CODE');}
        process.env.MOE_VERSION_CODE='5';process.env.MOE_SOURCE_SHA='0'.repeat(40);expect(build).toThrow('differs');
    });
});
