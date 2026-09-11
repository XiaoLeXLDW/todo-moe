import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareRestoredBackupDataForSync, serializeBackupData, validateBackupJson } from './backup-transfer';
import { SqliteAdapter, type SqliteClient } from './sqlite-adapter';
import type { AppData } from './types';

// Same real Node SQLite port used by sqlite-adapter.test.ts; never mock SQL.
type Statement = {
    run: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
    get: (...params: unknown[]) => unknown;
};
type Database = { exec: (sql: string) => void; prepare: (sql: string) => Statement; close: () => void };
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (file: string) => Database };
const createClient = (db: Database): SqliteClient => ({
    run: async (sql, params = []) => { db.prepare(sql).run(...params); },
    all: async <T>(sql: string, params: unknown[] = []) => db.prepare(sql).all(...params) as T[],
    get: async <T>(sql: string, params: unknown[] = []) => db.prepare(sql).get(...params) as T | undefined,
    exec: async (sql) => { db.exec(sql); },
});

const CREATED = '2026-09-01T08:00:00.000Z';
const EXPORTED = '2026-09-05T09:00:00.000Z';
const RESTORED = '2026-09-11T12:00:00.000Z';
const testFile = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(testFile), '../../..');
const evidenceRoot = resolve(repositoryRoot, process.env.MOE_BACKUP_EVIDENCE_DIR || 'artifacts/host-backup-restore');
const sharedSourcePaths = [
    'packages/core/src/backup-transfer.ts', 'packages/core/src/sqlite-adapter.ts', 'packages/core/src/sqlite-schema.ts',
    'packages/core/src/task-sync-schema.ts', 'packages/core/src/project-sync-schema.ts',
    'packages/core/src/section-sync-schema.ts', 'packages/core/src/area-sync-schema.ts', 'packages/core/src/recurrence.ts',
];
let runDir: string;
const results: Record<string, unknown> = {};
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const writeJson = (path: string, data: unknown) => writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });

/** All inputs are hand-authored fixtures; no user database, task or credential is read. */
function backupFixture(): AppData {
    return {
        areas: [{ id: 'area-qa', name: '测试文件夹', color: '#765099', icon: 'folder', order: 4,
            rev: 2, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED }],
        projects: [{ id: 'project-qa', title: '恢复验证清单', status: 'active', color: '#405ECB', order: 8,
            areaId: 'area-qa', areaTitle: '测试文件夹', tagIds: ['tag-qa'], taskSortBy: 'title',
            isSequential: true, sequentialScope: 'section', supportNotes: '人工样本，非真实任务',
            startDate: '2026-09-01', dueDate: '2026-09-30', rev: 3, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED }],
        sections: [
            { id: 'section-plan', projectId: 'project-qa', title: '计划', description: '尚待处理', order: 2,
                isCollapsed: false, rev: 3, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED },
            { id: 'section-done', projectId: 'project-qa', title: '完成记录', description: '保留完成状态', order: 7,
                isCollapsed: true, rev: 4, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED },
        ],
        tasks: [
            { id: 'task-next', title: '普通任务', status: 'next', projectId: 'project-qa', sectionId: 'section-plan',
                order: 20, boardOrder: 6, focusOrder: 3, isFocusedToday: true, priority: 'high', energyLevel: 'medium',
                tags: ['#qa', '#文档'], contexts: ['@desk'], description: '第一行\n第二行 "测试"',
                checklist: [{ id: 'check-one', title: '核对标题', isCompleted: true }, { id: 'check-two', title: '核对日期', isCompleted: false }],
                startTime: '2026-09-12T08:00:00.000Z', dueDate: '2026-09-13T09:30:00.000Z', reviewAt: '2026-09-12',
                timeEstimate: '30min', timeSpentMinutes: 12, rev: 4, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED },
            { id: 'task-done', title: '已经完成的任务', status: 'done', projectId: 'project-qa', sectionId: 'section-done',
                order: 10, priority: 'low', tags: ['#完成'], contexts: ['@home'], isFocusedToday: false,
                dueDate: '2026-09-03', completedAt: '2026-09-03T05:06:00.000Z', timeSpentMinutes: 25,
                checklist: [{ id: 'check-done', title: '已核对', isCompleted: true }],
                rev: 5, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED },
            { id: 'task-repeat', title: '每周重复任务', status: 'next', projectId: 'project-qa', sectionId: 'section-plan',
                order: 30, priority: 'medium', tags: ['#重复'], contexts: ['@desk'], isFocusedToday: false,
                startTime: '2026-09-14', dueDate: '2026-09-16',
                recurrence: { rule: 'weekly', strategy: 'strict', seriesId: 'fixture-series', byDay: ['MO', 'WE'],
                    rrule: 'FREQ=WEEKLY;BYDAY=MO,WE', count: 8, completedOccurrences: 2 },
                rev: 7, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED },
            // CONTEXT.md: a direct Area task has neither project nor section.
            { id: 'task-area', title: '直接归属 Area 的任务', status: 'waiting', areaId: 'area-qa',
                order: 5, tags: ['#area'], contexts: ['@home'], dueDate: '2026-09-20', reviewAt: '2026-09-19',
                rev: 9, revBy: 'fixture', createdAt: CREATED, updatedAt: EXPORTED },
        ],
        people: [],
        settings: { language: 'zh', theme: 'dark', gtd: { autoArchiveDays: 7 } },
    };
}

