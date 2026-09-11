import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
const { rewriteTree } = require('../../apps/mobile/moe/brand/with-todo-moe.cjs');
test('final native identity rewrite covers manifest/actions/links and remains idempotent across variants',()=>{
    const root=resolve(import.meta.dir,'../../build/moe/native-fixtures');mkdirSync(root,{recursive:true});const directory=mkdtempSync(join(root,'native-'));
    try {
        writeFileSync(join(directory,'AndroidManifest.xml'),'<data android:scheme="mindwtr"/><action android:name="tech.dongdongbh.mindwtr.action.CAPTURE"/><activity android:name="tech.dongdongbh.mindwtr.widget.WidgetTapActivity"/>');
        writeFileSync(join(directory,'MainActivity.kt'),'.scheme("mindwtr")\n"tech.dongdongbh.mindwtr.action.ACTIVATE_CONTEXT"');
        writeFileSync(join(directory,'AlarmUtil.java'),'intent.setData(Uri.parse("mindwtr:///focus"));');
        rewriteTree(directory,'todomoe-dev','io.github.xiaolexldw.todomoe.dev');
        const manifest=readFileSync(join(directory,'AndroidManifest.xml'),'utf8');
        expect(manifest).toContain('android:scheme="todomoe-dev"');expect(manifest).toContain('io.github.xiaolexldw.todomoe.dev.action.CAPTURE');expect(manifest).toContain('tech.dongdongbh.mindwtr.widget.WidgetTapActivity');
        expect(readFileSync(join(directory,'MainActivity.kt'),'utf8')).toContain('.scheme("todomoe-dev")');
        const alarm=readFileSync(join(directory,'AlarmUtil.java'),'utf8');expect(alarm).toContain('Uri.parse("todomoe-dev:///focus")');
        rewriteTree(directory,'todomoe-dev','io.github.xiaolexldw.todomoe.dev');expect(readFileSync(join(directory,'AlarmUtil.java'),'utf8')).toBe(alarm);
        rewriteTree(directory,'todomoe','io.github.xiaolexldw.todomoe');expect(readFileSync(join(directory,'AlarmUtil.java'),'utf8')).toContain('Uri.parse("todomoe:///focus")');expect(readFileSync(join(directory,'AndroidManifest.xml'),'utf8')).not.toContain('.dev.action.');
    } finally {if(!directory.startsWith(root+sep))throw new Error('Invalid temporary target');rmSync(directory,{recursive:true,force:true});}
});
