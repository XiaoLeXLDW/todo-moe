import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve, sep } from 'path';
import { spawnSync } from 'child_process';

// This script is a CLI entry point (top-level code runs the whole check suite
// and may call process.exit), not a library, so it can't be imported directly
// in a test. Mirrors scripts/mindwtr-cli.test.ts: spawn the real script and
// assert on exit code + output instead.
const REPO_ROOT = join(import.meta.dir, '..');
const SCHEMA_PATH = join(REPO_ROOT, 'packages/core/src/cloudkit-production-schema.json');
const DESKTOP_RUST_STORAGE_PATH = join(REPO_ROOT, 'apps/desktop/src-tauri/src/storage.rs');
const SCRIPT_PATH = join(REPO_ROOT, 'scripts/check-synced-field-parity.ts');
const BUN_BIN = Bun.which('bun') || process.execPath;

const originalSchema = readFileSync(SCHEMA_PATH, 'utf8');
const originalDesktopRustStorage = readFileSync(DESKTOP_RUST_STORAGE_PATH, 'utf8');
const normalizedDesktopRustStorage = originalDesktopRustStorage.replace(/\r\n/g, '\n');
type ProductionRecord = { deployed: string[]; pendingProduction: string[] };
type ProductionSchema = { records: Record<string, ProductionRecord> };

// Safety net: restore the real, checked-in schema file even if a test throws
// before its own try/finally runs.
afterEach(() => {
    writeFileSync(SCHEMA_PATH, originalSchema);
    writeFileSync(DESKTOP_RUST_STORAGE_PATH, originalDesktopRustStorage);
});

const runCheck = (args: string[] = []) => (
    spawnSync(BUN_BIN, ['run', SCRIPT_PATH, ...args], { cwd: REPO_ROOT, encoding: 'utf8' })
);

const runCheckWithSchema = (schema: unknown, args: string[] = []) => {
    writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 4) + '\n');
    try {
        return runCheck(args);
    } finally {
        writeFileSync(SCHEMA_PATH, originalSchema);
    }
};

const runCheckWithDesktopRustStorage = (source: string) => {
    writeFileSync(DESKTOP_RUST_STORAGE_PATH, source);
    try {
        return runCheck();
    } finally {
        writeFileSync(DESKTOP_RUST_STORAGE_PATH, originalDesktopRustStorage);
    }
};

// Exercise the real CLI/read boundary without rewriting the working checkout.
// Native harness files are copied too so the fixture also works on macOS CI.
const runCheckWithLineEndings = (newline: '\n' | '\r\n', removeTaskMode = false) => {
    const fixtureRoot = resolve(REPO_ROOT, 'build/schema-parity-fixtures');
    mkdirSync(fixtureRoot, { recursive: true });
    const fixture = mkdtempSync(join(fixtureRoot, 'source-'));
    const paths = [
        'packages/core/src/types.ts',
        'packages/core/src/sqlite-schema.ts',
        'apps/desktop/src-tauri/src/storage.rs',
        'apps/mobile/modules/cloudkit-sync/ios/CloudKitRecordMapper.swift',
        'apps/desktop/src-tauri/src/macos_cloudkit_bridge.m',
        'apps/mcp-server/src/queries.ts',
        'packages/core/src/task-sync-schema.fixture.json',
        'scripts/swift-task-mapper-fixture-check.swift',
        'scripts/objc-task-mapper-fixture-check.m',
    ];
    try {
        for (const path of paths) {
            let source = readFileSync(join(REPO_ROOT, path), 'utf8').replace(/\r\n/g, '\n');
            if (removeTaskMode && path === 'packages/core/src/types.ts') {
                const changed = source.replace(/^ *taskMode\?: TaskMode;[^\n]*\n/m, '');
                expect(changed).not.toBe(source);
                source = changed;
            }
            const target = join(fixture, path);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, source.replace(/\n/g, newline));
        }
        return spawnSync(BUN_BIN, ['run', SCRIPT_PATH], { cwd: fixture, encoding: 'utf8' });
    } finally {
        if (!fixture.startsWith(fixtureRoot + sep)) throw new Error('Unexpected schema fixture cleanup target.');
        rmSync(fixture, { recursive: true, force: true });
    }
};

const parseSchema = (): ProductionSchema => JSON.parse(originalSchema);

const markAllDeployed = (schema: ProductionSchema) => {
    for (const record of Object.values(schema.records)) {
        record.deployed = [...record.deployed, ...record.pendingProduction];
        record.pendingProduction = [];
    }
};

