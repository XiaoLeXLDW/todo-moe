import { expect, test } from 'bun:test';
import { DEV_VERSION_EPOCH, devVersionAt, allocateDevVersion } from './dev-version.mjs';
test('fixed UTC epoch fits Android range and rejects invalid clocks',()=>{
    expect(devVersionAt(Date.UTC(2026,8,11))).toBe(21859200);
    expect(devVersionAt(DEV_VERSION_EPOCH+2100000000*1000)).toBe(2100000000);
    for(const time of [DEV_VERSION_EPOCH,DEV_VERSION_EPOCH-1000,DEV_VERSION_EPOCH+2100000001*1000,NaN]) expect(()=>devVersionAt(time)).toThrow();
});
test('sequential runs and reruns wait for different seconds even when work is instantaneous',async()=>{
    let clock=DEV_VERSION_EPOCH+100050;
    const options={now:()=>clock,sleep:async(ms:number)=>{clock+=ms;}};
    const first=await allocateDevVersion(options);const retry=await allocateDevVersion(options);const nextCaller=await allocateDevVersion(options);
    expect([first,retry,nextCaller]).toEqual([101,102,103]);
});
test('clock rollback fails instead of reusing the allocated second',async()=>{
    let clock=DEV_VERSION_EPOCH+100050;
    await expect(allocateDevVersion({now:()=>clock,sleep:async()=>{clock-=1000;}})).rejects.toThrow('clock did not advance');
});