// Independent fixed expectations, written before execution. They are neither
// generated from a serializer result nor copied from data read out of SQLite.
const expected = {
    areas: [{ id: 'area-qa', name: '测试文件夹', color: '#765099', icon: 'folder', order: 4,
        rev: 41, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED }],
    projects: [{ id: 'project-qa', title: '恢复验证清单', status: 'active', color: '#405ECB', order: 8,
        areaId: 'area-qa', areaTitle: '测试文件夹', tagIds: ['tag-qa'], taskSortBy: 'title',
        isSequential: true, sequentialScope: 'section', supportNotes: '人工样本，非真实任务',
        startDate: '2026-09-01', dueDate: '2026-09-30', rev: 51, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED }],
    sections: [
        { id: 'section-plan', projectId: 'project-qa', title: '计划', description: '尚待处理', order: 2,
            isCollapsed: false, rev: 61, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED },
        { id: 'section-done', projectId: 'project-qa', title: '完成记录', description: '保留完成状态', order: 7,
            isCollapsed: true, rev: 5, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED },
    ],
    tasks: [
        { id: 'task-next', title: '普通任务', status: 'next', projectId: 'project-qa', sectionId: 'section-plan',
            order: 20, boardOrder: 6, focusOrder: 3, isFocusedToday: true, priority: 'high', energyLevel: 'medium',
            tags: ['#qa', '#文档'], contexts: ['@desk'], description: '第一行\n第二行 "测试"',
            checklist: [{ id: 'check-one', title: '核对标题', isCompleted: true }, { id: 'check-two', title: '核对日期', isCompleted: false }],
            startTime: '2026-09-12T08:00:00.000Z', dueDate: '2026-09-13T09:30:00.000Z', reviewAt: '2026-09-12',
            timeEstimate: '30min', timeSpentMinutes: 12, rev: 21, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED },
        { id: 'task-done', title: '已经完成的任务', status: 'done', projectId: 'project-qa', sectionId: 'section-done',
            order: 10, priority: 'low', tags: ['#完成'], contexts: ['@home'], isFocusedToday: false,
            dueDate: '2026-09-03', completedAt: '2026-09-03T05:06:00.000Z', timeSpentMinutes: 25,
            checklist: [{ id: 'check-done', title: '已核对', isCompleted: true }],
            rev: 6, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED },
        { id: 'task-repeat', title: '每周重复任务', status: 'next', projectId: 'project-qa', sectionId: 'section-plan',
            order: 30, priority: 'medium', tags: ['#重复'], contexts: ['@desk'], isFocusedToday: false,
            startTime: '2026-09-14', dueDate: '2026-09-16',
            // recurrence.ts embeds explicit series identity in RRULE on load;
            // independently specified by recurrence.test.ts's series-id cases.
            recurrence: { rule: 'weekly', strategy: 'strict', seriesId: 'fixture-series', byDay: ['MO', 'WE'],
                rrule: 'FREQ=WEEKLY;BYDAY=MO,WE;X-MINDWTR-SERIES-ID=fixture-series', count: 8, completedOccurrences: 2 },
            rev: 8, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED },
        { id: 'task-area', title: '直接归属 Area 的任务', status: 'waiting', areaId: 'area-qa',
            order: 5, tags: ['#area'], contexts: ['@home'], dueDate: '2026-09-20', reviewAt: '2026-09-19',
            rev: 10, revBy: 'backup-restore', createdAt: CREATED, updatedAt: RESTORED },
    ],
    // Independent SQL expectations pin NULL, not just truthiness in a loaded DTO.
    directTaskContainers: [
        { id: 'task-area', areaId: 'area-qa', projectId: null, sectionId: null },
        { id: 'task-done', areaId: null, projectId: 'project-qa', sectionId: 'section-done' },
        { id: 'task-next', areaId: null, projectId: 'project-qa', sectionId: 'section-plan' },
        { id: 'task-repeat', areaId: null, projectId: 'project-qa', sectionId: 'section-plan' },
    ],
    settings: { language: 'zh', theme: 'dark', gtd: { autoArchiveDays: 7 }, pendingRemoteWriteAt: RESTORED },
};