describe('CloudKit production schema gate', () => {
    test('passes on the current repo state without --release-gate', () => {
        const result = runCheck();
        expect(result.status).toBe(0);
    });

    test('fails when a CloudKit-mapped field is listed in neither deployed nor pendingProduction', () => {
        const schema = parseSchema();
        schema.records.MindwtrTask.deployed = schema.records.MindwtrTask.deployed.filter((key) => key !== 'title');
        const result = runCheckWithSchema(schema);
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('missing from both lists');
        expect(result.stdout + result.stderr).toContain('MindwtrTask.title');
    });

    test('fails when a key is listed in both deployed and pendingProduction', () => {
        const schema = parseSchema();
        schema.records.MindwtrTask.pendingProduction.push('title');
        const result = runCheckWithSchema(schema);
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('listed in both deployed and pendingProduction');
    });

    test('fails when a listed key no longer exists in its CloudKit record schema', () => {
        const schema = parseSchema();
        schema.records.MindwtrPerson.deployed.push('notARealCloudKitKey');
        const result = runCheckWithSchema(schema);
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('stale');
        expect(result.stdout + result.stderr).toContain('MindwtrPerson.notARealCloudKitKey');
    });

    test('requires every synced CloudKit record type to be classified', () => {
        const schema = parseSchema();
        delete schema.records.MindwtrArea;
        const result = runCheckWithSchema(schema);
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('missing record type MindwtrArea');
    });

    test('records project taskSortBy as deployed in Production', () => {
        const schema = parseSchema();
        expect(schema.records.MindwtrProject.deployed).toContain('taskSortBy');
        expect(schema.records.MindwtrProject.pendingProduction).not.toContain('taskSortBy');
    });

    test('--release-gate fails while pendingProduction is non-empty', () => {
        const schema = parseSchema();
        markAllDeployed(schema);
        schema.records.MindwtrTask.deployed = schema.records.MindwtrTask.deployed.filter((key) => key !== 'title');
        schema.records.MindwtrTask.pendingProduction.push('title');
        const result = runCheckWithSchema(schema, ['--release-gate']);
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('pending Production deployment');
        expect(result.stdout + result.stderr).toContain('MindwtrTask.title');
    });

    test('--release-gate passes once pendingProduction is empty', () => {
        const schema = parseSchema();
        markAllDeployed(schema);
        const result = runCheckWithSchema(schema, ['--release-gate']);
        expect(result.status).toBe(0);
    });
});

describe('source checkout line endings', () => {
    test('LF and CRLF checkouts parse commented Task fields and native schemas identically', () => {
        for (const newline of ['\n', '\r\n'] as const) {
            const result = runCheckWithLineEndings(newline);
            expect(result.stderr).not.toContain('core Task interface');
            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Synced field parity check passed.');
        }
    });

    test('CRLF parsing still rejects an actually missing Task field', () => {
        const result = runCheckWithLineEndings('\r\n', true);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('missing: taskMode\n');
        expect(result.stderr).not.toContain('startTime expected optional, got missing');
    });
});

describe('desktop Rust FTS parity', () => {
    test('fails when per-connection SQLite busy timeout configuration drifts', () => {
        const source = normalizedDesktopRustStorage.replace(
            'busy_timeout(Duration::from_millis(SQLITE_BUSY_TIMEOUT_MS))',
            'busy_timeout(Duration::from_millis(1))',
        );
        expect(source).not.toBe(normalizedDesktopRustStorage);

        const result = runCheckWithDesktopRustStorage(source);

        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('5000ms busy_timeout connection configuration');
    });

    test('fails when a task FTS schema omits a core column', () => {
        const source = normalizedDesktopRustStorage.replace(
            "  assignedTo,\n  content=''",
            "  content=''",
        );
        expect(source).not.toBe(normalizedDesktopRustStorage);

        const result = runCheckWithDesktopRustStorage(source);

        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('desktop Rust tasks_fts schema');
        expect(result.stdout + result.stderr).toContain('assignedTo');
    });

    test('fails when a task FTS trigger omits a core value mapping', () => {
        const source = normalizedDesktopRustStorage.replace(
            "coalesce(new.location, '')",
            "''",
        );
        expect(source).not.toBe(normalizedDesktopRustStorage);

        const result = runCheckWithDesktopRustStorage(source);

        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain('desktop Rust tasks_ai trigger');
    });
});
