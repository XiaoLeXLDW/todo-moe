import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const workflow = () => parse(readFileSync('.github/workflows/native-platform-ci.yml', 'utf8'));
const appSteps = [
  'Setup Ruby', 'Install pinned CocoaPods', 'Generate iOS native project',
  'Validate generated Watch Xcode project', 'Install CocoaPods dependencies',
  'Compile Watch app and complications', 'Compile iOS app and native Swift modules',
];

test('Android-only forks retain Swift contracts without generating an unsupported iOS app', () => {
  const steps = workflow().jobs['ios-native'].steps;
  for (const name of appSteps) {
    const step = steps.find((item: { name: string }) => item.name === name);
    expect(step, name).toBeDefined();
    const enabled = (repository: string) => step.if === undefined
      ? true : new Function('github', `return Boolean(${step.if})`)({ repository });
    expect(enabled('XiaoLeXLDW/todo-moe'), name).toBe(false);
    expect(enabled('dongdongbh/Mindwtr'), name).toBe(true);
  }
  for (const name of [
    'Typecheck Watch receiver against the iOS SDK', 'Run attachment installer Swift recovery tests',
    'Run File Sync stable-lock Swift tests', 'Run CloudKit attachment error classifier tests',
    'Run Watch payload and receipt recovery tests', 'Run Watch outbox retry tests',
  ]) {
    const step = steps.find((item: { name: string }) => item.name === name);
    expect(step, name).toBeDefined();
    expect(step.if, name).toBeUndefined();
  }
});

test('Android compile remains selected for changed Android code on the fork', () => {
  const condition = workflow().jobs['android-native'].if;
  const enabled = new Function('github', 'needs', `return Boolean(${condition})`);
  expect(enabled({ repository: 'XiaoLeXLDW/todo-moe' }, { changes: { outputs: { android: 'true' } } })).toBe(true);
  expect(enabled({ repository: 'XiaoLeXLDW/todo-moe' }, { changes: { outputs: { android: 'false' } } } )).toBe(false);
});