beforeAll(() => {
    mkdirSync(evidenceRoot, { recursive: true });
    runDir = mkdtempSync(join(evidenceRoot, 'run-'));
    writeJson(join(runDir, 'expected-critical-fields.json'), expected);
    console.log(`Host backup/restore evidence: ${runDir}`);
});
afterAll(() => {
    writeJson(join(runDir, 'result.json'), {
        generatedAt: new Date().toISOString(),
        testSource: { path: 'packages/core/src/backup-sqlite-roundtrip.integration.test.ts', sha256: hash(readFileSync(testFile)) },
        sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim(),
        sharedSourceScope: {
            scope: 'shared core entrypoints, SQLite schema/codecs and recurrence normalization; host composition only',
            files: sharedSourcePaths.map((path) => ({ path, sha256: hash(readFileSync(join(repositoryRoot, path))) })),
        },
        runtime: process.version, sqliteEngine: 'node:sqlite DatabaseSync', timezone: process.env.TZ,
        fixtureOnly: true, apkExecuted: false, evidenceDirectoryIsNotApkSourceIdentity: true,
        scope: 'host shared-component integration; not Android import control flow or an APK rerun', results,
    });
});

describe('host backup JSON to SQLite restore', () => {
    it('restores fixed hierarchy, completion and recurrence fields after closing and reopening a real database without changing backup bytes', async () => {
        const directory = join(runDir, 'roundtrip');
        mkdirSync(directory);
        const backupPath = join(directory, 'source-backup.json');
        writeFileSync(backupPath, serializeBackupData(backupFixture()), { flag: 'wx' });
        const before = readFileSync(backupPath);
        const sourceHash = hash(before);
        const validation = validateBackupJson(readFileSync(backupPath, 'utf8'), { fileName: 'source-backup.json' });
        expect(validation.valid, validation.errors.join('; ')).toBe(true);
        expect(validation.errors).toEqual([]);
        expect(validation.data).not.toBeNull();
        const databasePath = join(directory, 'restored.sqlite');
        let db: Database | undefined = new DatabaseSync(databasePath);
        try {
            const adapter = new SqliteAdapter(createClient(db));
            const previous = backupFixture();
            previous.areas[0] = { ...previous.areas[0], name: '旧本地文件夹', rev: 40 };
            previous.projects[0] = { ...previous.projects[0], title: '旧本地清单', rev: 50 };
            previous.sections = [{ ...previous.sections[0], title: '旧本地分组', rev: 60 }];
            previous.tasks = [{ ...previous.tasks[0], title: '旧本地任务', rev: 20 }];
            await adapter.saveData(previous);
            const prepared = prepareRestoredBackupDataForSync(validation.data!, {
                previousData: await adapter.getData(), restoredAt: RESTORED,
            });
            await adapter.saveData(prepared);
            db.close();
            db = undefined;

            // New connection and new adapter: no in-memory adapter snapshot can satisfy this read.
            db = new DatabaseSync(databasePath);
            const loaded = await new SqliteAdapter(createClient(db)).getData();
            writeJson(join(directory, 'restored-after-reopen.json'), loaded);
            for (const kind of ['areas', 'projects', 'sections', 'tasks'] as const) {
                expect(loaded[kind].map((record) => record.id).sort()).toEqual(expected[kind].map((record) => record.id).sort());
                for (const record of expected[kind]) {
                    expect(loaded[kind].find((item) => item.id === record.id), `${kind}/${record.id}`).toMatchObject(record);
                }
            }
            expect(loaded.people).toEqual([]);
            expect(loaded.settings).toMatchObject(expected.settings);
            for (const id of ['task-next', 'task-done', 'task-repeat']) {
                expect(loaded.tasks.find((task) => task.id === id)?.areaId, `${id} must not gain a direct area`).toBeUndefined();
            }
            expect(loaded.tasks.find((task) => task.id === 'task-area')?.projectId).toBeUndefined();
            expect(loaded.tasks.find((task) => task.id === 'task-area')?.sectionId).toBeUndefined();
            expect(db.prepare('SELECT id, areaId, projectId, sectionId FROM tasks ORDER BY id').all()).toEqual(expected.directTaskContainers);
            expect(loaded.tasks.find((task) => task.id === 'task-next')?.recurrence).toBeUndefined();
            expect(loaded.tasks.find((task) => task.id === 'task-next')?.completedAt).toBeUndefined();
            expect(loaded.tasks.find((task) => task.id === 'task-repeat')?.completedAt).toBeUndefined();
            expect(loaded.tasks.some((task) => task.deletedAt || task.purgedAt)).toBe(false);
            expect([...loaded.tasks].sort((a, b) => a.order! - b.order!).map((task) => task.id)).toEqual(['task-area', 'task-done', 'task-next', 'task-repeat']);
            expect([...loaded.sections].sort((a, b) => a.order - b.order).map((section) => section.id)).toEqual(['section-plan', 'section-done']);
            const after = readFileSync(backupPath);
            expect(after.equals(before)).toBe(true);
            expect(hash(after)).toBe(sourceHash);
            results.roundtrip = { status: 'passed', backupSha256Before: sourceHash, backupSha256After: hash(after),
                sourceBytes: before.length, reopenedConnection: true, directContainerExclusivity: true,
                exactTaskIds: ['task-area', 'task-done', 'task-next', 'task-repeat'] };
        } catch (error) {
            results.roundtrip = { status: 'failed', error: error instanceof Error ? error.message : String(error) };
            throw error;
        } finally { db?.close(); }
    });

    it('rejects corrupt JSON at the real parser boundary while leaving an existing database and original backup byte-identical', async () => {
        const directory = join(runDir, 'invalid-json');
        mkdirSync(directory);
        const databasePath = join(directory, 'existing.sqlite');
        const originalPath = join(directory, 'original-backup.json');
        const invalidPath = join(directory, 'corrupt-backup.json');
        const baseline: AppData = {
            tasks: [{ id: 'keep-task', title: '不得覆盖的人工样本', status: 'next', tags: ['#保留'], contexts: ['@test'],
                order: 9, rev: 14, revBy: 'existing-fixture', createdAt: CREATED, updatedAt: EXPORTED }],
            projects: [], sections: [], areas: [], people: [], settings: { language: 'zh' },
        };
        let db: Database | undefined = new DatabaseSync(databasePath);
        try {
            await new SqliteAdapter(createClient(db)).saveData(baseline);
            db.close();
            db = undefined;
            writeFileSync(originalPath, serializeBackupData(baseline), { flag: 'wx' });
            writeFileSync(invalidPath, '{"tasks": [not-valid-json', { flag: 'wx' });
            const databaseBefore = readFileSync(databasePath);
            const backupBefore = readFileSync(originalPath);
            const invalidBefore = readFileSync(invalidPath);

            // No invented restore controller or test-only save guard: this is only
            // the production parser's rejection boundary, not an Android flow test.
            const rejected = validateBackupJson(readFileSync(invalidPath, 'utf8'));
            expect(rejected.valid).toBe(false);
            expect(rejected.data).toBeNull();
            expect(rejected.metadata).toBeNull();
            expect(rejected.errors).toEqual([expect.stringContaining('Backup file is not valid JSON')]);
            const databaseAfterParser = readFileSync(databasePath);
            expect(databaseAfterParser.equals(databaseBefore)).toBe(true);
            expect(readFileSync(originalPath).equals(backupBefore)).toBe(true);
            expect(readFileSync(invalidPath).equals(invalidBefore)).toBe(true);
            expect(hash(readFileSync(databasePath))).toBe(hash(databaseBefore));
            expect(hash(readFileSync(originalPath))).toBe(hash(backupBefore));

            db = new DatabaseSync(databasePath);
            const loaded = await new SqliteAdapter(createClient(db)).getData();
            expect(loaded.tasks.map((task) => task.id)).toEqual(['keep-task']);
            expect(loaded.tasks[0]).toMatchObject({ id: 'keep-task', title: '不得覆盖的人工样本', status: 'next',
                tags: ['#保留'], contexts: ['@test'], order: 9, rev: 14, revBy: 'existing-fixture', createdAt: CREATED, updatedAt: EXPORTED });
            expect(loaded.projects).toEqual([]);
            expect(loaded.sections).toEqual([]);
            expect(loaded.areas).toEqual([]);
            expect(loaded.settings.language).toBe('zh');
            writeJson(join(directory, 'existing-after-parser-rejection.json'), loaded);
            results.invalidJson = { status: 'passed', boundary: 'validateBackupJson only; no Android importer invoked',
                parserErrors: rejected.errors, originalBackupSha256: hash(backupBefore), databaseSha256BeforeParser: hash(databaseBefore),
                databaseSha256AfterParser: hash(databaseAfterParser), originalBytesPreserved: true };
        } catch (error) {
            results.invalidJson = { status: 'failed', error: error instanceof Error ? error.message : String(error) };
            throw error;
        } finally { db?.close(); }
    });
});
