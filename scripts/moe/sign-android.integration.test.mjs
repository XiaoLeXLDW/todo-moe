import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Explicit host-only run; ordinary CI discovery must not need an APK or a key.
// PowerShell: $env:MOE_SIGNING_INTEGRATION='1'; node --test scripts/moe/sign-android.integration.test.mjs
// Uses an ephemeral TEST certificate. Never installs, uploads or publishes.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileDigest = (file) => digest(readFileSync(file));
const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

function assertInside(parent, target) {
  const rel = relative(resolve(parent), resolve(target));
  assert.ok(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`), 'Fixture path escaped its owned directory.');
}

function removeOwnedFixture(parent, fixture) {
  // Only a directory returned by this run's mkdtemp reaches this helper.
  assertInside(realpathSync(parent), realpathSync(fixture));
  assert.ok(basename(fixture).startsWith('run-') && !lstatSync(fixture).isSymbolicLink());
  rmSync(fixture, { recursive: true, force: true });
}

const testName = 'real Android signing rejects identity and notes tampering, using only an ephemeral test key';
// Bun 1.3's node:test compatibility does not honor all Node test options or
// implement nested subtests. Do not even register the heavy callback there.
if (process.env.MOE_SIGNING_INTEGRATION !== '1' || process.versions.bun) {
  test.skip(`${testName} (explicit Node host run only)`, () => {});
} else test(testName, {
  timeout: 240_000,
}, async (t) => {
  const unsignedDir = resolve(process.env.MOE_UNSIGNED_TEST_DIR || join(root, 'artifacts/0.1.0-stable-vc1-unsigned'));
  const sourceManifestPath = join(unsignedDir, 'build-manifest.json');
  const sourceManifestBytes = readFileSync(sourceManifestPath);
  const sourceManifest = JSON.parse(sourceManifestBytes);
  assert.equal(sourceManifest.artifacts.length, 1);
  const sourceArtifact = sourceManifest.artifacts[0];
  assert.equal(basename(sourceArtifact.file), sourceArtifact.file);
  const sourceApk = join(unsignedDir, sourceArtifact.file);
  const sourceApkDigest = fileDigest(sourceApk);
  assert.equal(sourceApkDigest, sourceArtifact.sha256, 'The original unsigned test APK checksum must match.');
  assert.equal(sourceManifest.versionCode, 1, 'This explicit fixture verifies the supplied vc1 test APK.');

  const fixtureParent = join(root, '.tools/signing-integration-fixtures');
  mkdirSync(fixtureParent, { recursive: true });
  assertInside(realpathSync(root), realpathSync(fixtureParent));
  const fixture = mkdtempSync(join(fixtureParent, 'run-'));
  assertInside(fixtureParent, fixture);
  t.after(() => {
    try {
      assert.equal(fileDigest(sourceApk), sourceApkDigest, 'The delivery APK must remain unchanged.');
      assert.deepEqual(readFileSync(sourceManifestPath), sourceManifestBytes, 'The delivery manifest must remain unchanged.');
    } finally {
      removeOwnedFixture(fixtureParent, fixture);
    }
  });

  const temporary = join(fixture, 'tmp');
  mkdirSync(temporary);
  const javaHome = resolve(process.env.MOE_TEST_JAVA_HOME || join(root, '.tools/jdk21'));
  const androidHome = resolve(process.env.MOE_TEST_ANDROID_HOME || join(root, '.tools/android-sdk'));
  const suffix = process.platform === 'win32' ? '.exe' : '';
  const java = join(javaHome, 'bin', `java${suffix}`);
  const keytool = join(javaHome, 'bin', `keytool${suffix}`);
  const jar = join(javaHome, 'bin', `jar${suffix}`);
  const sdkTools = join(androidHome, 'build-tools/36.0.0');
  const apksignerJar = join(sdkTools, 'lib/apksigner.jar');
  const aapt = join(sdkTools, `aapt${suffix}`);
  const zipalign = join(sdkTools, `zipalign${suffix}`);
  for (const tool of [java, keytool, jar, apksignerJar, aapt, zipalign]) assert.ok(existsSync(tool), `Missing existing host tool: ${basename(tool)}`);

  const password = randomBytes(32).toString('hex');
  const env = { ...process.env };
  // Ignore any ambient production signing material or JVM agents/options.
  for (const key of ['MOE_KEYSTORE_BASE64', 'MOE_KEYSTORE_PASSWORD', 'MOE_KEY_PASSWORD', 'MOE_KEY_ALIAS', 'MOE_CERT_SHA256', 'JAVA_TOOL_OPTIONS', 'JDK_JAVA_OPTIONS', '_JAVA_OPTIONS']) delete env[key];
  Object.assign(env, {
    JAVA_HOME: javaHome, ANDROID_HOME: androidHome, ANDROID_SDK_ROOT: androidHome,
    TEMP: temporary, TMP: temporary, TMPDIR: temporary,
    MOE_FIXTURE_PASSWORD: password,
    JAVA_TOOL_OPTIONS: `-Djava.io.tmpdir="${temporary.replaceAll('\\', '/')}"`,
  });

  function run(binary, args, overrides = {}) {
    const result = spawnSync(binary, args, { cwd: fixture, env, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024, ...overrides });
    // Never forward raw tool output: private material lives only in env/files.
    assert.equal(result.error, undefined, `${basename(binary)} could not start (tool output withheld).`);
    assert.equal(result.signal, null, `${basename(binary)} was interrupted (tool output withheld).`);
    assert.equal(result.status, 0, `${basename(binary)} failed (tool output withheld).`);
    return result.stdout;
  }

  const keystore = join(fixture, 'test-signing.p12');
  const certificate = join(fixture, 'test-signing.der');
  run(keytool, ['-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', keystore,
    '-alias', 'fixture-signer', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '2',
    '-dname', 'CN=Todo Moe host signing TEST ONLY,O=Ephemeral fixture',
    '-storepass:env', 'MOE_FIXTURE_PASSWORD', '-keypass:env', 'MOE_FIXTURE_PASSWORD']);
  run(keytool, ['-exportcert', '-keystore', keystore, '-alias', 'fixture-signer',
    '-storepass:env', 'MOE_FIXTURE_PASSWORD', '-file', certificate]);
  const certBytes = readFileSync(certificate);
  const certificateSha256 = digest(certBytes);
  assert.equal(new X509Certificate(certBytes).fingerprint256.replaceAll(':', '').toLowerCase(), certificateSha256);
  const keystoreBase64 = readFileSync(keystore).toString('base64');
  const signingEnv = {
    ...env, MOE_APPROVED_SHA: sourceManifest.sourceSha, MOE_VERSION_CODE: String(sourceManifest.versionCode),
    MOE_KEYSTORE_BASE64: keystoreBase64, MOE_KEYSTORE_PASSWORD: password,
    MOE_KEY_PASSWORD: password, MOE_KEY_ALIAS: 'fixture-signer', MOE_CERT_SHA256: certificateSha256,
  };

  const versionRecordContent = '# Host signing fixture\n\nArtificial fixture only. No device acceptance or release claim.\n';
  const defaultNotes = {
    schemaVersion: 1, version: sourceManifest.version,
    changes: ['Exercise the real Android signing orchestration with an ephemeral TEST certificate.'],
    knownIssues: [],
    supportedDevices: ['Host fixture only; no device installation is performed.'],
    validation: ['Synthetic release-note input for integration assertions, not an acceptance statement.'],
    versionRecord: 'docs/todo-moe/docs/versions/v0.1.0.md',
    versionRecordContent, versionRecordSha256: digest(Buffer.from(versionRecordContent, 'utf8')),
  };

  function prepareCase(name, { changeManifest, changeNotes, changeApk } = {}) {
    const caseRoot = join(fixture, name);
    const input = join(caseRoot, 'input');
    const output = join(caseRoot, 'output');
    mkdirSync(input, { recursive: true });
    const apk = join(input, sourceArtifact.file);
    copyFileSync(sourceApk, apk);
    const notes = structuredClone(defaultNotes);
    changeNotes?.(notes);
    const notesPath = join(input, 'release-notes-input.json');
    writeJson(notesPath, notes);
    const manifest = structuredClone(sourceManifest);
    manifest.releaseNotes = { file: 'release-notes-input.json', sha256: fileDigest(notesPath) };
    if (changeApk) {
      changeApk(apk, caseRoot);
      manifest.artifacts[0].sha256 = fileDigest(apk);
      manifest.artifacts[0].bytes = readFileSync(apk).length;
    }
    changeManifest?.(manifest);
    writeJson(join(input, 'build-manifest.json'), manifest);
    return { input, output, manifest, notes };
  }

  function invokeSigner(input, output, overrides = {}) {
    const result = spawnSync(process.execPath, [join(root, 'scripts/moe/sign-android.mjs'), input, output], {
      cwd: root, env: { ...signingEnv, ...overrides }, encoding: 'utf8', timeout: 90_000, maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(result.error, undefined, 'Signer could not start (tool output withheld).');
    assert.equal(result.signal, null, 'Signer was interrupted (tool output withheld).');
    // A failure must never echo either generated secret into captured output.
    for (const secret of [password, keystoreBase64]) {
      assert.ok(!`${result.stdout}\n${result.stderr}`.includes(secret), 'Signer exposed a fixture secret.');
    }
    return result;
  }

  await t.test('a valid APK is signed by the generated test certificate and notes are hash-bound', () => {
    const { input, output } = prepareCase('valid');
    const result = invokeSigner(input, output);
    assert.equal(result.status, 0, 'Valid fixture signing failed; no credential output is forwarded.');
    const release = JSON.parse(readFileSync(join(output, 'release-manifest.json'), 'utf8'));
    assert.equal(release.certificateSha256, certificateSha256);
    assert.equal(release.unsignedSha256, sourceApkDigest);
    assert.equal(release.sourceSha, sourceManifest.sourceSha);
    assert.equal(release.artifacts.length, 1);
    const signedApk = join(output, release.artifacts[0].file);
    assertInside(output, signedApk);
    const actual = run(java, ['-jar', apksignerJar, 'verify', '--verbose', '--print-certs', signedApk]);
    const certs = [...actual.matchAll(/Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)/gi)];
    assert.equal(certs.length, 1);
    assert.equal(certs[0][1].toLowerCase(), certificateSha256, 'APK must carry the independently exported temporary certificate.');
    assert.equal(fileDigest(signedApk), release.artifacts[0].sha256);
    run(zipalign, ['-c', '-P', '16', '4', signedApk]);
    assert.match(run(aapt, ['dump', 'badging', signedApk]), /package: name='io\.github\.xiaolexldw\.todomoe' versionCode='1' versionName='0\.1\.0'/);
    assert.equal(release.releaseNotes.file, 'RELEASE-NOTES.md');
    const renderedNotes = readFileSync(join(output, 'RELEASE-NOTES.md'), 'utf8');
    assert.equal(digest(Buffer.from(renderedNotes)), release.releaseNotes.sha256);
    assert.equal(release.releaseNotes.versionRecord, defaultNotes.versionRecord);
    assert.equal(release.releaseNotes.versionRecordSha256, defaultNotes.versionRecordSha256);
    assert.ok(renderedNotes.includes(versionRecordContent.trim()), 'Version record must be embedded in the rendered notes.');
    assert.ok(renderedNotes.includes(defaultNotes.changes[0]));
    assert.ok(renderedNotes.includes(defaultNotes.validation[0]));
    t.diagnostic(`Verified temporary TEST certificate SHA-256 ${certificateSha256}; original unsigned APK SHA-256 ${sourceApkDigest}.`);
  });

  const failures = [
    { name: 'wrong-certificate', env: { MOE_CERT_SHA256: '0'.repeat(64) }, reason: /certificate|fingerprint/i },
    { name: 'wrong-apk-hash', changeManifest: (m) => { m.artifacts[0].sha256 = '0'.repeat(64); }, reason: /hash|checksum/i },
    { name: 'wrong-declared-package', changeManifest: (m) => { m.androidPackage = 'invalid.fixture.package'; }, reason: /identity|package/i },
    { name: 'old-version-code', env: { MOE_VERSION_CODE: '0' }, changeManifest: (m) => { m.versionCode = 0; }, reason: /identity|version|code/i },
    { name: 'actual-version-code-mismatch', env: { MOE_VERSION_CODE: '2' }, changeManifest: (m) => { m.versionCode = 2; }, reason: /Actual APK package\/version disagrees with the approved manifest\./ },
    { name: 'actual-version-name-mismatch', changeManifest: (m) => { m.version = '0.2.0'; }, changeNotes: (n) => { n.version = '0.2.0'; }, reason: /Actual APK package\/version disagrees with the approved manifest\./ },
    { name: 'wrong-notes-hash', changeManifest: (m) => { m.releaseNotes.sha256 = '0'.repeat(64); }, reason: /notes|hash|checksum/i },
    { name: 'wrong-notes-version', changeNotes: (n) => { n.version = '0.0.9'; }, reason: /version|notes/i },
    { name: 'empty-required-changes', changeNotes: (n) => { n.changes = []; }, reason: /changes|notes|required|empty/i },
    { name: 'empty-required-validation', changeNotes: (n) => { n.validation = []; }, reason: /validation|notes|required|empty/i },
    { name: 'empty-supported-devices', changeNotes: (n) => { n.supportedDevices = []; }, reason: /devices|notes|required|empty/i },
    { name: 'wrong-version-record-hash', changeNotes: (n) => { n.versionRecordSha256 = '0'.repeat(64); }, reason: /record|hash|checksum/i },
    { name: 'escaping-version-record', changeNotes: (n) => { n.versionRecord = 'docs/todo-moe/docs/versions/../secrets.md'; }, reason: /record|path|notes/i },
    {
      name: 'wrong-actual-apk-package', reason: /package|identity|version/i,
      changeApk: (apk, caseRoot) => {
        const patchDir = join(caseRoot, 'manifest-patch');
        mkdirSync(patchDir);
        run(jar, ['--extract', '--file', apk, 'AndroidManifest.xml'], { cwd: patchDir });
        const manifestPath = join(patchDir, 'AndroidManifest.xml');
        const bytes = readFileSync(manifestPath);
        let matches = 0;
        const wrongPackage = 'io.github.xiaolexldw.todomox';
        for (const encoding of ['utf8', 'utf16le']) {
          const before = Buffer.from(sourceManifest.androidPackage, encoding);
          const after = Buffer.from(wrongPackage, encoding);
          assert.equal(before.length, after.length);
          for (let at = bytes.indexOf(before); at >= 0; at = bytes.indexOf(before, at + after.length)) { after.copy(bytes, at); matches += 1; }
        }
        assert.ok(matches > 0, 'Could not locate the binary-manifest fixture package name.');
        writeFileSync(manifestPath, bytes);
        run(jar, ['--update', '--file', apk, '-C', patchDir, 'AndroidManifest.xml']);
        assert.ok(run(aapt, ['dump', 'badging', apk]).includes(`package: name='${wrongPackage}'`), 'Tampered fixture APK must still parse before signer validation.');
      },
    },
  ];
  for (const scenario of failures) {
    await t.test(`rejects ${scenario.name} without producing a release manifest`, () => {
      const { input, output } = prepareCase(scenario.name, scenario);
      const result = invokeSigner(input, output, scenario.env);
      assert.notEqual(result.status, 0, `${scenario.name} unexpectedly succeeded.`);
      assert.match(result.stderr, scenario.reason, `${scenario.name} rejected for an unexpected reason; tool output withheld.`);
      assert.equal(existsSync(join(output, 'release-manifest.json')), false, 'Rejected input must not have a release manifest.');
    });
  }
});
