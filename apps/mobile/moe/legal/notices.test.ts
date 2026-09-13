import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bundledNotices } from './notices.generated';

describe('offline distribution notices', () => {
    it('ships the complete unmodified project license', () => {
        expect(bundledNotices.find(item => item.source === 'LICENSE')?.text)
            .toBe(readFileSync(resolve(__dirname, '../../../../LICENSE'), 'utf8').replace(/\r\n/g, '\n'));
        expect(readFileSync(resolve(__dirname, '../../modules/moe-glass/android/src/main/assets/todo-moe-legal/LICENSE-AGPL-3.0.txt'), 'utf8').replace(/\r\n/g, '\n'))
            .toBe(bundledNotices.find(item => item.source === 'LICENSE')?.text);
    });
    it('retains the copied glass licenses and source acknowledgments verbatim', () => {
        for (const file of ['Apache-2.0.txt', 'NOTICE.txt', 'THIRD_PARTY.md', 'SUKISU-COMPOSE-SOURCES.md']) {
            const source = `apps/mobile/modules/moe-glass/android/src/main/assets/moe-glass/${file}`;
            expect(bundledNotices.find(item => item.source === source)?.text)
                .toBe(readFileSync(resolve(__dirname, '../../../../', source), 'utf8').replace(/\r\n/g, '\n'));
        }
    });
    it('has unique offline reader entries', () => {
        expect(new Set(bundledNotices.map(item => item.source)).size).toBe(bundledNotices.length);
    });
});
