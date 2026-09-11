import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { validateMobileAuditReport } from "./validate-mobile-npm-audit.js";

const rootRequire = createRequire(import.meta.url);
const rootDirectory = dirname(rootRequire.resolve("../../package.json"));
const readWorkflow = () => readFileSync(".github/workflows/dependency-audit.yml", "utf8").replace(/\r\n/g, "\n");

const IMAGE_SIZE_ADVISORIES = ["GHSA-5p2g-fcmc-qvqq", "GHSA-w3rx-r6r6-pgpr"];

const REQUIRED_PULL_REQUEST_PATHS = [
  ".github/workflows/dependency-audit.yml",
  "**/package-lock.json",
  "apps/*/package.json",
  "apps/desktop/src-tauri/Cargo.lock",
  "apps/desktop/src-tauri/Cargo.toml",
  "bun.lock",
  "package.json",
  "packages/*/package.json",
  "scripts/ci/validate-dependency-audit.test.js",
  "scripts/ci/validate-mobile-npm-audit.js",
  "tools/eas-cli/package.json",
];

const TRACKED_NPM_LOCKFILES = execFileSync(
  "git",
  ["ls-files", "*package-lock.json"],
  { encoding: "utf8" },
).trim().split("\n").filter(Boolean).sort();

test("Bun audit exceptions stay limited to Metro's unpatched build dependency", () => {
  const workflow = readWorkflow();
  const lockfile = readFileSync("bun.lock", "utf8");

  for (const advisory of IMAGE_SIZE_ADVISORIES) {
    expect(workflow.match(new RegExp(`--ignore=${advisory}`, "g"))).toHaveLength(1);
  }
  expect(workflow.match(/--ignore=/g)).toHaveLength(IMAGE_SIZE_ADVISORIES.length);

  const imageSizeReferences = lockfile.match(/"image-size": "[^"]+"/g) ?? [];
  expect(imageSizeReferences).toEqual([
    '"image-size": "bin/image-size.js"',
    '"image-size": "^1.0.2"',
  ]);
  expect(lockfile).toContain('["image-size@1.2.1"');
  expect(lockfile).toMatch(
    /\["metro@[^\n]+"[^\n]+"dependencies": \{[^\n]+"image-size": "\^1\.0\.2"/,
  );
});

test("mobile query parsing keeps the pinned decoder and idempotent postinstall repair for every real consumer", () => {
  const rootManifest = JSON.parse(readFileSync("package.json", "utf8"));
  const mobileManifest = JSON.parse(readFileSync("apps/mobile/package.json", "utf8"));
  const mobileLock = JSON.parse(readFileSync("apps/mobile/package-lock.json", "utf8"));
  const bunLock = readFileSync("bun.lock", "utf8");
  const compatibilityPatch = readFileSync(
    "patches/query-string@7.1.3.patch",
    "utf8",
  );

  expect(rootManifest.dependencies["decode-uri-component"]).toBe("0.5.0");
  expect(rootManifest.dependencies["query-string"]).toBe("^9.3.1");
  expect(rootManifest.overrides["decode-uri-component"]).toBe("0.5.0");
  expect(rootManifest.resolutions["decode-uri-component"]).toBe("0.5.0");
  // Bun 1.3.5 on Windows can race the same patched-package rename across
  // consumers. The equivalent repair now runs after linking; registering both
  // mechanisms would reintroduce that failure instead of adding protection.
  expect(rootManifest.patchedDependencies?.["query-string@7.1.3"]).toBeUndefined();
  expect(mobileManifest.patchedDependencies?.["query-string@7.1.3"]).toBeUndefined();
  expect(bunLock).not.toMatch(/^\s*"query-string@7\.1\.3"\s*:/m);
  expect(rootManifest.scripts.postinstall).toBe(
    "node apps/mobile/scripts/patch_query_string_cjs.js",
  );
  expect(mobileManifest.dependencies["decode-uri-component"]).toBe("0.5.0");
  expect(mobileManifest.dependencies["query-string"]).toBe("7.1.3");
  expect(mobileManifest.overrides["decode-uri-component"]).toBe("0.5.0");
  expect(mobileManifest.overrides["query-string"]).toBe("7.1.3");
  expect(mobileManifest.scripts.postinstall).toBe(
    "node scripts/patch_query_string_cjs.js",
  );
  expect(compatibilityPatch).toContain(
    "const decodeComponent = decodeComponentModule.default ?? decodeComponentModule;",
  );

  const decodeVersions = new Set();
  const queryStringVersions = new Set();
  for (const [path, metadata] of Object.entries(mobileLock.packages)) {
    if (
      path === "node_modules/decode-uri-component" ||
      path.endsWith("/node_modules/decode-uri-component")
    ) {
      decodeVersions.add(metadata.version);
    }
    if (
      path === "node_modules/query-string" ||
      path.endsWith("/node_modules/query-string")
    ) {
      queryStringVersions.add(metadata.version);
    }
  }
  expect([...decodeVersions]).toEqual(["0.5.0"]);
  expect([...queryStringVersions]).toEqual(["7.1.3"]);
  expect(bunLock).toContain('["decode-uri-component@0.5.0"');
  expect(bunLock).not.toMatch(/decode-uri-component@(?:0\.[0-4](?:\.|\")|0\.4\.2)/);
  expect(new Set(bunLock.match(/\["query-string@[^\"]+"/g))).toEqual(new Set([
    '["query-string@7.1.3"',
    '["query-string@9.3.1"',
  ]));

  const { hasCompatibleImport, patchAllQueryStringConsumers } = rootRequire(
    "../../apps/mobile/scripts/patch_query_string_cjs.js",
  );
  const compatibleImport = [
    "const decodeComponentModule = require('decode-uri-component');",
    "const decodeComponent = decodeComponentModule.default ?? decodeComponentModule;",
  ];
  expect(hasCompatibleImport(compatibleImport.join("\n"))).toBe(true);
  expect(hasCompatibleImport(compatibleImport.join("\r\n"))).toBe(true);
  expect(hasCompatibleImport("const decodeComponent = require('decode-uri-component');")).toBe(false);

  const compatibilityScript = readFileSync(
    "apps/mobile/scripts/patch_query_string_cjs.js", "utf8",
  );
  expect(compatibilityScript).toMatch(
    /if\s*\(require\.main\s*===\s*module\)\s*\{\s*patchAllQueryStringConsumers\(\);\s*\}/,
  );

  // Resolve the four callers independently of the repair's own directory list.
  // Hoisting may share files, but no caller (including native's nested core)
  // may silently fall back to an unpatched or wrong-version parser.
  const mobilePackage = rootRequire.resolve("../../apps/mobile/package.json");
  const mobileRequire = createRequire(mobilePackage);
  const nativeRequire = createRequire(mobileRequire.resolve("@react-navigation/native/package.json"));
  const consumerPackages = [
    mobilePackage,
    mobileRequire.resolve("@react-navigation/core/package.json"),
    nativeRequire.resolve("@react-navigation/core/package.json"),
    mobileRequire.resolve("expo-router/package.json"),
  ];
  const queryEntries = consumerPackages.map((consumerPackage) => {
    const entry = createRequire(consumerPackage).resolve("query-string");
    const queryMetadata = JSON.parse(readFileSync(join(dirname(entry), "package.json"), "utf8"));
    const decoder = createRequire(entry).resolve("decode-uri-component");
    const decoderMetadata = JSON.parse(readFileSync(join(dirname(decoder), "package.json"), "utf8"));
    expect(queryMetadata.version).toBe("7.1.3");
    expect(decoderMetadata.version).toBe("0.5.0");
    expect(decoderMetadata.type).toBe("module");
    // Assert the installed repair before invoking it: the test must not heal a
    // missing postinstall and then report that installation was already safe.
    expect(hasCompatibleImport(readFileSync(entry, "utf8"))).toBe(true);
    return entry;
  });
  const before = new Map(queryEntries.map((entry) => [entry, readFileSync(entry, "utf8")]));
  expect(new Set(patchAllQueryStringConsumers())).toEqual(new Set(consumerPackages.map(dirname)));

  // Execute both actual lifecycle entrypoints with Node, not Bun's more
  // permissive require(ESM), and prove repeated runs leave every copy unchanged.
  execFileSync("node", ["apps/mobile/scripts/patch_query_string_cjs.js"], { cwd: rootDirectory });
  execFileSync("node", ["scripts/patch_query_string_cjs.js"], { cwd: dirname(mobilePackage) });
  for (const [entry, source] of before) expect(readFileSync(entry, "utf8")).toBe(source);
  const decoded = execFileSync("node", ["--input-type=commonjs", "-e", `
    const assert = require('node:assert/strict');
    const entries = process.argv.slice(1);
    for (const entry of entries) {
      const queryString = require(entry);
      assert.equal(typeof queryString.parse, 'function');
      assert.deepEqual({ ...queryString.parse('screen=Inbox%20Today&tag=next&title=%E6%94%B6%E4%BB%B6%E7%AE%B1&plus=a%2Bb') }, {
        screen: 'Inbox Today', tag: 'next', title: '收件箱', plus: 'a+b',
      });
    }
    process.stdout.write(JSON.stringify({ checked: entries.length }));
  `, ...queryEntries], { cwd: rootDirectory, encoding: "utf8" });
  expect(JSON.parse(decoded)).toEqual({ checked: 4 });
});

test("dependency changes run the audit before merge", () => {
  const workflow = readWorkflow();
  const pullRequestBlock = workflow.match(/\n  pull_request:\n    paths:\n((?:      - .+\n)+)/)?.[1];

  expect(pullRequestBlock).toBeDefined();
  const paths = pullRequestBlock
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").replace(/^['\"]|['\"]$/g, ""))
    .sort();

  expect(paths).toEqual([...REQUIRED_PULL_REQUEST_PATHS].sort());
  expect(workflow).toContain('cron: "23 3 * * 1"');
  expect(workflow).toMatch(/\n  workflow_dispatch:\s*\n/);
});

test("every tracked npm package lock triggers and runs its own audit", () => {
  const workflow = readWorkflow();
  const pullRequestBlock = workflow.match(/\n  pull_request:\n    paths:\n((?:      - .+\n)+)/)?.[1] ?? "";
  const pullRequestPaths = pullRequestBlock
    .trim()
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").replace(/^['\"]|['\"]$/g, ""));

  expect(pullRequestPaths).toContain("**/package-lock.json");

  const auditedPrefixes = [...workflow.matchAll(
    /npm audit --prefix ([^\s]+) --audit-level=low/g,
  )].map((match) => match[1]).sort();
  expect(auditedPrefixes).toEqual(
    TRACKED_NPM_LOCKFILES.map((lockfile) => dirname(lockfile)).sort(),
  );

  expect(workflow).toContain(
    'npm audit --prefix apps/mobile --audit-level=low --json > "$mobile_audit_report"',
  );
  expect(workflow).toContain(
    'bun scripts/ci/validate-mobile-npm-audit.js "$mobile_audit_report"',
  );
});

const advisory = (id) => ({
  url: `https://github.com/advisories/${id}`,
});

const allowedMobileAuditReport = () => ({
  vulnerabilities: {
    "image-size": {
      name: "image-size",
      via: IMAGE_SIZE_ADVISORIES.map(advisory),
    },
    metro: {
      name: "metro",
      via: ["image-size", "metro-config"],
    },
    "metro-config": {
      name: "metro-config",
      via: ["metro", "image-size"],
    },
  },
});

test("mobile npm audit accepts only the exact Metro image-size advisory closure", () => {
  expect(() => validateMobileAuditReport(allowedMobileAuditReport())).not.toThrow();

  const unexpectedAdvisory = allowedMobileAuditReport();
  unexpectedAdvisory.vulnerabilities["image-size"].via.push(
    advisory("GHSA-unexpected-advisory"),
  );
  expect(() => validateMobileAuditReport(unexpectedAdvisory)).toThrow(
    /unexpected direct advisories/,
  );

  const missingAdvisory = allowedMobileAuditReport();
  missingAdvisory.vulnerabilities["image-size"].via.pop();
  expect(() => validateMobileAuditReport(missingAdvisory)).toThrow(
    /unexpected direct advisories/,
  );

  const unrelatedCycle = allowedMobileAuditReport();
  unrelatedCycle.vulnerabilities.unrelated = {
    name: "unrelated",
    via: ["unrelated-helper"],
  };
  unrelatedCycle.vulnerabilities["unrelated-helper"] = {
    name: "unrelated-helper",
    via: ["unrelated"],
  };
  expect(() => validateMobileAuditReport(unrelatedCycle)).toThrow(
    /not transitively caused by image-size/,
  );
});
